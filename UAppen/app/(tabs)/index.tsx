import { useFocusEffect } from '@react-navigation/native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Event, EventLocation, fetchEvents, groupEventsByLocation } from '@/services/api';
import { exportEventToCalendar } from '@/services/calendar';
import { filterEventsByCategories, getSportLabel, mapToMainCategory } from '@/services/categoryMapping';
import { getSavedEvents, toggleSavedEvent } from '@/services/savedEvents';
import { useTheme } from '@/contexts/ThemeContext';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Dimensions, Linking, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const SCREEN_HEIGHT = Dimensions.get('screen').height;

const UMASS_REGION = {
  latitude: 42.390722,
  longitude: -72.528181,
  latitudeDelta: 0.008,
  longitudeDelta: 0.010,
};

export default function HomeScreen() {
  const { theme: appTheme, toggleTheme: toggleAppTheme, colors } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const appState = useRef(AppState.currentState);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [eventLocations, setEventLocations] = useState<EventLocation[]>([]);
  const allEventsRef = useRef<Event[]>([]);
  const selectedThemesRef = useRef<string[]>([]);
  const [markerKey, setMarkerKey] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<EventLocation | null>(null);
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const [savedEventIds, setSavedEventIds] = useState<Set<number>>(new Set());

  const eventCategories = [
    'Arts and Music',
    'Athletics',
    'Service',
    'Cultural',
    'Fundraising',
    'Group Business',
    'Social',
    'Spirituality',
    'Learning',
    'Other',
  ];

  // Map style based on theme
  const customMapStyle = appTheme === 'light' ? [
    {
      elementType: 'geometry',
      stylers: [{ color: '#eeeeee' }], // Lighter base
    },
    {
      elementType: 'labels.icon',
      stylers: [{ visibility: 'on' }],
    },
    {
      elementType: 'labels.text.fill',
      stylers: [{ color: '#616161' }],
    },
    {
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#ffffff' }],
    },
    {
      featureType: 'administrative',
      elementType: 'geometry',
      stylers: [{ color: '#d0d0d0' }],
    },
    {
      featureType: 'administrative.land_parcel',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#5a5a5a' }],
    },
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [{ color: '#eeeeee' }], // Match background
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#757575' }],
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#e8f5e9' }], // Very light green for parks
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#6b6b6b' }],
    },
    {
      featureType: 'poi.business',
      elementType: 'geometry',
      stylers: [{ color: '#eeeeee' }],
    },
    {
      featureType: 'poi.school',
      elementType: 'geometry',
      stylers: [{ color: '#eeeeee' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry.fill',
      stylers: [{ color: '#ffffff' }],
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#5a5a5a' }],
    },
    {
      featureType: 'road.arterial',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }],
    },
    {
      featureType: 'road.highway.controlled_access',
      elementType: 'geometry',
      stylers: [{ color: '#f5f5f5' }],
    },
    {
      featureType: 'road.local',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9e9e9e' }],
    },
    {
      featureType: 'transit',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#757575' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#7CB9E8' }], // Light blue for ponds/lakes
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#4A7C9E' }], // Darker blue for text
    },
  ] : [
    // Dark theme map style
    {
      elementType: 'geometry',
      stylers: [{ color: '#2A3442' }], // Dark grey base
    },
    {
      elementType: 'labels.icon',
      stylers: [{ visibility: 'on' }],
    },
    {
      elementType: 'labels.text.fill',
      stylers: [{ color: '#B0B0B0' }], // Light grey text
    },
    {
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#1A1F2E' }], // Darker stroke
    },
    {
      featureType: 'administrative',
      elementType: 'geometry',
      stylers: [{ color: '#4A5568' }],
    },
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [{ color: '#323F4F' }],
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#2D4A3E' }], // Dark green for parks
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#3A4556' }],
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9CA3AF' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#4A5568' }],
    },
    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ color: '#3A4556' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#1E3A5F' }], // Dark blue for water
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#6B8CAE' }],
    },
  ];

  // Handle closing modal with zoom out animation
  const handleCloseModal = () => {
    // Zoom back out to show all markers
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...UMASS_REGION,
      }, 500);
    }
    
    // Close modal
    setSelectedLocation(null);
  };

  // Get user's current location
  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show directions');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Unable to get your location');
    }
  };

  // Load events from backend
  const loadEvents = async () => {
    try {
      const fetchedEvents = await fetchEvents();
      allEventsRef.current = fetchedEvents;
      const grouped = groupEventsByLocation(fetchedEvents);
      setEventLocations(grouped);
      setTimeout(() => centerOnCampus(), 100);
    } catch (error) {
      console.error('Failed to load events:', error);
      Alert.alert('Error', 'Unable to load events. Make sure the backend is running on http://localhost:8000');
    }
  };

  const loadSavedIds = async () => {
    const saved = await getSavedEvents();
    setSavedEventIds(new Set(saved.map((e) => e.id)));
  };

  const handleToggleGoing = async (event: Event) => {
    try {
      const result = await toggleSavedEvent(event);
      setSavedEventIds(new Set(result.events.map((e) => e.id)));
    } catch (error) {
      console.error('Failed to toggle saved event:', error);
      Alert.alert('Error', 'Unable to update Going status');
    }
  };

  const centerOnCampus = () => {
    mapRef.current?.animateToRegion(UMASS_REGION, 500);
  };

  const goToMyLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show your position');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(coords);
      mapRef.current?.animateToRegion({
        ...coords,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 500);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Unable to get your location');
    }
  };

  // Initial location fetch (for directions only — do not move the map)
  useEffect(() => {
    getCurrentLocation();
    loadEvents(); // Load events from backend
    loadSavedIds();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSavedIds();
    }, [])
  );

  // Keep selectedThemesRef in sync with selectedThemes state
  useEffect(() => {
    selectedThemesRef.current = selectedThemes;
  }, [selectedThemes]);

  // Refresh location when app returns (keep map on campus / current view)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        await getCurrentLocation();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle POI (Point of Interest) clicks - like McDonald's, libraries, etc.
  const handlePoiClick = (event: any) => {
    const { placeId, name, coordinate } = event.nativeEvent;
    
    if (placeId) {
      // Stop event propagation to prevent triggering map press
      event.stopPropagation && event.stopPropagation();
      
      // Open Google Maps directions to this place using place_id
      const placeUrl = `https://www.google.com/maps/dir/?api=1&destination_place_id=${placeId}&destination=${encodeURIComponent(name || 'Destination')}&dir_action=navigate`;
      
      Linking.openURL(placeUrl).catch((error) => {
        console.error('Error opening place directions:', error);
        // Fallback to coordinate-based directions if place_id fails
        if (currentLocation && coordinate) {
          openDirections(currentLocation, coordinate);
        }
      });
    }
  };

  // Handle map press - only open directions on deliberate tap, not when panning
  const handleMapPress = (event: any) => {
    // Ignore taps if the user was just moving the map
    if (isMapMoving) {
      setIsMapMoving(false);
      return;
    }

    const { latitude, longitude } = event.nativeEvent.coordinate;

    // Open directions immediately if we have current location
    if (currentLocation) {
      // Use setTimeout to ensure the press event completes before opening URL
      setTimeout(() => {
        openDirections(currentLocation, { latitude, longitude });
      }, 100);
    } else {
      // Quick alert if no location
      Alert.alert('Location Not Found', 'Unable to get your location. Enable location services and try again.');
    }
  };

  // Open UMass events page - "More Events" button
  const openEventsPage = () => {
    const eventsUrl = 'https://umassamherst.campuslabs.com/engage/events';
    Linking.openURL(eventsUrl).catch((error) => {
      console.error('Error opening events page:', error);
      Alert.alert('Error', 'Unable to open events page');
    });
  };

  // Handle menu button press
  const handleMenuPress = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Toggle theme selection
  const toggleTheme = (theme: string) => {
    setSelectedThemes(prev => {
      const updated = prev.includes(theme) 
        ? prev.filter(t => t !== theme)
        : [...prev, theme];
      // Update ref to keep it in sync
      selectedThemesRef.current = updated;
      return updated;
    });
  };

  // Apply selected themes
  const applyThemes = () => {
    // Close the menu
    setIsMenuOpen(false);
    
    // Use ref to ensure we always have access to all events, even if state is stale
    const allEvents = allEventsRef.current;
    
    // Use ref to get the latest selected themes (more reliable than state)
    // The ref is kept in sync with state via useEffect, so it's always up to date
    const currentThemes = selectedThemesRef.current;
    
    console.log(`🎯 Applying filters - Selected themes: [${currentThemes.join(', ')}], All events: ${allEvents.length}`);
    
    // Filter events based on selected categories
    let filteredEvents: Event[];
    if (currentThemes.length > 0) {
      // Filter events by selected categories
      filteredEvents = filterEventsByCategories(allEvents, currentThemes) as Event[];
      console.log(`🔍 Filtered to ${filteredEvents.length} events from ${allEvents.length} total events`);
    } else {
      // Show all events if no categories selected - use all events from ref/state
      filteredEvents = allEvents; // Use all events directly
      console.log(`📋 Showing all ${filteredEvents.length} events (no filter applied)`);
    }
    
    // Group filtered events by location and update map markers
    const grouped = groupEventsByLocation(filteredEvents);
    console.log(`📍 Grouped ${filteredEvents.length} events into ${grouped.length} locations`);
    
    // Create a new array reference to ensure React detects the change
    setEventLocations([...grouped]);
    
    // Reset tracksViewChanges to ensure markers re-render properly
    setTracksViewChanges(true);
    
    // Force marker re-render by updating the key
    setMarkerKey(prev => {
      const newKey = prev + 1;
      console.log(`📍 Updated map with ${grouped.length} location markers (key: ${newKey})`);
      return newKey;
    });
    
    // Show confirmation
    Alert.alert(
      'Filters Applied', 
      currentThemes.length > 0 
        ? `Showing ${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} in: ${currentThemes.join(', ')}`
        : `Showing all ${filteredEvents.length} events`
    );
  };

  // Handle help button press - open Instagram
  const handleHelpPress = () => {
    const instagramUrl = 'https://www.instagram.com/uappenings?igsh=MW5jYWYzbTg0MXRseQ==';
    Linking.openURL(instagramUrl).catch((error) => {
      console.error('Error opening Instagram:', error);
      Alert.alert('Error', 'Unable to open Instagram. Please try again.');
    });
  };

  // Map normalized location names to proper Google Maps-friendly names
  const getProperBuildingName = (normalizedName: string): string => {
    const buildingNameMap: { [key: string]: string } = {
      'herter hall': 'Herter Hall, UMass Amherst, Amherst, MA',
      'campus center': 'Murray D. Lincoln Campus Center, UMass Amherst, Amherst, MA',
      'student union': 'Student Union, UMass Amherst, Amherst, MA',
      'student union ballroom': 'Student Union Ballroom, UMass Amherst, Amherst, MA',
      'thompson hall': 'Thompson Hall, UMass Amherst, Amherst, MA',
      'hasbrouck': 'Hasbrouck Laboratory, UMass Amherst, Amherst, MA',
      'hasbrouck laboratory': 'Hasbrouck Laboratory, UMass Amherst, Amherst, MA',
      'agricultural engineering building': 'Agricultural Engineering Building, UMass Amherst, Amherst, MA',
      'agricultural engineering building north': 'Agricultural Engineering Building, UMass Amherst, Amherst, MA',
      'morrill science center': 'Morrill Science Center, UMass Amherst, Amherst, MA',
      'du bois library': 'W.E.B. Du Bois Library, UMass Amherst, Amherst, MA',
      'w.e.b. du bois library': 'W.E.B. Du Bois Library, UMass Amherst, Amherst, MA',
      'integrated learning center': 'Integrated Learning Center, UMass Amherst, Amherst, MA',
      'ilc': 'Integrated Learning Center, UMass Amherst, Amherst, MA',
      'isenberg school of management': 'Isenberg School of Management, UMass Amherst, Amherst, MA',
      'mullins center': 'Mullins Center, UMass Amherst, Amherst, MA',
      'boyden gymnasium': 'Boyden Gymnasium, UMass Amherst, Amherst, MA',
      'fine arts center': 'Fine Arts Center, UMass Amherst, Amherst, MA',
      'lederle graduate research center': 'Lederle Graduate Research Center, UMass Amherst, Amherst, MA',
      'recreation center': 'Recreation Center, UMass Amherst, Amherst, MA',
      'worcester commons': 'Worcester Dining Commons, UMass Amherst, Amherst, MA',
      'bartlett hall': 'Bartlett Hall, UMass Amherst, Amherst, MA',
      'machmer hall': 'Machmer Hall, UMass Amherst, Amherst, MA',
      'goodell building': 'Goodell Building, UMass Amherst, Amherst, MA',
    };
    
    // Return mapped name or capitalize the normalized name as fallback
    return buildingNameMap[normalizedName.toLowerCase()] || 
           (normalizedName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + ', UMass Amherst, Amherst, MA');
  };

  // Open native maps app with walking directions
  const openDirections = async (
    from: { latitude: number; longitude: number }, 
    to: { latitude: number; longitude: number },
    destinationName?: string
  ) => {
    // Use proper building names for Google Maps
    const formattedDestination = destinationName 
      ? encodeURIComponent(getProperBuildingName(destinationName))
      : encodeURIComponent(`${to.latitude},${to.longitude}`);
    
    // Google Maps web URL - works everywhere
    const googleMapsUrl = destinationName
      ? `https://www.google.com/maps/dir/?api=1&origin=${from.latitude},${from.longitude}&destination=${formattedDestination}&travelmode=walking`
      : `https://www.google.com/maps/dir/?api=1&origin=${from.latitude},${from.longitude}&destination=${to.latitude},${to.longitude}&travelmode=walking`;
    
    // Native app URLs
    const nativeUrl = Platform.select({
      ios: destinationName
        ? `maps://?saddr=${from.latitude},${from.longitude}&daddr=${formattedDestination}&dirflg=w`
        : `maps://?saddr=${from.latitude},${from.longitude}&daddr=${to.latitude},${to.longitude}&dirflg=w`,
      android: destinationName
        ? `google.navigation:q=${formattedDestination}&mode=w`
        : `google.navigation:q=${to.latitude},${to.longitude}&mode=w`,
    });

    try {
      if (nativeUrl) {
        const canOpen = await Linking.canOpenURL(nativeUrl);
        
        if (canOpen) {
          // Open native app
          await Linking.openURL(nativeUrl);
        } else {
          // Open web version
          await Linking.openURL(googleMapsUrl);
        }
      } else {
        // Fallback to web
        await Linking.openURL(googleMapsUrl);
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      // Try web as last resort
      try {
        await Linking.openURL(googleMapsUrl);
      } catch (webError) {
        console.error('Web fallback failed:', webError);
        Alert.alert('Error', 'Unable to open maps. Please try again.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#881C1C" />
      
      {/* Navigation Menu Drawer */}
      <Modal
        visible={isMenuOpen}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
          <View style={styles.menuOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[styles.menuDrawer, { backgroundColor: appTheme === 'dark' ? '#2A3442' : '#FFFFFF' }]}>
            {/* Menu Header - Redesigned */}
            <View style={[styles.menuHeader, { backgroundColor: colors.headerBackground }]}>
              <View style={styles.menuHeaderContent}>
                <Text style={[styles.menuHeaderTitle, { color: colors.headerText }]}>UAppen</Text>
                <Text style={[styles.menuHeaderSubtitle, { color: colors.headerText }]}>
                  Discover Campus Events
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsMenuOpen(false)} style={styles.closeButtonTop}>
                <IconSymbol name="xmark.circle.fill" size={32} color={colors.headerText} />
              </TouchableOpacity>
            </View>

            {/* Event Categories */}
            <ScrollView style={styles.menuContent}>
              <Text style={[styles.categoriesTitle, { color: appTheme === 'dark' ? '#FFFFFF' : colors.text }]}>Event Categories</Text>
              
              {eventCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.categoryItem}
                  onPress={() => toggleTheme(category)}
                >
                  <View style={[
                    styles.checkbox,
                    selectedThemes.includes(category) && styles.checkboxChecked
                  ]}>
                    {selectedThemes.includes(category) && (
                      <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={[styles.categoryText, { color: appTheme === 'dark' ? '#FFFFFF' : colors.text }]}>{category}</Text>
                </TouchableOpacity>
              ))}

              {/* Apply Button */}
              <TouchableOpacity style={styles.applyButton} onPress={applyThemes}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>

              {/* Help Button */}
              <TouchableOpacity 
                style={[
                  styles.helpButton, 
                  { borderColor: appTheme === 'dark' ? '#555' : colors.border }
                ]} 
                onPress={handleHelpPress}
              >
                <Text style={[
                  styles.helpButtonText, 
                  { color: appTheme === 'dark' ? '#FFFFFF' : colors.text }
                ]}>
                  Help
                </Text>
              </TouchableOpacity>
            </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Header with hamburger menu and UAppen branding */}
      <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={handleMenuPress}
          activeOpacity={0.7}
        >
          <View style={styles.menuIconContainer}>
            <View style={[styles.hamburgerLine, { backgroundColor: colors.headerText }]} />
            <View style={[styles.hamburgerLine, { backgroundColor: colors.headerText }]} />
            <View style={[styles.hamburgerLine, { backgroundColor: colors.headerText }]} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>UAppen</Text>
        <TouchableOpacity 
          style={styles.themeToggleButton}
          onPress={toggleAppTheme}
          activeOpacity={0.7}
        >
          <Text style={styles.themeToggleIcon}>
            {appTheme === 'light' ? '🌛' : '☀️'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={UMASS_REGION}
        customMapStyle={customMapStyle}
        showsUserLocation={true}
        showsMyLocationButton={false}
        minZoomLevel={14}
        maxZoomLevel={19}
        rotateEnabled={false}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={false}
        onPress={handleMapPress}
        onPoiClick={handlePoiClick}
        onPanDrag={() => setIsMapMoving(true)}
        onRegionChangeComplete={() => {
          // Reset moving flag after a short delay
          setTimeout(() => setIsMapMoving(false), 200);
        }}
        mapPadding={{ top: 0, right: 0, bottom: 80, left: 0 }}
        toolbarEnabled={true}
      >
        {/* Event Markers */}
        {eventLocations.map((location, index) => (
          <Marker
            key={`${location.latitude}-${location.longitude}-${index}-${markerKey}`}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            onPress={(e) => {
              e.stopPropagation();
              
              // Animate map to zoom in on marker
              if (mapRef.current) {
                mapRef.current.animateToRegion({
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.005,  // Zoom in closer
                  longitudeDelta: 0.005,
                }, 600);
              }
              
              // Open modal after zoom animation completes
              setTimeout(() => {
                setSelectedLocation(location);
              }, 650);
            }}
            tracksViewChanges={tracksViewChanges}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View 
              style={styles.markerBadge}
              onLayout={() => {
                // Turn off tracking once the marker bitmap is created (Android only)
                if (Platform.OS === 'android' && tracksViewChanges) {
                  setTracksViewChanges(false);
                }
              }}
            >
              <Text style={styles.markerText}>{location.event_count}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Map controls: stay on campus by default; jump to GPS only on tap */}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={[styles.mapControlButton, { backgroundColor: colors.headerBackground }]}
          onPress={centerOnCampus}
          activeOpacity={0.8}
        >
          <Text style={[styles.mapControlText, { color: colors.headerText }]}>Campus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mapControlButton, { backgroundColor: colors.headerBackground }]}
          onPress={goToMyLocation}
          activeOpacity={0.8}
        >
          <Text style={[styles.mapControlText, { color: colors.headerText }]}>My Location</Text>
        </TouchableOpacity>
      </View>

      {/* Event Details Modal */}
      <Modal
        visible={selectedLocation !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.eventModalOverlay}>
          <TouchableOpacity
            style={styles.eventModalBackdrop}
            activeOpacity={1}
            onPress={handleCloseModal}
          />
          <View style={[styles.eventModalContent, { backgroundColor: appTheme === 'dark' ? '#B0B7C0' : colors.background }]}>
            {/* Modal Header */}
            <View style={[styles.eventModalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.eventModalHeaderContent}>
                <IconSymbol name="mappin.circle.fill" size={24} color="#881C1C" />
                <View style={styles.eventModalHeaderText}>
                  <Text style={[styles.eventModalTitle, { color: colors.text }]}>
                    {selectedLocation?.normalized_location}
                  </Text>
                  <Text style={[styles.eventModalSubtitle, { color: colors.textSecondary }]}>
                    {selectedLocation?.event_count} {selectedLocation?.event_count === 1 ? 'Event' : 'Events'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={handleCloseModal}
                style={styles.eventModalCloseButton}
              >
                <IconSymbol name="xmark.circle.fill" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Get Directions Button - Single button for the location */}
            <View style={[styles.directionsButtonContainer, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                style={styles.mainDirectionsButton}
                onPress={() => {
                  if (currentLocation && selectedLocation) {
                    openDirections(
                      currentLocation, 
                      {
                        latitude: selectedLocation.latitude,
                        longitude: selectedLocation.longitude,
                      },
                      selectedLocation.normalized_location
                    );
                  } else {
                    Alert.alert('Location Required', 'Please enable location services to get directions');
                  }
                }}
              >
                <IconSymbol name="arrow.triangle.turn.up.right.circle.fill" size={20} color="#FFFFFF" />
                <Text style={styles.mainDirectionsText}>Get Directions to Location</Text>
              </TouchableOpacity>
            </View>

            {/* Events List */}
            <ScrollView
              style={styles.eventsList}
              contentContainerStyle={styles.eventsListContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              bounces
            >
              {selectedLocation?.events.map((event) => {
                const hasLink = event.link && event.link.trim() !== '';
                
                return (
                  <View
                    key={event.id}
                    style={[
                      styles.eventCard,
                      !hasLink && styles.eventCardNoLink,
                      { backgroundColor: colors.surface, borderColor: colors.border }
                    ]}
                  >
                    {/* Event Name */}
                    <Text style={[styles.eventName, { color: colors.text }]}>{event.name}</Text>
                    
                    {/* No Link Indicator */}
                    {!hasLink && (
                      <View style={styles.noLinkBadge}>
                        <Text style={styles.noLinkText}>No registration link</Text>
                      </View>
                    )}
                  
                  {/* Specific Location */}
                  <View style={styles.eventMetaRow}>
                    <IconSymbol name="mappin.circle.fill" size={14} color="#881C1C" />
                    <Text style={styles.eventLocationText}>{event.location}</Text>
                  </View>
                  
                  {/* Event Time & Date */}
                  <View style={styles.eventMetaRow}>
                    <IconSymbol name="calendar" size={14} color={colors.textSecondary} />
                    <Text style={[styles.eventMetaText, { color: colors.textSecondary }]}>{event.date}</Text>
                  </View>
                  
                  <View style={styles.eventMetaRow}>
                    <IconSymbol name="clock" size={14} color={colors.textSecondary} />
                    <Text style={[styles.eventMetaText, { color: colors.textSecondary }]}>
                      {event.start_time}
                      {event.end_time && ` - ${event.end_time}`}
                    </Text>
                  </View>

                  {/* Organization */}
                  {event.organization && (
                    <View style={styles.eventMetaRow}>
                      <IconSymbol name="person.2" size={14} color={colors.textSecondary} />
                      <Text style={[styles.eventMetaText, { color: colors.textSecondary }]}>{event.organization}</Text>
                    </View>
                  )}

                  {/* Category / Sport label */}
                  {(() => {
                    const sportLabel = getSportLabel(event.category);
                    let displayCategory: string | null = sportLabel;
                    if (!displayCategory) {
                      if (event.category && event.category.trim() !== '' && event.category !== 'Uncategorized') {
                        displayCategory = mapToMainCategory(event.category) || event.category;
                      } else {
                        displayCategory = 'Other';
                      }
                    }
                    
                    return displayCategory ? (
                      <View style={[
                        styles.eventCategoryBadge,
                        sportLabel ? styles.sportBadge : null,
                      ]}>
                        <Text style={styles.eventCategoryText}>{displayCategory}</Text>
                      </View>
                    ) : null;
                  })()}

                  <View style={styles.eventActionRow}>
                    <TouchableOpacity
                      style={[
                        styles.eventActionButton,
                        savedEventIds.has(event.id) && styles.eventActionButtonActive,
                      ]}
                      onPress={() => handleToggleGoing(event)}
                    >
                      <IconSymbol
                        name={savedEventIds.has(event.id) ? 'star.fill' : 'star'}
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text style={styles.eventActionText}>
                        {savedEventIds.has(event.id) ? 'Going' : 'Going?'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.eventActionButtonSecondary}
                      onPress={() => exportEventToCalendar(event)}
                    >
                      <IconSymbol name="calendar.badge.plus" size={16} color="#881C1C" />
                      <Text style={styles.eventActionTextSecondary}>Calendar</Text>
                    </TouchableOpacity>
                    {hasLink && (
                      <TouchableOpacity
                        style={styles.eventActionButtonSecondary}
                        onPress={() => {
                          Linking.openURL(event.link).catch((error) => {
                            console.error('Error opening event link:', error);
                            Alert.alert('Error', 'Unable to open event link');
                          });
                        }}
                      >
                        <Text style={styles.eventActionTextSecondary}>Details</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* More Events Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.bookEventsButton}
          onPress={openEventsPage}
        >
          <Text style={styles.bookEventsText}>More Events</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eeeeee', // Lighter grey background matching map theme
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#881C1C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 50,
    paddingBottom: 14,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Platform.OS === 'android' ? 4 : 0,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    gap: 4,
  },
  hamburgerLine: {
    width: 20,
    height: 2.5,
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  themeToggleButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    ...(Platform.OS === 'android' ? {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      elevation: 4,
    } : {}),
  },
  themeToggleIcon: {
    fontSize: 24,
    textAlign: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'android'
      ? (StatusBar.currentHeight || 0) + 78
      : 126,
    gap: 10,
    zIndex: 10,
    alignItems: 'stretch',
  },
  mapControlButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapControlText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    right: 10,
    zIndex: 10,
  },
  bookEventsButton: {
    backgroundColor: '#881C1C',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  bookEventsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Menu Drawer Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  menuDrawer: {
    width: '75%',
    height: SCREEN_HEIGHT,
    backgroundColor: '#1a1a1a',
  },
  menuHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  menuHeaderContent: {
    flex: 1,
  },
  menuHeaderTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  menuHeaderSubtitle: {
    fontSize: 14,
    opacity: 0.9,
    fontWeight: '500',
  },
  closeButton: {
    marginRight: 15,
  },
  closeButtonTop: {
    marginTop: -4,
  },
  menuContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 40,
  },
  categoriesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#555',
    borderRadius: 4,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  checkboxChecked: {
    backgroundColor: '#881C1C',
    borderColor: '#881C1C',
  },
  categoryText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: '#881C1C',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 40,
    borderWidth: 2,
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Event Marker Styles - Perfect circles for all devices
  markerBadge: {
    backgroundColor: '#881C1C',
    width: Platform.OS === 'ios' ? 55 :40,
    height: Platform.OS === 'ios' ? 55 : 40,
    borderRadius: 1000,  // High value ensures perfect circle on any device
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    } : {
      elevation: 8,
    }),
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    // Ensure text doesn't affect container shape
    lineHeight: 24,
  },
  // Event Modal Styles
  eventModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  eventModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  eventModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    zIndex: 2,
  },
  eventModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  eventModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventModalHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  eventModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  eventModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  eventModalCloseButton: {
    padding: 4,
  },
  directionsButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  mainDirectionsButton: {
    backgroundColor: '#881C1C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainDirectionsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventsList: {
    flex: 1,
  },
  eventsListContent: {
    padding: 16,
    paddingBottom: 40,
  },
  eventCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  eventCardNoLink: {
    opacity: 0.7,
    backgroundColor: '#f0f0f0',
  },
  noLinkBadge: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  noLinkText: {
    color: '#c62828',
    fontSize: 11,
    fontWeight: '600',
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  eventMetaText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  eventLocationText: {
    fontSize: 14,
    color: '#881C1C',
    fontWeight: '600',
    flex: 1,
  },
  eventCategoryBadge: {
    backgroundColor: '#881C1C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 8,
  },
  sportBadge: {
    backgroundColor: '#1B4F72',
  },
  eventCategoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  eventActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  eventActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#A04040',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  eventActionButtonActive: {
    backgroundColor: '#881C1C',
  },
  eventActionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#881C1C',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  eventActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  eventActionTextSecondary: {
    color: '#881C1C',
    fontSize: 13,
    fontWeight: '700',
  },
});