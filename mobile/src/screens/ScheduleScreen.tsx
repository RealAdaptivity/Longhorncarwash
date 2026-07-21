import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, font } from '../theme';
import { Schedule } from '../types';

const SHIFT_COLORS: Record<string, string> = {
  off: colors.textMuted,
  default: colors.success,
};

export function ScheduleScreen() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Array<{ id: string; created_at: string; parsed: Schedule }>>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSchedules(); }, []);

  async function loadSchedules() {
    setLoading(true);
    const { data } = await supabase
      .from('schedules')
      .select('id, content, created_at')
      .neq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    const parsed = (data ?? []).map(s => {
      try { return { id: s.id, created_at: s.created_at, parsed: JSON.parse(s.content) as Schedule }; }
      catch { return null; }
    }).filter(Boolean) as Array<{ id: string; created_at: string; parsed: Schedule }>;

    setSchedules(parsed);
    setLoading(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.xl * 2 }} />
      </SafeAreaView>
    );
  }

  if (!schedules.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No schedules posted yet.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const schedule = schedules[selectedIndex]?.parsed;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Weekly Schedule</Text>
          <Text style={styles.weekRange}>{schedule?.weekRange}</Text>
        </View>

        {/* Week selector */}
        {schedules.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekSelector}>
            {schedules.map((s, i) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.weekTab, i === selectedIndex && styles.weekTabActive]}
                onPress={() => setSelectedIndex(i)}
              >
                <Text style={[styles.weekTabText, i === selectedIndex && styles.weekTabTextActive]}>
                  {s.parsed.weekRange}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Day headers */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={[styles.cell, styles.nameCell]}>
                <Text style={styles.headerText}>Employee</Text>
              </View>
              {schedule?.headers.map(h => (
                <View key={h} style={styles.cell}>
                  <Text style={styles.headerText} numberOfLines={2}>{h}</Text>
                </View>
              ))}
            </View>

            {schedule?.rows.map(row => {
              const isMe = row.employee.trim().toLowerCase() === user?.name.trim().toLowerCase();
              return (
                <View key={row.employee} style={[styles.tableRow, isMe && styles.tableRowHighlight]}>
                  <View style={[styles.cell, styles.nameCell]}>
                    <Text style={[styles.cellText, isMe && styles.cellTextHighlight]} numberOfLines={1}>
                      {row.employee}
                    </Text>
                  </View>
                  {row.shifts.map((shift, i) => {
                    const isOff = /^(off|-)$/i.test(shift.trim()) || !shift.trim();
                    return (
                      <View key={i} style={styles.cell}>
                        <Text style={[styles.shiftText, isOff && styles.offText]}>
                          {isOff ? 'OFF' : shift}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const CELL_WIDTH = 90;
const NAME_WIDTH = 110;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: font.xl,
    fontWeight: '700',
    color: colors.text,
  },
  weekRange: {
    fontSize: font.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  weekSelector: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  weekTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekTabText: { color: colors.textMuted, fontSize: font.sm },
  weekTabTextActive: { color: colors.white, fontWeight: '700' },
  tableScroll: { paddingHorizontal: spacing.md },
  table: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '88',
  },
  tableRowHighlight: {
    backgroundColor: colors.primary + '18',
  },
  cell: {
    width: CELL_WIDTH,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  nameCell: {
    width: NAME_WIDTH,
    alignItems: 'flex-start',
  },
  headerText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  cellText: {
    color: colors.text,
    fontSize: font.sm,
    fontWeight: '500',
  },
  cellTextHighlight: {
    color: colors.primary,
    fontWeight: '700',
  },
  shiftText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  offText: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: font.base,
  },
});
