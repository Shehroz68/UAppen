import httpx
import html
import re
from datetime import datetime, timedelta
from sqlmodel import Session
from sqlalchemy import text
from .models import Event
from .database import engine
from .location_mapper import get_location_info

# ✅ Timezone compatibility for Python 3.8 and 3.9+
try:
    from zoneinfo import ZoneInfo  # Python 3.9+
except ImportError:
    from backports.zoneinfo import ZoneInfo  # Python 3.8 fallback

LOCAL_TZ = ZoneInfo("America/New_York")

# Base URL for UMass Engage API
BASE_URL = "https://umassamherst.campuslabs.com/engage/api/discovery/event/search"

# How many days ahead (including today) to pull events for
DAYS_AHEAD = 90


# -------------------- Utility Helpers --------------------

def clean_html(raw_html: str) -> str:
    """Decode HTML entities and remove tags for clean text."""
    if not raw_html:
        return None
    text = html.unescape(raw_html)               # convert \u003C → <
    text = re.sub(r"<[^>]+>", "", text)          # remove HTML tags
    text = re.sub(r"\s+", " ", text).strip()     # collapse whitespace
    return text


def parse_time(dt_str):
    """Convert Engage ISO datetime string to Python datetime."""
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception as e:
        print(f"Warning: Could not parse datetime: {dt_str} ({e})")
        return None


def extract_category(e: dict) -> str:
    """Extract readable category name(s) from Engage API event."""
    cats = e.get("categoryNames")
    if cats and isinstance(cats, list):
        return ", ".join(cats)
    theme = e.get("theme")
    if isinstance(theme, dict):
        return theme.get("name", "Uncategorized")
    return "Uncategorized"


# -------------------- Core Logic --------------------

def fetch_events():
    """Fetch events from UMass Engage API."""
    today = datetime.now(LOCAL_TZ).date()
    end_date = today + timedelta(days=DAYS_AHEAD)

    params = {
        "endsAfter": today.isoformat(),
        "startsBefore": end_date.isoformat(),
        "status": "Approved",
        "take": 50,
        "skip": 0
    }

    all_events = []
    with httpx.Client() as client:
        while True:
            r = client.get(BASE_URL, params=params)
            r.raise_for_status()
            data = r.json()
            events = data.get("value", [])
            if not events:
                break
            all_events.extend(events)
            params["skip"] += 50
    return all_events


def save_events(events):
    """Save fetched events into the local database."""
    added = 0
    with Session(engine) as session:
        today = datetime.now(LOCAL_TZ).date()
        valid_dates = {
            today + timedelta(days=offset)
            for offset in range(DAYS_AHEAD)
        }

        for e in events:
            start_dt = parse_time(e.get("startsOn"))
            end_dt = parse_time(e.get("endsOn"))

            if not start_dt:
                continue

            # Convert UTC → local (Amherst)
            start_dt = start_dt.astimezone(LOCAL_TZ)
            end_dt = end_dt.astimezone(LOCAL_TZ) if end_dt else None

            # Extract only date portion
            event_date = start_dt.date()
            if event_date not in valid_dates:
                continue

            # Prevent duplicates
            exists = session.exec(
                text(f"SELECT 1 FROM event WHERE event_id={e['id']} LIMIT 1")
            ).first()
            if exists:
                continue

            # Get location and coordinates
            raw_location = e.get("location") or "Unknown"
            location_info = get_location_info(raw_location)
            
            event = Event(
                event_id=int(e["id"]),
                name=e.get("name", "Untitled Event"),
                location=raw_location,
                normalized_location=location_info['normalized'],
                latitude=location_info['latitude'],
                longitude=location_info['longitude'],
                date=event_date,
                start_time=start_dt.time() if start_dt else None,
                end_time=end_dt.time() if end_dt else None,
                organization=e.get("organizationName"),
                description=clean_html(e.get("description")),
                link=f"https://umassamherst.campuslabs.com/engage/event/{e['id']}",
                category=extract_category(e),
            )

            session.add(event)
            added += 1

        session.commit()

    print(f"Added {added} new events to DB.")
    return added


def refresh_events():
    """Fetch latest UMass Engage + Athletics events and store them."""
    from .athletics import refresh_athletics_events, remap_all_event_locations

    print("Refreshing events...")
    new_events = fetch_events()
    added = save_events(new_events)
    athletics_added = refresh_athletics_events()
    remap_all_event_locations()
    print(f"Refreshed. Added {added} Engage events and {athletics_added} athletics events.")
    return added + athletics_added
