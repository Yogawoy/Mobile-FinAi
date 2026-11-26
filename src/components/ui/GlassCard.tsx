import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { FinColors, FinRadius, FinShadow } from '@/constants/theme';

interface GlassCardProps extends ViewProps {
  padded?: boolean;
}

export function GlassCard({ children, style, padded = true, ...props }: GlassCardProps) {
  return (
    <View style={[styles.card, padded && styles.padded, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: FinColors.surface,
    borderRadius: FinRadius.lg,
    borderWidth: 1,
    borderColor: FinColors.borderSubtle,
    ...FinShadow.card,
  },
  padded: {
    padding: 16,
  },
});
