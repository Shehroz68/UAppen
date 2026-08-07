"""
Fetch UMass Athletics games from the official Sidearm RSS calendar.
Only home / Amherst-area contests are stored so they appear on the campus map.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from xml.etree import ElementTree as ET

import httpx
from sqlalchemy import text
from sqlmodel import Session

from .database import engine
from .location_mapper import get_location_info
from .models import Event

try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo  # type: ignore

LOCAL_TZ = ZoneInfo("America/New_York")
ATHLETICS_RSS = "https://umassathletics.com/calendar.ashx/calendar.rss?sport_id=0"
DAYS_AHEAD = 90

HOME_HINTS = (
    "amherst",
    "rudd field",
    "mcguirk",
    "mullins",
    "garber",
    "boyden",
    "sortino",
    "lorden",
    "curry hicks",
    "totman",
    "gladchuk",
)

# Order matters: more specific names before generic ones (Field Hockey before Hockey)
SPORT_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bfield\s*hockey\b", re.I), "Field Hockey"),
    (re.compile(r"\bhockey\b", re.I), "Hockey"),
    (re.compile(r"\bfootball\b", re.I), "Football"),
    (re.compile(r"\bwomen'?s\s+basketball\b", re.I), "Women's Basketball"),
    (re.compile(r"\bmen'?s\s+basketball\b", re.I), "Men's Basketball"),
    (re.compile(r"\bbasketball\b", re.I), "Basketball"),
    (re.compile(r"\bwomen'?s\s+soccer\b", re.I), "Women's Soccer"),
    (re.compile(r"\bmen'?s\s+soccer\b", re.I), "Men's Soccer"),
    (re.compile(r"\bsoccer\b", re.I), "Soccer"),
    (re.compile(r"\bwomen'?s\s+lacrosse\b", re.I), "Women's Lacrosse"),
    (re.compile(r"\bmen'?s\s+lacrosse\b", re.I), "Men's Lacrosse"),
    (re.compile(r"\blacrosse\b", re.I), "Lacrosse"),
    (re.compile(r"\bbaseball\b", re.I), "Baseball"),
    (re.compile(r"\bsoftball\b", re.I), "Softball"),
    (re.compile(r"\bcross\s*country\b", re.I), "Cross Country"),
    (re.compile(r"\btrack\s*(?:and|&)?\s*field\b", re.I), "Track & Field"),
    (re.compile(r"\bswimming\b", re.I), "Swimming & Diving"),
    (re.compile(r"\btennis\b", re.I), "Tennis"),
    (re.compile(r"\browing\b", re.I), "Rowing"),
]

# Sidearm sport_id fallback (from umassathletics calendar links)
SPORT_ID_LABELS = {
    "1": "Baseball",
    "2": "Men's Basketball",
    "3": "Field Hockey",
    "4": "Football",
    "5": "Men's Lacrosse",
    "6": "Men's Soccer",
    "7": "Men's Swimming & Diving",
    "8": "Men's Track & Field",
    "9": "Softball",
    "10": "Men's Soccer",
    "11": "Women's Basketball",
    "12": "Women's Cross Country",
    "13": "Women's Lacrosse",
    "14": "Women's Soccer",
    "15": "Women's Swimming & Diving",
    "16": "Tennis",
    "17": "Women's Track & Field",
    "18": "Hockey",
    "19": "Rowing",
    "20": "Women's Soccer",
    "21": "Men's Cross Country",
}


def _extract_sport(title: str, description: str, link: str) -> str:
    """Return a friendly sport label like Football / Hockey."""
    blob = f"{title} {description}"
    for pattern, label in SPORT_PATTERNS:
        if pattern.search(blob):
            return label

    match = re.search(r"[?&]sport_id=(\d+)", link or "")
    if match:
        return SPORT_ID_LABELS.get(match.group(1), "Athletics")
    return "Athletics"



def _local_text(item: ET.Element, *names: str) -> str | None:
    for name in names:
        for child in item:
            tag = child.tag.split("}")[-1]
            if tag.lower() == name.lower() and child.text and child.text.strip():
                return child.text.strip()
    return None


def _clean_game_title(title: str, opponent: str | None) -> str:
    """Turn RSS titles into short map-friendly names."""
    cleaned = re.sub(r"^\d{1,2}/\d{1,2}\s+\d{1,2}:\d{2}\s*(AM|PM)\s+", "", title or "", flags=re.I)
    cleaned = cleaned.replace("Massachusetts, University of", "UMass")
    cleaned = cleaned.replace("University of Massachusetts", "UMass")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if opponent and opponent.lower() not in cleaned.lower():
        return f"{cleaned} vs {opponent}"
    return cleaned or (f"UMass vs {opponent}" if opponent else "UMass Athletics")


def _is_home_or_campus(location: str) -> bool:
    loc = (location or "").lower()
    return any(hint in loc for hint in HOME_HINTS)


def _parse_local_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    # Sidearm: 2026-08-08T13:00:00.0000000 (no TZ) — treat as Eastern
    cleaned = value.split(".")[0]
    try:
        dt = datetime.fromisoformat(cleaned)
        return dt.replace(tzinfo=LOCAL_TZ)
    except ValueError:
        return None


def _extract_venue(location: str) -> str:
    """Pick a map-friendly venue from Sidearm location strings."""
    parts = [p.strip() for p in (location or "").split(",") if p.strip()]
    while parts and re.fullmatch(r"(mass\.?|ma|massachusetts)", parts[-1], flags=re.I):
        parts.pop()
    if not parts:
        return location or "Unknown"
    # Prefer the most specific remaining piece (usually the venue)
    return parts[-1]


def fetch_athletics_events() -> list[dict]:
    """Download and normalize home athletics contests within DAYS_AHEAD."""
    headers = {"User-Agent": "UAppen/1.0 (campus events app)"}
    with httpx.Client(timeout=45, follow_redirects=True, headers=headers) as client:
        response = client.get(ATHLETICS_RSS)
        response.raise_for_status()
        root = ET.fromstring(response.content)

    today = datetime.now(LOCAL_TZ).date()
    end_date = today + timedelta(days=DAYS_AHEAD)
    events: list[dict] = []

    for item in root.findall(".//item"):
        location = _local_text(item, "location") or "Unknown"
        if not _is_home_or_campus(location):
            continue

        start_dt = _parse_local_dt(_local_text(item, "localstartdate"))
        end_dt = _parse_local_dt(_local_text(item, "localenddate"))
        if not start_dt or start_dt.date() < today or start_dt.date() >= end_date:
            continue

        game_id = _local_text(item, "gameid")
        if not game_id or not game_id.isdigit():
            continue

        opponent = _local_text(item, "opponent")
        raw_title = _local_text(item, "title") or ""
        title = _clean_game_title(raw_title, opponent)
        description = (_local_text(item, "description") or title).replace("\\n", " ").strip()
        link = _local_text(item, "link") or f"https://umassathletics.com/calendar"
        venue = _extract_venue(location)
        sport = _extract_sport(raw_title, description, link)

        events.append(
            {
                # Negative IDs keep athletics distinct from Engage's large positive IDs
                "event_id": -int(game_id),
                "name": title,
                "location": venue,
                "start_dt": start_dt,
                "end_dt": end_dt,
                "organization": "UMass Athletics",
                "description": description,
                "link": link,
                # Keep Athletics prefix so the map filter still matches
                "category": f"Athletics - {sport}",
            }
        )

    return events


def save_athletics_events(events: list[dict]) -> int:
    """Persist athletics events; update sport labels on existing rows."""
    added = 0
    updated = 0
    with Session(engine) as session:
        for e in events:
            existing = session.execute(
                text("SELECT id FROM event WHERE event_id = :eid LIMIT 1"),
                {"eid": int(e["event_id"])},
            ).first()

            location_info = get_location_info(e["location"])
            start_dt: datetime = e["start_dt"]
            end_dt = e.get("end_dt")

            if existing:
                session.execute(
                    text(
                        "UPDATE event SET name = :name, location = :location, "
                        "normalized_location = :normalized_location, latitude = :latitude, "
                        "longitude = :longitude, date = :date, start_time = :start_time, "
                        "end_time = :end_time, organization = :organization, "
                        "description = :description, link = :link, category = :category "
                        "WHERE event_id = :event_id"
                    ),
                    {
                        "name": e["name"],
                        "location": e["location"],
                        "normalized_location": location_info["normalized"],
                        "latitude": location_info["latitude"],
                        "longitude": location_info["longitude"],
                        "date": start_dt.date().isoformat(),
                        "start_time": start_dt.time().strftime("%H:%M:%S"),
                        "end_time": end_dt.time().strftime("%H:%M:%S") if end_dt else None,
                        "organization": e.get("organization"),
                        "description": e.get("description"),
                        "link": e.get("link"),
                        "category": e.get("category") or "Athletics",
                        "event_id": int(e["event_id"]),
                    },
                )
                updated += 1
                continue

            session.add(
                Event(
                    event_id=int(e["event_id"]),
                    name=e["name"],
                    location=e["location"],
                    normalized_location=location_info["normalized"],
                    latitude=location_info["latitude"],
                    longitude=location_info["longitude"],
                    date=start_dt.date(),
                    start_time=start_dt.time(),
                    end_time=end_dt.time() if end_dt else None,
                    organization=e.get("organization"),
                    description=e.get("description"),
                    link=e.get("link"),
                    category=e.get("category") or "Athletics",
                )
            )
            added += 1
        session.commit()
    print(f"Added {added} athletics events; updated {updated} sport labels.")
    return added


def refresh_athletics_events() -> int:
    print("Refreshing UMass Athletics schedule...")
    events = fetch_athletics_events()
    print(f"Found {len(events)} home athletics events in window.")
    return save_athletics_events(events)


def remap_all_event_locations() -> int:
    """Re-apply location mapper to every stored event (after coord updates)."""
    updated = 0
    with Session(engine) as session:
        rows = session.execute(text("SELECT id, location FROM event")).all()
        for event_pk, raw_location in rows:
            info = get_location_info(raw_location or "Unknown")
            session.execute(
                text(
                    "UPDATE event SET normalized_location = :n, latitude = :lat, longitude = :lng "
                    "WHERE id = :id"
                ),
                {
                    "n": info["normalized"],
                    "lat": info["latitude"],
                    "lng": info["longitude"],
                    "id": event_pk,
                },
            )
            updated += 1
        session.commit()
    print(f"Remapped locations for {updated} events.")
    return updated
