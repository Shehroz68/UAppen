import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import type { Event } from '@/services/api';
import { exportEventToCalendar } from '@/services/calendar';
import { getSportLabel } from '@/services/categoryMapping';
import { getSavedEvents, unsaveEvent } from '@/services/savedEvents';

export default function SavedEventsScreen() {
  const { colors } = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const saved = await getSavedEvents();
    setEvents(saved);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRemove = async (eventId: number) => {
    const next = await unsaveEvent(eventId);
    setEvents(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#881C1C" />
      <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>Going</Text>
        <Text style={[styles.headerSubtitle, { color: colors.headerText }]}>
          Events you marked as going
        </Text>
      </View>

      {loading ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading…</Text>
      ) : events.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="star.fill" size={40} color="#881C1C" />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved events yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Open a map pin and tap Going to save events here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.eventName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {item.date} · {item.start_time}
                {item.end_time ? ` - ${item.end_time}` : ''}
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {item.location || item.normalized_location}
              </Text>
              {item.category ? (
                <View style={[styles.badge, getSportLabel(item.category) ? styles.sportBadge : null]}>
                  <Text style={styles.badgeText}>
                    {getSportLabel(item.category) || item.category}
                  </Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => exportEventToCalendar(item)}
                >
                  <IconSymbol name="calendar.badge.plus" size={18} color="#FFFFFF" />
                  <Text style={styles.actionText}>Calendar</Text>
                </TouchableOpacity>
                {item.link ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.secondaryBtn]}
                    onPress={() =>
                      Linking.openURL(item.link).catch(() =>
                        Alert.alert('Error', 'Unable to open event link')
                      )
                    }
                  >
                    <Text style={[styles.actionText, { color: '#881C1C' }]}>Details</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.removeBtn]}
                  onPress={() => handleRemove(item.id)}
                >
                  <Text style={[styles.actionText, { color: '#881C1C' }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 14 : 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.9,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  eventName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  meta: {
    fontSize: 13,
    marginBottom: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#881C1C',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  sportBadge: {
    backgroundColor: '#1B4F72',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#881C1C',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#881C1C',
  },
  removeBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#881C1C',
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 24,
  },
});
