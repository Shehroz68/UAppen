from fastapi import FastAPI, Depends
from sqlmodel import Session, select
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db, get_session
from .models import Event
from .scheduler import refresh_events
from apscheduler.schedulers.background import BackgroundScheduler

app = FastAPI(title="UMass Campus Events API")

# --- Allow frontend (React/Vite/etc.) to call this backend ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # change to ["http://localhost:5173"] if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Startup: initialize DB and refresh events every 2 hours ---
@app.on_event("startup")
def on_startup():
    init_db()
    refresh_events()  # initial fetch from Engage API
    scheduler = BackgroundScheduler()
    scheduler.add_job(refresh_events, "interval", hours=2)
    scheduler.start()

# --- Root route (health check) ---
@app.get("/")
def root(session: Session = Depends(get_session)):
    count = len(session.exec(select(Event)).all())
    return {"status": "ok", "events_in_db": count}

# --- Return all events ---
@app.get("/events")
def get_events(session: Session = Depends(get_session)):
    events = session.exec(select(Event)).all()
    formatted = []
    for e in events:
        formatted.append({
            "id": e.id,
            "name": e.name,
            "location": e.location,
            "normalized_location": e.normalized_location,
            "latitude": e.latitude,
            "longitude": e.longitude,
            "date": e.date.strftime("%A, %B %d, %Y") if e.date else None,
            "start_time": e.start_time.strftime("%I:%M %p") if e.start_time else None,
            "end_time": e.end_time.strftime("%I:%M %p") if e.end_time else None,
            "organization": e.organization,
            "description": e.description,
            "link": e.link,
            "category": e.category,
        })
    return formatted

# --- Filter events by category ---
@app.get("/events/category/{cat}")
def get_events_by_category(cat: str, session: Session = Depends(get_session)):
    statement = select(Event).where(Event.category.contains(cat))
    events = session.exec(statement).all()
    formatted = []
    for e in events:
        formatted.append({
            "id": e.id,
            "name": e.name,
            "location": e.location,
            "normalized_location": e.normalized_location,
            "latitude": e.latitude,
            "longitude": e.longitude,
            "date": e.date.strftime("%A, %B %d, %Y") if e.date else None,
            "start_time": e.start_time.strftime("%I:%M %p") if e.start_time else None,
            "end_time": e.end_time.strftime("%I:%M %p") if e.end_time else None,
            "organization": e.organization,
            "description": e.description,
            "link": e.link,
            "category": e.category,
        })
    return formatted
