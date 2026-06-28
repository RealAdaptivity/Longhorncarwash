import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PinPad } from '../components/PinPad';
import { useAuth } from '../context/AuthContext';
import { colors, font, spacing } from '../theme';

export function PinScreen() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handlePin(pin: string) {
    setLoading(true);
    const result = await login(pin);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Error', result.error ?? 'Invalid PIN');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>LONGHORN</Text>
        <Text style={styles.subtitle}>Car Wash</Text>
        <View style={styles.divider} />
        <PinPad onSubmit={handlePin} loading={loading} label="Enter your PIN" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: font.xxxl,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: font.lg,
    color: colors.textMuted,
    letterSpacing: 2,
    marginTop: spacing.xs,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginVertical: spacing.xl,
  },
});
