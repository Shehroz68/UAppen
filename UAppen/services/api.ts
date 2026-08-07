/**
 * UAppen API Service
 * Handles all communication with the FastAPI backend
 */

import axios from 'axios';
import { Platform } from 'react-native';

const getApiUrl = () => {
  if (!__DEV__) {
    return 'https://your-production-api.com';
  }

  // Development: use your computer's LAN IP for physical devices / Expo Go
  const LOCAL_IP = '192.168.4.118';
  return `http://${LOCAL_IP}:8000`;
};

const API_BASE_URL = getApiUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Event {
  id: number;
  name: string;
  location: string;
  normalized_location: string;
  latitude: number;
  longitude: number;
  date: string;
  start_time: string;
  end_time: string | null;
  organization: string | null;
  description: string | null;
  link: string;
  category: string;
}

export interface EventLocation {
  normalized_location: string;
  latitude: number;
  longitude: number;
  event_count: number;
  events: Event[];
}

export const fetchEvents = async (): Promise<Event[]> => {
  const response = await api.get<Event[]>('/events');
  return response.data;
};

export const groupEventsByLocation = (events: Event[]): EventLocation[] => {
  const locationMap = new Map<string, EventLocation>();

  events.forEach((event) => {
    const key = `${event.latitude},${event.longitude}`;

    if (locationMap.has(key)) {
      const location = locationMap.get(key)!;
      location.events.push(event);
      location.event_count = location.events.length;
    } else {
      locationMap.set(key, {
        normalized_location: event.normalized_location,
        latitude: event.latitude,
        longitude: event.longitude,
        event_count: 1,
        events: [event],
      });
    }
  });

  return Array.from(locationMap.values());
};

export default api;
