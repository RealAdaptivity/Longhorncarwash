import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, font } from '../../theme';

interface PendingApproval {
  id: string;
  name: string;
  type: string;
  kind: 'registration' | 'pin_change' | 'password_change';
}

const KIND_LABELS: Record<string, string> = {
  registration: 'New Registration',
  pin_change: 'PIN Change',
  password_change: 'Password Change',
};

interface TimeOffRequest {
  id: string;
  user_id: string;
  dates: string;
  reason: string;
  status: string;
  users?: { name: string };
}

export function EmployeesScreen() {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [approvalsRes, timeOffRes] = await Promise.all([
      // Fetch pending items via RPC so the requested PIN/password values never
      // reach the client; Approve promotes them server-side.
      supabase.rpc('list_pending_approvals'),
      supabase.from('time_off_requests')
        .select('id, user_id, dates, reason, status, users(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
    ]);

    const approvals: PendingApproval[] = (approvalsRes.data ?? []).map((u: any) => ({
      id: u.id,
      name: u.name,
      kind: u.kind,
      type: KIND_LABELS[u.kind] ?? 'Pending',
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
    setLoading(false);
  }, []);

  async function approveApproval(a: PendingApproval) {
    const fn = a.kind === 'registration' ? 'approve_registration'
      : a.kind === 'pin_change' ? 'approve_pin_change'
      : 'approve_password_change';
    await supabase.rpc(fn, { p_user_id: a.id });
    loadData();
  }

  async function denyApproval(a: PendingApproval) {
    const fn = a.kind === 'registration' ? 'reject_registration'
      : a.kind === 'pin_change' ? 'reject_pin_change'
      : 'reject_password_change';
    await supabase.rpc(fn, { p_user_id: a.id });
    loadData();
  }

  async function respondTimeOff(id: string, status: 'approved' | 'denied') {
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
                      { text: 'Deny', style: 'destructive', onPress: () => denyApproval(a) },
                    ])}
                  >
                    <Text style={styles.denyBtnText}>Deny</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => approveApproval(a)}
                  >
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
                  <TouchableOpacity style={styles.denyBtn} onPress={() => respondTimeOff(r.id, 'denied')}>
                    <Text style={styles.denyBtnText}>Deny</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => respondTimeOff(r.id, 'approved')}>
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
