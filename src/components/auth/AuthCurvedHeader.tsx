import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { clamp } from '@/lib/responsive';
import { FontFamily, TouchTarget } from '@/theme/tokens';

interface AuthCurvedHeaderProps {
  title: string;
  subtitle: string;
  compact?: boolean;
  onBack: () => void;
}

function SmartFinanceEmblem() {
  return (
    <Svg width={46} height={46} viewBox="0 0 46 46">
      <Rect width={46} height={46} rx={15} fill="rgba(255,255,255,0.18)" />
      <Path
        d="M14 17.5C14 15.843 15.343 14.5 17 14.5H28.5C29.881 14.5 31 15.619 31 17V18.5H17C15.343 18.5 14 19.843 14 21.5V17.5Z"
        fill="#FFFFFF"
        opacity={0.85}
      />
      <Path
        d="M14 20.5C14 19.395 14.895 18.5 16 18.5H30C31.105 18.5 32 19.395 32 20.5V29.5C32 30.605 31.105 31.5 30 31.5H16C14.895 31.5 14 30.605 14 29.5V20.5Z"
        fill="#FFFFFF"
      />
      <Rect x={25.5} y={23} width={6.5} height={4} rx={2} fill="#2563EB" />
    </Svg>
  );
}

export function AuthCurvedHeader({
  title,
  subtitle,
  compact = false,
  onBack,
}: AuthCurvedHeaderProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const headerHeight = compact
    ? clamp(Math.round(height * 0.23), 155, 215)
    : clamp(Math.round(height * 0.28), 185, 250);

  return (
    <View style={[styles.container, { height: headerHeight }]}>
      <LinearGradient
        colors={['#4B89FF', '#3B7AF5', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { paddingTop: Math.max(insets.top, 12) }]}
      >
        {/* Translucent decorative SVG wave layers */}
        <Svg
          width={width}
          height={headerHeight}
          viewBox="0 0 375 260"
          preserveAspectRatio="none"
          style={styles.bgWaves}
        >
          <Path
            d="M0 165 C75 125, 165 205, 250 155 C305 122, 345 145, 375 130 L375 260 L0 260 Z"
            fill="rgba(255,255,255,0.08)"
          />
          <Path
            d="M0 198 C95 170, 180 225, 275 185 C325 164, 355 178, 375 170 L375 260 L0 260 Z"
            fill="rgba(255,255,255,0.06)"
          />
        </Svg>

        <View style={styles.topNav}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        </View>

        <View style={[styles.centerContent, compact && styles.centerCompact]}>
          <SmartFinanceEmblem />
          <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* Smooth organic white wave transition into form area */}
        <Svg
          width={width}
          height={34}
          viewBox="0 0 375 34"
          preserveAspectRatio="none"
          style={styles.bottomCurve}
        >
          <Path
            d="M0 24 Q94 0 187.5 16 T375 12 L375 34 L0 34 Z"
            fill="#FFFFFF"
          />
        </Svg>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    position: 'relative',
  },
  bgWaves: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topNav: {
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  backBtn: {
    width: TouchTarget.minSize,
    height: TouchTarget.minSize,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 28,
    gap: 8,
  },
  centerCompact: {
    paddingBottom: 24,
    gap: 6,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 26,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginTop: 4,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 24,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },
  bottomCurve: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
  },
});
