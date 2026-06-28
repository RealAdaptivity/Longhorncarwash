import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, font } from '../theme';

interface PinPadProps {
  onSubmit: (pin: string) => void;
  loading?: boolean;
  label?: string;
}

const KEYS = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];

export function PinPad({ onSubmit, loading, label }: PinPadProps) {
  const [pin, setPin] = useState('');

  function handleKey(key: string) {
    if (loading) return;
    if (key === '⌫') {
      setPin(p => p.slice(0, -1));
    } else if (key === '✓') {
      if (pin.length === 4) {
        onSubmit(pin);
        setPin('');
      }
    } else if (pin.length < 4) {
      const next = pin + key;
      setPin(next);
      if (next.length === 4) {
        onSubmit(next);
        setPin('');
      }
    }
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.dots}>
        {[0,1,2,3].map(i => (
          <View key={i} style={[styles.dot, pin.length > i && styles.dotFilled]} />
        ))}
      </View>
      <View style={styles.grid}>
        {KEYS.map(key => (
          <TouchableOpacity
            key={key}
            style={[
              styles.key,
              key === '✓' && styles.keySubmit,
              key === '⌫' && styles.keyClear,
            ]}
            onPress={() => handleKey(key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, key === '✓' && styles.keySubmitText]}>
              {key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  label: {
    color: colors.textMuted,
    fontSize: font.sm,
    marginBottom: spacing.lg,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.border,
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  key: {
    width: 82,
    height: 64,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyClear: {
    backgroundColor: colors.card,
  },
  keySubmit: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  keyText: {
    color: colors.text,
    fontSize: font.xl,
    fontWeight: '600',
  },
  keySubmitText: {
    color: colors.white,
  },
});
