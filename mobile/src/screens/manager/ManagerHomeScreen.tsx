import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, font } from '../../theme';

const CARDS = [
  { title: 'Timesheet', subtitle: 'Weekly hours & punch management', screen: 'Timesheet', color: colors.primary },
  { title: 'Employees', subtitle: 'Approvals, time off, account management', screen: 'Employees', color: colors.success },
  { title: 'Payroll', subtitle: 'Biweekly & monthly payroll summary', screen: 'Payroll', color: colors.warning },
  { title: 'Digital Ops', subtitle: 'Checklists & site logs', screen: 'Ops', color: '#7c3aed' },
];

export function ManagerHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Manager Dashboard</Text>
        <Text style={styles.subtitle}>Select a section to manage</Text>

        {CARDS.map(card => (
          <TouchableOpacity
            key={card.screen}
            style={[styles.card, { borderLeftColor: card.color }]}
            onPress={() => navigation.navigate(card.screen)}
            activeOpacity={0.8}
          >
            <View style={[styles.cardAccent, { backgroundColor: card.color }]} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
            </View>
            <Text style={[styles.arrow, { color: card.color }]}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: font.sm, color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    minHeight: 80,
  },
  cardAccent: {
    width: 5,
    alignSelf: 'stretch',
  },
  cardBody: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
  cardSubtitle: { fontSize: font.sm, color: colors.textMuted },
  arrow: { fontSize: 28, paddingRight: spacing.md, fontWeight: '300' },
});
