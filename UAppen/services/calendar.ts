/**
 * Add campus events to the device calendar and open the Calendar app quickly.
 */

import * as Calendar from 'expo-calendar';
import * as IntentLauncher from 'expo-intent-launcher';
import { Alert, Linking, Platform } from 'react-native';
import type { Event } from '@/services/api';

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function parseEventDateTime(event: Event, which: 'start' | 'end'): Date | null {
  const timeRaw = which === 'end' ? event.end_time || event.start_time : event.start_time;
  if (!event.date || !timeRaw) return null;

  const dateMatch = event.date.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  const timeMatch = timeRaw.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);

  if (!dateMatch || !timeMatch) {
    const fallback = new Date(`${event.date} ${timeRaw}`);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const month = MONTHS[dateMatch[1].toLowerCase()];
  if (month === undefined) return null;

  const day = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);
  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] || 0);
  const ampm = (timeMatch[4] || '').toUpperCase();

  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  const parsed = new Date(year, month, day, hour, minute, second);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getEventBounds(event: Event): { start: Date; end: Date } | null {
  const start = parseEventDateTime(event, 'start');
  if (!start) return null;
  const end = parseEventDateTime(event, 'end') || new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

function eventDetails(event: Event) {
  return {
    title: event.name || 'UAppen Event',
    location: event.location || event.normalized_location || 'UMass Amherst',
    description: [event.description, event.link].filter(Boolean).join('\n\n').slice(0, 800),
  };
}

/**
 * Build an Android intent URI with properly typed extras.
 * `l.` = long (required for beginTime/endTime), `S.` = string.
 * IntentLauncher often sends numbers as doubles, which calendar apps ignore.
 */
function buildAndroidInsertIntentUri(event: Event, start: Date, end: Date): string {
  const details = eventDetails(event);
  const encode = (value: string) =>
    encodeURIComponent(value)
      .replace(/'/g, '%27')
      .replace(/-/g, '%2D');

  return (
    `intent://com.android.calendar/events#Intent;` +
    `action=android.intent.action.INSERT;` +
    `type=vnd.android.cursor.item/event;` +
    `S.title=${encode(details.title)};` +
    `S.eventLocation=${encode(details.location)};` +
    `S.description=${encode(details.description)};` +
    `l.beginTime=${start.getTime()};` +
    `l.endTime=${end.getTime()};` +
    `B.allDay=false;` +
    `end`
  );
}

async function openAndroidCreateEvent(event: Event, start: Date, end: Date): Promise<void> {
  const details = eventDetails(event);
  const beginTime = start.getTime();
  const endTime = end.getTime();

  // 1) Intent URI with long-typed times (most reliable for prefilled date/time)
  try {
    const uri = buildAndroidInsertIntentUri(event, start, end);
    await Linking.openURL(uri);
    return;
  } catch (error) {
    console.warn('Intent URI insert failed:', error);
  }

  // 2) IntentLauncher fallback
  await IntentLauncher.startActivityAsync('android.intent.action.INSERT', {
    data: 'content://com.android.calendar/events',
    type: 'vnd.android.cursor.item/event',
    extra: {
      title: details.title,
      beginTime,
      endTime,
      eventLocation: details.location,
      description: details.description,
      allDay: false,
      // Some OEMs also read these keys
      'beginTime': beginTime,
      'endTime': endTime,
    },
  });
}

async function openCalendarAt(date: Date): Promise<void> {
  if (Platform.OS === 'ios') {
    await Linking.openURL(`calshow:${Math.floor(date.getTime() / 1000)}`);
    return;
  }
  await Linking.openURL(`content://com.android.calendar/time/${date.getTime()}`);
}

/**
 * Prefer a local on-device calendar so events show up immediately
 * (Google calendars often lag until sync finishes).
 */
async function getFastCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter((cal) => cal.allowsModifications);
  if (writable.length === 0) return null;

  const score = (cal: Calendar.Calendar) => {
    const blob = `${cal.title} ${cal.source?.name || ''} ${cal.source?.type || ''}`.toLowerCase();
    if (blob.includes('local') || cal.source?.isLocalAccount) return 100;
    if (blob.includes('phone') || blob.includes('device')) return 90;
    if (blob.includes('samsung')) return 70;
    if (cal.isPrimary) return 40;
    if (blob.includes('google') || blob.includes('outlook') || blob.includes('icloud')) return 10;
    return 30;
  };

  return [...writable].sort((a, b) => score(b) - score(a))[0].id;
}

async function createInLocalCalendar(event: Event, start: Date, end: Date): Promise<boolean> {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) return false;

  const calendarId = await getFastCalendarId();
  if (!calendarId) return false;

  const details = eventDetails(event);
  await Calendar.createEventAsync(calendarId, {
    title: details.title,
    location: details.location,
    notes: details.description,
    startDate: start,
    endDate: end,
    timeZone: 'America/New_York',
    alarms: [{ relativeOffset: -30 }],
  });
  return true;
}

export async function exportEventToCalendar(event: Event): Promise<void> {
  const bounds = getEventBounds(event);
  if (!bounds) {
    Alert.alert(
      'Calendar Error',
      `Could not read this event's date/time.\n\nDate: ${event.date}\nTime: ${event.start_time}`
    );
    return;
  }

  const { start, end } = bounds;

  // Most reliable for correct dates: write event, then open calendar on that day
  try {
    const created = await createInLocalCalendar(event, start, end);
    if (created) {
      await openCalendarAt(start);
      return;
    }
  } catch (error) {
    console.warn('Local calendar create failed:', error);
  }

  // Fallback: open create screen with date/time prefilled via typed intent extras
  if (Platform.OS === 'android') {
    try {
      await openAndroidCreateEvent(event, start, end);
      return;
    } catch (error) {
      console.warn('Android create-event screen failed:', error);
    }
  }

  Alert.alert(
    'Calendar Permission Needed',
    'Allow calendar access when prompted, then tap Calendar again so the date can be filled in automatically.'
  );
}
