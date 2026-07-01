import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PinPad } from '../components/PinPad';
import { useAuth } from '../context/AuthContext';
import { colors, font, spacing, radius } from '../theme';

export function PinScreen() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handlePin(pin: string) {
    setLoading(true);
    const result = await login(pin);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Sign In Failed', result.error ?? 'Invalid PIN. Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/logo.webp')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Heading */}
        <View style={styles.headingWrap}>
          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.subheading}>Enter your PIN to sign in</Text>
        </View>

        {/* PIN pad */}
        <View style={styles.padWrap}>
          <PinPad onSubmit={handlePin} loading={loading} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.hint}>Forgot your PIN? Contact your manager.</Text>
          <Text style={styles.credit}>Built by RealAdaptivity LLC</Text>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  logoWrap: {
    width: '100%',
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  logo: {
    width: 240,
    height: 120,
  },
  headingWrap: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  heading: {
    fontSize: font.xxl ?? 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  subheading: {
    fontSize: font.base,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  padWrap: {
    width: '100%',
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  hint: {
    fontSize: font.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  credit: {
    fontSize: 11,
    color: colors.textMuted,
    opacity: 0.5,
    letterSpacing: 0.5,
  },
});
