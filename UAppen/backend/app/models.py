from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import date, time

class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int
    name: str
    location: str
    normalized_location: Optional[str] = None  # Cleaned building name
    latitude: Optional[float] = None           # Coordinates for map
    longitude: Optional[float] = None          # Coordinates for map
    date: date                      # 🗓 Only the calendar date (e.g., 2025-11-09)
    start_time: time                # 🕘 Only the time part (e.g., 09:00:00)
    end_time: Optional[time] = None # 🕕 Optional if event has no end time
    organization: Optional[str] = None
    description: Optional[str] = None
    link: Optional[str] = None
    category: Optional[str] = None
