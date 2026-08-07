/**
 * Persist "I'm Going" / saved events locally on device.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Event } from '@/services/api';

const STORAGE_KEY = 'uappen_saved_events_v1';

export async function getSavedEvents(): Promise<Event[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load saved events:', error);
    return [];
  }
}

export async function saveEvent(event: Event): Promise<Event[]> {
  const saved = await getSavedEvents();
  if (saved.some((e) => e.id === event.id)) {
    return saved;
  }
  const next = [event, ...saved];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function unsaveEvent(eventId: number): Promise<Event[]> {
  const saved = await getSavedEvents();
  const next = saved.filter((e) => e.id !== eventId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function toggleSavedEvent(event: Event): Promise<{ saved: boolean; events: Event[] }> {
  const saved = await getSavedEvents();
  const currentlySaved = saved.some((e) => e.id === event.id);
  if (currentlySaved) {
    const events = await unsaveEvent(event.id);
    return { saved: false, events };
  }
  const events = await saveEvent(event);
  return { saved: true, events };
}
