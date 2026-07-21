import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, font } from '../../theme';

const TZ = 'America/Chicago';
const MISSED_ACTION_LABELS: Record<string, string> = {
  IN: 'Clock In',
  OUT: 'Clock Out',
  START_LUNCH: 'Start Lunch',
  END_LUNCH: 'End Lunch',
};

interface PendingApproval {
  id: string;
  name: string;
  type: string;
  pending_password?: string;
  pending_pin?: string;
}

interface MissedPunchRequest {
  id: string;
  user_id: string;
  employee_name: string;
  action: string;
  punch_at: string;
  reason: string | null;
}

interface TimeOffRequest {
  id: string;
  user_id: string;
  dates: string;
  reason: string;
  status: string;
  users?: { name: string };
}

export function EmployeesScreen() {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [missedPunches, setMissedPunches] = useState<MissedPunchRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [approvalsRes, timeOffRes, missedRes] = await Promise.all([
      supabase.from('users')
        .select('id, name, pending_password, pending_pin')
        .not('pending_password', 'is', null)
        .or('pending_pin.not.is.null,pending_password.not.is.null'),
      supabase.from('time_off_requests')
        .select('id, user_id, dates, reason, status, users(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase.from('missed_punch_requests')
        .select('id, user_id, employee_name, action, punch_at, reason')
        .eq('status', 'pending')
        .order('requested_at', { ascending: true }),
    ]);

    const approvals: PendingApproval[] = (approvalsRes.data ?? []).map((u: any) => ({
      id: u.id,
      name: u.name,
      type: u.pending_password ? 'Password Change' : 'PIN Change',
      pending_password: u.pending_password,
      pending_pin: u.pending_pin,
    }));

    const timeOff: TimeOffRequest[] = (timeOffRes.data ?? []).map((r: any) => {
      const usersArray = Array.isArray(r.users) ? r.users : (r.users ? [r.users] : []);
      return {
        id: r.id,
        user_id: r.user_id,
        dates: r.dates,
        reason: r.reason,
        status: r.status,
        users: usersArray[0] || { name: 'Unknown' },
      };
    });

    setPendingApprovals(approvals);
    setTimeOffRequests(timeOff);
    setMissedPunches((missedRes.data ?? []) as MissedPunchRequest[]);
    setLoading(false);
  }, []);

  async function approveMissedPunch(req: MissedPunchRequest) {
    const manager = user?.name ?? 'Manager';
    // Insert the missing punch (tagged as a manager correction), then mark the
    // request approved. Matches the web approval flow.
    const { error } = await supabase.from('time_logs').insert({
      user_id: req.user_id,
      action: req.action,
      created_at: new Date(req.punch_at).toISOString(),
      edited_by_manager: `${manager} (missed-punch)`,
    });
    if (error) {
      Alert.alert('Error', 'Could not add the punch. Please try again.');
      return;
    }
    await supabase
      .from('missed_punch_requests')
      .update({ status: 'approved', reviewed_by: manager })
      .eq('id', req.id);
    loadData();
  }

  async function denyMissedPunch(id: string) {
    const manager = user?.name ?? 'Manager';
    await supabase
      .from('missed_punch_requests')
      .update({ status: 'denied', reviewed_by: manager })
      .eq('id', id);
    loadData();
  }

  async function approvePassword(userId: string, password: string) {
    await supabase.from('users').update({ password, pending_password: null }).eq('id', userId);
    loadData();
  }

  async function approvePin(userId: string, pin: string) {
    await supabase.from('users').update({ pin, pending_pin: null }).eq('id', userId);
    loadData();
  }

  async function respondTimeOff(id: string, status: 'Approved' | 'Denied') {
    await supabase.from('time_off_requests').update({ status }).eq('id', id);
    loadData();
  }

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

        {/* Pending approvals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Approvals</Text>
          {pendingApprovals.length === 0 ? (
            <Text style={styles.emptyText}>No pending approvals</Text>
          ) : (
            pendingApprovals.map(a => (
              <View key={a.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardName}>{a.name}</Text>
                  <Text style={styles.cardType}>{a.type}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.denyBtn}
                    onPress={() => Alert.alert('Deny', `Deny ${a.type} for ${a.name}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Deny', style: 'destructive', onPress: () =>
                          supabase.from('users').update({ pending_password: null, pending_pin: null }).eq('id', a.id).then(() => loadData()),
                      },
                    ])}
                  >
                    <Text style={styles.denyBtnText}>Deny</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => {
                      if (a.pending_password) approvePassword(a.id, a.pending_password);
                      else if (a.pending_pin) approvePin(a.id, a.pending_pin);
                    }}
                  >
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Missed-punch requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Missed-Punch Requests</Text>
          {missedPunches.length === 0 ? (
            <Text style={styles.emptyText}>No missed-punch requests</Text>
          ) : (
            missedPunches.map(r => (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardName}>{r.employee_name}</Text>
                  <Text style={styles.cardType}>{MISSED_ACTION_LABELS[r.action] ?? r.action}</Text>
                </View>
                <Text style={styles.cardReason}>
                  {new Date(r.punch_at).toLocaleString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ,
                  })}
                  {r.reason ? ` — ${r.reason}` : ''}
                </Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.denyBtn}
                    onPress={() => Alert.alert('Deny', `Deny ${r.employee_name}'s missed-punch request?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Deny', style: 'destructive', onPress: () => denyMissedPunch(r.id) },
                    ])}
                  >
                    <Text style={styles.denyBtnText}>Deny</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => approveMissedPunch(r)}>
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Time off requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Time Off</Text>
          {timeOffRequests.length === 0 ? (
            <Text style={styles.emptyText}>No pending time off requests</Text>
          ) : (
            timeOffRequests.map(r => (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardName}>{r.users?.name ?? 'Unknown'}</Text>
                  <Text style={styles.cardType}>{r.dates}</Text>
                </View>
                <Text style={styles.cardReason}>{r.reason}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.denyBtn} onPress={() => respondTimeOff(r.id, 'Denied')}>
                    <Text style={styles.denyBtnText}>Deny</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => respondTimeOff(r.id, 'Approved')}>
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
  emptyText: { color: colors.textMuted, fontSize: font.sm, textAlign: 'center', padding: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: font.base, fontWeight: '700', color: colors.text },
  cardType: { fontSize: font.sm, color: colors.textMuted },
  cardReason: { fontSize: font.sm, color: colors.textMuted },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  denyBtn: {
    flex: 1, padding: spacing.sm, borderRadius: radius.sm,
    backgroundColor: colors.danger + '22', alignItems: 'center',
  },
  denyBtnText: { color: colors.danger, fontWeight: '700', fontSize: font.sm },
  approveBtn: {
    flex: 2, padding: spacing.sm, borderRadius: radius.sm,
    backgroundColor: colors.success, alignItems: 'center',
  },
  approveBtnText: { color: colors.white, fontWeight: '700', fontSize: font.sm },
});
