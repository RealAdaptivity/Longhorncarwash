import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, font } from '../../theme';
import { Checklist, ChecklistCompletion, SiteLog } from '../../types';

const TZ = 'America/Chicago';

export function OpsScreen() {
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [completions, setCompletions] = useState<ChecklistCompletion[]>([]);
  const [siteLogs, setSiteLogs] = useState<SiteLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'checklists' | 'logs'>('checklists');
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - 7 * 24 * 3600000).toISOString();

    const [checkRes, compRes, logRes] = await Promise.all([
      supabase.from('checklists').select('id, title, description, role_required, tasks'),
      supabase.from('checklist_completions')
        .select('id, checklist_id, completed_at, checklists(title), users(name)')
        .gte('completed_at', since)
        .order('completed_at', { ascending: false }),
      supabase.from('site_logs')
        .select('id, type, description, equipment_name, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false }),
    ]);

    const comps: ChecklistCompletion[] = (compRes.data ?? []).map((c: any) => {
      const checkArray = Array.isArray(c.checklists) ? c.checklists : (c.checklists ? [c.checklists] : []);
      const userArray = Array.isArray(c.users) ? c.users : (c.users ? [c.users] : []);
      return {
        id: c.id,
        checklist_id: c.checklist_id,
        completed_at: c.completed_at,
        checklists: checkArray[0] || { title: 'Unknown' },
        users: userArray[0] || { name: 'Unknown' },
      };
    });

    setChecklists((checkRes.data ?? []) as Checklist[]);
    setCompletions(comps);
    setSiteLogs((logRes.data ?? []) as SiteLog[]);
    setLoading(false);
  }, []);

  async function completeChecklist(checklist: Checklist) {
    Alert.alert(
      'Complete Checklist',
      `Mark "${checklist.title}" as complete?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete', onPress: async () => {
            setCompleting(checklist.id);
            await supabase.from('checklist_completions').insert({
              checklist_id: checklist.id,
              completed_by: user?.id,
              completed_at: new Date().toISOString(),
            });
            setCompleting(null);
            loadData();
          },
        },
      ],
    );
  }

  function wasCompletedToday(checklistId: string): boolean {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
    return completions.some(c =>
      c.checklist_id === checklistId &&
      new Date(c.completed_at).toLocaleDateString('en-CA', { timeZone: TZ }) === today
    );
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
      <View style={styles.tabs}>
        {(['checklists', 'logs'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'checklists' ? 'Checklists' : 'Site Logs'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'checklists' ? (
          <>
            <Text style={styles.sectionTitle}>Active Checklists</Text>
            {checklists.length === 0 ? (
              <Text style={styles.emptyText}>No checklists configured.</Text>
            ) : (
              checklists.map(c => {
                const done = wasCompletedToday(c.id);
                return (
                  <View key={c.id} style={[styles.checklistCard, done && styles.checklistCardDone]}>
                    <View style={styles.checklistTop}>
                      <View style={styles.checklistInfo}>
                        <Text style={styles.checklistTitle}>{c.title}</Text>
                        {c.description ? <Text style={styles.checklistDesc}>{c.description}</Text> : null}
                        <Text style={styles.checklistMeta}>{(c.tasks ?? []).length} tasks · {c.role_required}</Text>
                      </View>
                      {done ? (
                        <View style={styles.doneBadge}>
                          <Text style={styles.doneBadgeText}>Done</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.completeBtn}
                          onPress={() => completeChecklist(c)}
                          disabled={completing === c.id}
                        >
                          {completing === c.id
                            ? <ActivityIndicator color={colors.white} size="small" />
                            : <Text style={styles.completeBtnText}>Complete</Text>
                          }
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}

            <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Recent Completions</Text>
            {completions.slice(0, 10).map(c => (
              <View key={c.id} style={styles.completionRow}>
                <View>
                  <Text style={styles.completionTitle}>{c.checklists?.title ?? 'Unknown'}</Text>
                  <Text style={styles.completionMeta}>
                    by {c.users?.name ?? 'Unknown'} · {new Date(c.completed_at).toLocaleString('en-US', {
                      timeZone: TZ, month: 'short', day: 'numeric',
                      hour: 'numeric', minute: '2-digit', hour12: true,
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Site Logs (Last 7 Days)</Text>
            {siteLogs.length === 0 ? (
              <Text style={styles.emptyText}>No site logs recorded.</Text>
            ) : (
              siteLogs.map(l => (
                <View key={l.id} style={styles.logCard}>
                  <View style={styles.logTop}>
                    <View style={[styles.typeBadge, { backgroundColor: l.type === 'maintenance' ? colors.warning + '22' : colors.primary + '22' }]}>
                      <Text style={[styles.typeText, { color: l.type === 'maintenance' ? colors.warning : colors.primary }]}>
                        {l.type}
                      </Text>
                    </View>
                    <Text style={styles.logDate}>
                      {new Date(l.created_at).toLocaleDateString('en-US', {
                        timeZone: TZ, month: 'short', day: 'numeric',
                      })}
                    </Text>
                  </View>
                  {l.equipment_name ? <Text style={styles.logEquipment}>{l.equipment_name}</Text> : null}
                  <Text style={styles.logDesc}>{l.description}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabs: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1, padding: spacing.sm, borderRadius: radius.md,
    backgroundColor: colors.surface, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: font.sm, fontWeight: '600' },
  tabTextActive: { color: colors.white },
  scroll: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  sectionTitle: { fontSize: font.md, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  emptyText: { color: colors.textMuted, fontSize: font.sm, textAlign: 'center', padding: spacing.md },
  checklistCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checklistCardDone: { opacity: 0.6 },
  checklistTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checklistInfo: { flex: 1, gap: spacing.xs },
  checklistTitle: { fontSize: font.base, fontWeight: '700', color: colors.text },
  checklistDesc: { fontSize: font.sm, color: colors.textMuted },
  checklistMeta: { fontSize: 11, color: colors.textMuted },
  doneBadge: {
    backgroundColor: colors.success + '22',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  doneBadgeText: { color: colors.success, fontSize: font.sm, fontWeight: '700' },
  completeBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  completeBtnText: { color: colors.white, fontSize: font.sm, fontWeight: '700' },
  completionRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completionTitle: { fontSize: font.base, fontWeight: '600', color: colors.text },
  completionMeta: { fontSize: font.sm, color: colors.textMuted, marginTop: spacing.xs },
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  typeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  logDate: { fontSize: font.sm, color: colors.textMuted },
  logEquipment: { fontSize: font.sm, fontWeight: '600', color: colors.text },
  logDesc: { fontSize: font.sm, color: colors.textMuted },
});
