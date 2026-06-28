import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, font } from '../theme';
import { TimeLog, ActionType } from '../types';

const CAR_WASH_LAT = 33.06734;
const CAR_WASH_LON = -97.29654;
const ALLOWED_RADIUS = 100;
const QUEUE_KEY = '@lcw_punch_queue';
const TZ = 'America/Chicago';

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcHours(logs: TimeLog[]): number {
  const sorted = [...logs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let total = 0, lastIn: number | null = null;
  for (const l of sorted) {
    const t = new Date(l.created_at).getTime();
    if (l.action === 'IN' || l.action === 'END_LUNCH') lastIn = t;
    else if ((l.action === 'START_LUNCH' || l.action === 'OUT') && lastIn !== null) {
      total += (t - lastIn) / 3600000;
      lastIn = null;
    }
  }
  return total;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZone: TZ });
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ });
}

function statusLabel(action: ActionType | null): string {
  if (!action) return 'NOT CLOCKED IN';
  const labels: Record<ActionType, string> = {
    IN: 'CLOCKED IN',
    OUT: 'CLOCKED OUT',
    START_LUNCH: 'ON LUNCH',
    END_LUNCH: 'BACK FROM LUNCH',
  };
  return labels[action];
}

function statusColor(action: ActionType | null): string {
  if (!action || action === 'OUT') return colors.textMuted;
  if (action === 'IN' || action === 'END_LUNCH') return colors.success;
  if (action === 'START_LUNCH') return colors.warning;
  return colors.textMuted;
}

export function TimeclockScreen() {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [geofenceEnabled, setGeofenceEnabled] = useState(true);

  const lastAction = logs.length ? logs[logs.length - 1].action : null;
  const todayHours = calcHours(logs);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    loadSettings();
    loadLogs();
    flushQueue();
  }, []);

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('value').eq('id', 'geofence_enabled').single();
    setGeofenceEnabled(data?.value !== 'false');
  }

  const loadLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
    const since = new Date(Date.now() - 28 * 3600000).toISOString();
    const { data } = await supabase
      .from('time_logs')
      .select('id, user_id, action, created_at, edited_by_manager, punch_lat, punch_lon, punch_accuracy')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    const todayLogs = (data ?? []).filter(
      l => new Date(l.created_at).toLocaleDateString('en-CA', { timeZone: TZ }) === today
    );
    setLogs(todayLogs as TimeLog[]);
    setLoading(false);
  }, [user]);

  async function flushQueue() {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (!raw) return;
      const queue: Array<{ user_id: string; action: string; created_at: string }> = JSON.parse(raw);
      for (const item of queue) {
        await supabase.from('time_logs').insert(item);
      }
      await AsyncStorage.removeItem(QUEUE_KEY);
    } catch { /* network error, leave queue */ }
  }

  async function checkLocation(): Promise<{ lat: number; lon: number; accuracy: number } | null> {
    if (!geofenceEnabled) return null;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location Required', 'Please allow location access to clock in/out.');
      return null;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const { latitude, longitude, accuracy } = pos.coords;
    if (accuracy && accuracy > ALLOWED_RADIUS) {
      Alert.alert('Weak GPS', `GPS signal too weak (~${Math.round(accuracy * 3.28084)} ft). Step outside and try again.`);
      return null;
    }
    const dist = haversine(CAR_WASH_LAT, CAR_WASH_LON, latitude, longitude);
    if (dist > ALLOWED_RADIUS) {
      Alert.alert('Too Far Away', `You are ${Math.round(dist * 3.28084)} feet from the site.`);
      return null;
    }
    return { lat: latitude, lon: longitude, accuracy: accuracy ?? 0 };
  }

  async function punch(action: ActionType) {
    if (!user || punching) return;
    setPunching(true);
    try {
      const location = await checkLocation();
      if (geofenceEnabled && location === null) { setPunching(false); return; }

      const payload: Record<string, unknown> = {
        user_id: user.id,
        action,
        created_at: new Date().toISOString(),
      };
      if (location) {
        payload.punch_lat = location.lat;
        payload.punch_lon = location.lon;
        payload.punch_accuracy = location.accuracy;
      }

      const { error } = await supabase.from('time_logs').insert(payload);
      if (error) {
        await AsyncStorage.getItem(QUEUE_KEY).then(async raw => {
          const queue = raw ? JSON.parse(raw) : [];
          queue.push(payload);
          await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        });
      }
      await loadLogs();
    } catch {
      Alert.alert('Error', 'Could not record punch. Please try again.');
    } finally {
      setPunching(false);
    }
  }

  const buttons = [
    { label: 'CLOCK IN', action: 'IN' as ActionType, color: colors.success, disabled: lastAction === 'IN' || lastAction === 'END_LUNCH' },
    { label: 'CLOCK OUT', action: 'OUT' as ActionType, color: colors.danger, disabled: !lastAction || lastAction === 'OUT' },
    { label: 'START LUNCH', action: 'START_LUNCH' as ActionType, color: colors.lunch, disabled: lastAction !== 'IN' && lastAction !== 'END_LUNCH' },
    { label: 'END LUNCH', action: 'END_LUNCH' as ActionType, color: colors.success, disabled: lastAction !== 'START_LUNCH' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Clock */}
        <View style={styles.clockCard}>
          <Text style={styles.clockTime}>{formatTime(now)}</Text>
          <Text style={styles.clockDate}>{formatDate(now)}</Text>
        </View>

        {/* Status */}
        <View style={styles.statusCard}>
          <Text style={styles.greeting}>Hello, {user?.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor(lastAction) + '22' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor(lastAction) }]} />
            <Text style={[styles.statusText, { color: statusColor(lastAction) }]}>
              {statusLabel(lastAction)}
            </Text>
          </View>
          {todayHours > 0 && (
            <Text style={styles.hoursText}>{todayHours.toFixed(2)} hrs today</Text>
          )}
        </View>

        {/* Punch buttons */}
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.xl }} />
        ) : (
          <View style={styles.buttonGrid}>
            {buttons.map(btn => (
              <TouchableOpacity
                key={btn.action}
                style={[styles.punchBtn, { backgroundColor: btn.color + (btn.disabled ? '33' : 'cc') }]}
                onPress={() => punch(btn.action)}
                disabled={btn.disabled || punching}
                activeOpacity={0.8}
              >
                {punching ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={[styles.punchBtnText, btn.disabled && styles.punchBtnDisabled]}>
                    {btn.label}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Today's log */}
        {logs.length > 0 && (
          <View style={styles.logCard}>
            <Text style={styles.logTitle}>Today's Punches</Text>
            {[...logs].reverse().map(l => (
              <View key={l.id} style={styles.logRow}>
                <Text style={styles.logAction}>{l.action.replace('_', ' ')}</Text>
                <Text style={styles.logTime}>
                  {new Date(l.created_at).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ,
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  clockCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  clockTime: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  clockDate: {
    fontSize: font.base,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  greeting: {
    fontSize: font.md,
    color: colors.text,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: font.sm,
    fontWeight: '700',
    letterSpacing: 1,
  },
  hoursText: {
    fontSize: font.sm,
    color: colors.textMuted,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  punchBtn: {
    width: '48%',
    paddingVertical: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  punchBtnText: {
    color: colors.white,
    fontSize: font.sm,
    fontWeight: '700',
    letterSpacing: 1,
  },
  punchBtnDisabled: {
    opacity: 0.4,
  },
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  logTitle: {
    fontSize: font.base,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logAction: {
    color: colors.textMuted,
    fontSize: font.sm,
    textTransform: 'capitalize',
  },
  logTime: {
    color: colors.text,
    fontSize: font.sm,
    fontWeight: '600',
  },
});
