import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FontFamily } from '@/theme/tokens';

interface FinAiLogoMarkProps {
  size?: number;
}

/**
 * Geometric 3-ribbon hexagon mark with negative-space "Y" in FinAI blue spectrum.
 */
export function FinAiLogoMark({ size = 34 }: FinAiLogoMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* Top chevron — Deep Cobalt */}
      <Path
        d="M6 14.5 L24 4 L42 14.5 L35 18.5 L24 12 L13 18.5 Z"
        fill="#001AE6"
      />
      {/* Bottom-left ribbon — Bright Cyan */}
      <Path
        d="M6 18.5 L13 22.5 L13 30.5 L22 35.5 L22 43.5 L6 34.5 Z"
        fill="#0EB8FF"
      />
      {/* Bottom-right ribbon — Royal Azure */}
      <Path
        d="M42 18.5 L42 34.5 L26 43.5 L26 35.5 L35 30.5 L35 22.5 Z"
        fill="#1677FF"
      />
    </Svg>
  );
}

interface FinAiBrandLockupProps {
  size?: 'sm' | 'md';
  textColor?: string;
}

export function FinAiBrandLockup({
  size = 'md',
  textColor = '#FFFFFF',
}: FinAiBrandLockupProps) {
  const iconSize = size === 'sm' ? 24 : 30;
  return (
    <View style={styles.lockup}>
      <View style={[styles.badge, size === 'sm' && styles.badgeSm]}>
        <FinAiLogoMark size={iconSize} />
      </View>
      <Text
        style={[
          styles.wordmark,
          size === 'sm' && styles.wordmarkSm,
          { color: textColor },
        ]}
      >
        FinAI
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 5,
  },
  badgeSm: {
    width: 36,
    height: 36,
    borderRadius: 11,
  },
  wordmark: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    letterSpacing: -0.4,
  },
  wordmarkSm: {
    fontSize: 17,
  },
});
