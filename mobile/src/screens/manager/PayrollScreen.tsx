import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, font } from '../../theme';
import { TimeLog, User } from '../../types';

const TZ = 'America/Chicago';
const BIWEEKLY_ANCHOR = new Date('2026-05-19T00:00:00-05:00').getTime();
const WEEK_MS = 7 * 24 * 3600 * 1000;

function calcHours(logs: TimeLog[]): number {
  const sorted = [...logs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let total = 0, lastIn: number | null = null;
  for (const l of sorted) {
    const t = new Date(l.created_at).getTime();
    if (l.action === 'IN' || l.action === 'END_LUNCH') lastIn = t;
    else if ((l.action === 'START_LUNCH' || l.action === 'OUT') && lastIn !== null) {
      total += (t - lastIn) / 3600000; lastIn = null;
    }
  }
  return total;
}

function getWeekRangeStart(weeksBack: number): Date {
  const now = new Date();
  const ct = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  const day = ct.getDay();
  const daysFromTue = (day + 7 - 2) % 7;
  const thisWeekTue = new Date(ct);
  thisWeekTue.setDate(ct.getDate() - daysFromTue);
  thisWeekTue.setHours(0, 0, 0, 0);
  return new Date(thisWeekTue.getTime() - weeksBack * WEEK_MS);
}

interface PayrollRow {
  user: User;
  weeks: number[];
  total: number;
}

export function PayrollScreen() {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'biweekly' | 'monthly'>('biweekly');
  const [hourlyRates, setHourlyRates] = useState<Record<string, number>>({});

  useEffect(() => { loadPayroll(); }, []);

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    const weeksToLoad = 4;
    const since = getWeekRangeStart(weeksToLoad).toISOString();

    const [usersRes, logsRes, ratesRes] = await Promise.all([
      supabase.from('users').select('id, name, role, is_approved').eq('is_approved', true),
      supabase.from('time_logs')
        .select('id, user_id, action, created_at')
        .gte('created_at', since)
        .in('action', ['IN', 'OUT', 'START_LUNCH', 'END_LUNCH'])
        .order('created_at', { ascending: true }),
      supabase.from('user_rates').select('user_id, hourly_rate'),
    ]);

    const users = (usersRes.data ?? []) as User[];
    const allLogs = (logsRes.data ?? []) as TimeLog[];
    const rates: Record<string, number> = {};
    for (const r of (ratesRes.data ?? [])) rates[r.user_id] = r.hourly_rate;
    setHourlyRates(rates);

    const weekStarts = Array.from({ length: weeksToLoad }, (_, i) => getWeekRangeStart(weeksToLoad - 1 - i));

    const result: PayrollRow[] = users.map(u => {
      const userLogs = allLogs.filter(l => l.user_id === u.id);
      const weeks = weekStarts.map((ws, i) => {
        const nextWs = weekStarts[i + 1] ?? new Date(ws.getTime() + WEEK_MS);
        const weekLogs = userLogs.filter(l => {
          const t = new Date(l.created_at).getTime();
          return t >= ws.getTime() && t < nextWs.getTime();
        });
        return calcHours(weekLogs);
      });
      return { user: u, weeks, total: weeks.reduce((a, b) => a + b, 0) };
    });

    result.sort((a, b) => b.total - a.total);
    setRows(result.filter(r => r.total > 0));
    setLoading(false);
  }, []);

  const weekLabels = Array.from({ length: 4 }, (_, i) => {
    const ws = getWeekRangeStart(3 - i);
    return ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ });
  });

  const displayWeeks = mode === 'biweekly' ? [2, 3] : [0, 1, 2, 3];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.xl * 2 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Mode toggle */}
      <View style={styles.modeRow}>
        {(['biweekly', 'monthly'] as const).map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.modeTab, mode === m && styles.modeTabActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>
              {m === 'biweekly' ? 'Biweekly' : 'Monthly (4wk)'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cell, styles.nameCell, styles.headerText]}>Employee</Text>
            {displayWeeks.map(wi => (
              <Text key={wi} style={[styles.cell, styles.headerText]}>{weekLabels[wi]}</Text>
            ))}
            <Text style={[styles.cell, styles.headerText]}>Total</Text>
            <Text style={[styles.cell, styles.headerText]}>Est. Pay</Text>
          </View>

          <ScrollView>
            {rows.map(row => {
              const displayHrs = displayWeeks.map(wi => row.weeks[wi]);
              const total = displayHrs.reduce((a, b) => a + b, 0);
              const rate = hourlyRates[row.user.id] ?? 0;
              return (
                <View key={row.user.id} style={styles.tableRow}>
                  <Text style={[styles.cell, styles.nameCell, styles.nameText]}>{row.user.name}</Text>
                  {displayHrs.map((h, i) => (
                    <Text key={i} style={[styles.cell, styles.dataText]}>{h.toFixed(1)}</Text>
                  ))}
                  <Text style={[styles.cell, styles.totalText]}>{total.toFixed(1)}</Text>
                  <Text style={[styles.cell, styles.payText]}>
                    {rate ? `$${(total * rate).toFixed(0)}` : '—'}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const CELL_W = 80;
const NAME_W = 120;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  modeRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  modeTab: {
    flex: 1, padding: spacing.sm, borderRadius: radius.md,
    backgroundColor: colors.surface, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  modeTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeTabText: { color: colors.textMuted, fontSize: font.sm, fontWeight: '600' },
  modeTabTextActive: { color: colors.white },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tableHeader: { backgroundColor: colors.card },
  cell: { width: CELL_W, padding: spacing.sm, textAlign: 'center' },
  nameCell: { width: NAME_W, textAlign: 'left' },
  headerText: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  nameText: { color: colors.text, fontSize: font.sm, fontWeight: '600' },
  dataText: { color: colors.text, fontSize: font.sm },
  totalText: { color: colors.primary, fontSize: font.sm, fontWeight: '700' },
  payText: { color: colors.success, fontSize: font.sm, fontWeight: '600' },
});
