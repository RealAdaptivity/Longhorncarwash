import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, font } from '../theme';
import { TimeLog } from '../types';

const TZ = 'America/Chicago';

function calcHours(logs: TimeLog[]): number {
  const sorted = [...logs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let total = 0, lastIn: number | null = null;
  for (const l of sorted) {
    const t = new Date(l.created_at).getTime();
    if (l.action === 'IN' || l.action === 'END_LUNCH' || l.action === 'CLOCK_IN') lastIn = t;
    else if (
      (l.action === 'START_LUNCH' || l.action === 'OUT' || l.action === 'CLOCK_OUT') &&
      lastIn !== null
    ) {
      total += (t - lastIn) / 3600000;
      lastIn = null;
    }
  }
  return total;
}

function getWeekStart(): Date {
  const now = new Date();
  const ct = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  const day = ct.getDay();
  const daysFromWed = (day + 7 - 3) % 7;
  const ws = new Date(ct);
  ws.setDate(ct.getDate() - daysFromWed);
  ws.setHours(0, 0, 0, 0);
  return ws;
}

interface TimeOffRequest {
  id: string;
  dates: string;
  reason: string;
  status: string;
  created_at: string;
}

export function MyHoursScreen() {
  const { user } = useAuth();
  const [weekLogs, setWeekLogs] = useState<TimeLog[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqDates, setReqDates] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const weekStart = getWeekStart();
    const since = weekStart.toISOString();

    const [logsRes, timeOffRes] = await Promise.all([
      supabase
        .from('time_logs')
        .select('id, user_id, action, created_at')
        .eq('user_id', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: true }),
      supabase
        .from('time_off_requests')
        .select('id, dates, reason, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    setWeekLogs((logsRes.data ?? []) as TimeLog[]);
    setTimeOffRequests((timeOffRes.data ?? []) as TimeOffRequest[]);
    setLoading(false);
  }, [user]);

  async function submitTimeOff() {
    if (!reqDates.trim() || !reqReason.trim()) {
      Alert.alert('Error', 'Please fill in both dates and reason.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('time_off_requests').insert({
      user_id: user!.id,
      dates: reqDates.trim(),
      reason: reqReason.trim(),
      status: 'pending',
    });
    setSubmitting(false);
    if (error) { Alert.alert('Error', 'Could not submit request.'); return; }
    setReqDates('');
    setReqReason('');
    setShowRequestModal(false);
    loadData();
  }

  const weekHours = calcHours(weekLogs);

  const statCards = [
    { label: 'This Week', value: `${weekHours.toFixed(2)} hrs`, color: colors.primary },
  ];

  const statusColor: Record<string, string> = {
    pending: colors.warning,
    approved: colors.success,
    denied: colors.danger,
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.xl * 2 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>My Hours</Text>

        {/* Stat cards */}
        <View style={styles.statsRow}>
          {statCards.map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Time Off */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Time Off Requests</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowRequestModal(true)}>
              <Text style={styles.addBtnText}>+ Request</Text>
            </TouchableOpacity>
          </View>

          {timeOffRequests.length === 0 ? (
            <Text style={styles.emptyText}>No requests yet.</Text>
          ) : (
            timeOffRequests.map(r => (
              <View key={r.id} style={styles.requestCard}>
                <View style={styles.requestTop}>
                  <Text style={styles.requestDates}>{r.dates}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: (statusColor[r.status] ?? colors.textMuted) + '22' }]}>
                    <Text style={[styles.statusText, { color: statusColor[r.status] ?? colors.textMuted }]}>
                      {r.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.requestReason}>{r.reason}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Request Time Off Modal */}
      <Modal visible={showRequestModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Time Off</Text>

            <Text style={styles.inputLabel}>Dates</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Jul 4-6, 2026"
              placeholderTextColor={colors.textMuted}
              value={reqDates}
              onChangeText={setReqDates}
            />

            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Reason for time off..."
              placeholderTextColor={colors.textMuted}
              value={reqReason}
              onChangeText={setReqReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRequestModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitTimeOff} disabled={submitting}>
                {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitBtnText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.text },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: font.xl, fontWeight: '700' },
  statLabel: { fontSize: font.sm, color: colors.textMuted, marginTop: spacing.xs },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  addBtnText: { color: colors.white, fontSize: font.sm, fontWeight: '700' },
  emptyText: { color: colors.textMuted, fontSize: font.sm, textAlign: 'center', padding: spacing.md },
  requestCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestDates: { fontSize: font.base, fontWeight: '600', color: colors.text },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  requestReason: { fontSize: font.sm, color: colors.textMuted },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  modalTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  inputLabel: { fontSize: font.sm, color: colors.textMuted, marginBottom: -spacing.sm },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: font.base,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.card, alignItems: 'center',
  },
  cancelBtnText: { color: colors.textMuted, fontWeight: '600' },
  submitBtn: {
    flex: 2, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  submitBtnText: { color: colors.white, fontWeight: '700' },
});
