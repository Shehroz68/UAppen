import httpx
from datetime import datetime, timedelta
import pytz

BASE_URL = "https://umassamherst.campuslabs.com/engage/api/discovery/event/search"
TZ = pytz.timezone("America/New_York")

def fetch_events():
    today = datetime.now(TZ).date()
    tomorrow = today + timedelta(days=1)

    params = {
        "endsAfter": today.isoformat(),
        "startsBefore": (tomorrow + timedelta(days=1)).isoformat(),
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
