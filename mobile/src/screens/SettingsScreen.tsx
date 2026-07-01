import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, font } from '../theme';

export function SettingsScreen() {
  const { user, logout, isManagerUnlocked, managerRole, unlockManager, lockManager } = useAuth();
  // Management-role users are auto-unlocked by their PIN — no separate manager login needed
  const isAutoUnlocked = isManagerUnlocked && !!user?.role && user.role !== 'Employee';
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [mgUsername, setMgUsername] = useState('');
  const [mgPassword, setMgPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleManagerLogin() {
    if (!mgUsername.trim() || !mgPassword.trim()) {
      Alert.alert('Error', 'Enter both username and password.');
      return;
    }
    setLoading(true);
    const result = await unlockManager(mgUsername.trim(), mgPassword);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Error', result.error ?? 'Invalid credentials');
      return;
    }
    setMgUsername('');
    setMgPassword('');
    setShowManagerModal(false);
  }

  function confirmLogout() {
    Alert.alert('Sign Out', `Sign out as ${user?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  function confirmLockManager() {
    Alert.alert('Lock Manager', 'Lock manager access?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Lock', style: 'destructive', onPress: lockManager },
    ]);
  }

  const rows = [
    // Only show manager login toggle for Employee-role users (management roles auto-unlock)
    ...(!isAutoUnlocked ? [{
      label: isManagerUnlocked ? 'Lock Manager Access' : 'Manager Login',
      onPress: isManagerUnlocked ? confirmLockManager : () => setShowManagerModal(true),
      color: isManagerUnlocked ? colors.warning : colors.primary,
    }] : []),
    {
      label: 'Sign Out',
      onPress: confirmLogout,
      color: colors.danger,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileRole}>{user?.role ?? 'Employee'}</Text>
          </View>
          {isManagerUnlocked && (
            <View style={styles.managerBadge}>
              <Text style={styles.managerBadgeText}>
                {managerRole === 'Site Manager' ? 'SITE MGR'
                  : managerRole === 'Assistant Site Manager' ? 'ASST MGR'
                  : managerRole === 'Supervisor' ? 'SUPERVISOR'
                  : 'MANAGER'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          {rows.map(r => (
            <TouchableOpacity key={r.label} style={styles.row} onPress={r.onPress} activeOpacity={0.7}>
              <Text style={[styles.rowLabel, { color: r.color }]}>{r.label}</Text>
              <Text style={styles.rowArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.version}>Longhorn Car Wash v1.0</Text>
      </ScrollView>

      {/* Manager Login Modal */}
      <Modal visible={showManagerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manager Login</Text>

            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={colors.textMuted}
              value={mgUsername}
              onChangeText={setMgUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={mgPassword}
              onChangeText={setMgPassword}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowManagerModal(false); setMgUsername(''); setMgPassword(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleManagerLogin} disabled={loading}>
                {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitBtnText}>Login</Text>}
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
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: font.lg, fontWeight: '700' },
  profileName: { fontSize: font.md, fontWeight: '700', color: colors.text },
  profileRole: { fontSize: font.sm, color: colors.textMuted, textTransform: 'capitalize' },
  managerBadge: {
    marginLeft: 'auto',
    backgroundColor: colors.warning + '22',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  managerBadgeText: { color: colors.warning, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: font.base, fontWeight: '600' },
  rowArrow: { color: colors.textMuted, fontSize: font.lg },
  version: { color: colors.textMuted, fontSize: font.sm, textAlign: 'center', marginTop: spacing.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  modalTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: font.base,
  },
  modalButtons: { flexDirection: 'row', gap: spacing.sm },
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
