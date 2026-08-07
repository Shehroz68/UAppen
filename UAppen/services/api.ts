/**
 * UAppen API Service
 * Handles all communication with the FastAPI backend
 */

import axios from 'axios';
import { Platform } from 'react-native';

// Get the correct API URL based on platform
const getApiUrl = () => {
  if (!__DEV__) {
    return 'https://your-production-api.com'; // Production
  }

  // Development URLs
  // Using local IP address for better reliability across all platforms
  const LOCAL_IP = '192.168.4.118'; // Your computer's IP
  
  // Use local IP for both iOS and Android for simplicity and reliability
  // This works for both simulators and physical devices
  return `http://${LOCAL_IP}:8000`;
  
  // Note: If using Android emulator and local IP doesn't work, 
  // you can try 10.0.2.2 specifically for Android:
  // if (Platform.OS === 'android') {
  //   return 'http://10.0.2.2:8000';
  // }
};

const API_BASE_URL = getApiUrl();

// Log the API URL for debugging
console.log(`📡 UAppen API connecting to: ${API_BASE_URL} (Platform: ${Platform.OS})`);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Event interface matching backend response
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

// Location with event count for map markers
export interface EventLocation {
  normalized_location: string;
  latitude: number;
  longitude: number;
  event_count: number;
  events: Event[];
}

/**
 * Fetch all events from backend
 */
export const fetchEvents = async (): Promise<Event[]> => {
  try {
    console.log(`🔄 Fetching events from: ${API_BASE_URL}/events`);
    const response = await api.get<Event[]>('/events');
    console.log(`✅ Successfully fetched ${response.data.length} events`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching events:', {
      message: error.message,
      code: error.code,
      url: `${API_BASE_URL}/events`,
      platform: Platform.OS,
    });
    throw error;
  }
};

/**
 * Fetch events by category
 */
export const fetchEventsByCategory = async (category: string): Promise<Event[]> => {
  try {
    const response = await api.get<Event[]>(`/events/category/${category}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching events for category ${category}:`, error);
    throw error;
  }
};

/**
 * Group events by location for map markers
 */
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

/**
 * Check backend health
 */
export const checkHealth = async (): Promise<{ status: string; events_in_db: number }> => {
  try {
    console.log(`🏥 Checking backend health at: ${API_BASE_URL}/`);
    const response = await api.get('/');
    console.log(`✅ Backend is healthy:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Backend health check failed:', {
      message: error.message,
      code: error.code,
      url: `${API_BASE_URL}/`,
      platform: Platform.OS,
    });
    throw error;
  }
};

/**
 * Test backend connectivity with detailed diagnostics
 */
export const testConnection = async (): Promise<boolean> => {
  console.log('🔍 Testing backend connectivity...');
  console.log(`   Platform: ${Platform.OS}`);
  console.log(`   API URL: ${API_BASE_URL}`);
  console.log(`   Timeout: 10000ms`);
  
  try {
    const startTime = Date.now();
    await checkHealth();
    const duration = Date.now() - startTime;
    console.log(`✅ Connection successful! (${duration}ms)`);
    return true;
  } catch (error: any) {
    console.error('❌ Connection failed!');
    if (error.code === 'ECONNREFUSED') {
      console.error('   → Server refused connection. Is the backend running?');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error('   → Connection timed out. Check your network connection.');
    } else if (error.message?.includes('Network Error')) {
      console.error('   → Network error. Possible issues:');
      if (Platform.OS === 'android') {
        console.error('      • For Android emulator: Backend should be at http://10.0.2.2:8000');
        console.error('      • For physical device: Use your computer\'s IP (http://172.31.110.151:8000)');
      } else {
        console.error('      • For iOS simulator: Backend should be at http://localhost:8000');
        console.error('      • For physical device: Use your computer\'s IP (http://172.31.110.151:8000)');
      }
      console.error('      • Make sure backend is running with --host 0.0.0.0');
      console.error('      • Check firewall settings');
    }
    return false;
  }
};

export default api;

