import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { FinAiBrandLockup } from '@/components/brand/FinAiLogo';
import { clamp } from '@/lib/responsive';
import { FontFamily, TouchTarget } from '@/theme/tokens';

const ENTRANCE_EASING = Easing.bezier(0.22, 1, 0.36, 1);

interface AuthCurvedHeaderProps {
  title: string;
  subtitle: string;
  compact?: boolean;
  modeKey?: string;
  onBack: () => void;
}

function SmartFinanceEmblem({ compact }: { compact?: boolean }) {
  return <FinAiBrandLockup size={compact ? 'sm' : 'md'} textColor="#FFFFFF" />;
}

export function AuthCurvedHeader({
  title,
  subtitle,
  compact = false,
  modeKey,
  onBack,
}: AuthCurvedHeaderProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const isShortHeight = height <= 680;

  const baseHeight = compact
    ? isShortHeight
      ? 184
      : clamp(Math.round(height * 0.24), 195, 215)
    : isShortHeight
      ? 216
      : clamp(Math.round(height * 0.29), 240, 260);

  const targetHeight = Math.max(baseHeight, insets.top + (compact ? 156 : 186));

  const animatedHeight = useSharedValue(targetHeight);

  useEffect(() => {
    animatedHeight.value = withTiming(targetHeight, {
      duration: reducedMotion ? 0 : 360,
      easing: ENTRANCE_EASING,
    });
  }, [targetHeight, reducedMotion, animatedHeight]);

  const containerAnimStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimStyle]}>
      <LinearGradient
        colors={['#38BDF8', '#3B7AF5', '#2563EB', '#1E3A8A']}
        locations={[0, 0.34, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Bold ambient studio glow & translucent decorative SVG wave layers */}
        <Svg
          width={width}
          height={270}
          viewBox="0 0 375 260"
          preserveAspectRatio="none"
          style={styles.bgWaves}
        >
          <Defs>
            <RadialGradient id="topGlow" cx="84%" cy="22%" r="60%">
              <Stop offset="0%" stopColor="#7DD3FC" stopOpacity={0.46} />
              <Stop offset="55%" stopColor="#38BDF8" stopOpacity={0.18} />
              <Stop offset="100%" stopColor="#3B7AF5" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="leftGlow" cx="14%" cy="48%" r="52%">
              <Stop offset="0%" stopColor="#93C5FD" stopOpacity={0.3} />
              <Stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={375} height={260} fill="url(#topGlow)" />
          <Rect x={0} y={0} width={375} height={260} fill="url(#leftGlow)" />
          <Circle cx={322} cy={44} r={78} fill="rgba(255,255,255,0.09)" />
          <Path
            d="M0 165 C75 125, 165 205, 250 155 C305 122, 345 145, 375 130 L375 260 L0 260 Z"
            fill="rgba(255,255,255,0.13)"
          />
          <Path
            d="M0 198 C95 170, 180 225, 275 185 C325 164, 355 178, 375 170 L375 260 L0 260 Z"
            fill="rgba(255,255,255,0.07)"
          />
        </Svg>

        <Pressable
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          style={({ pressed }) => [
            styles.backBtn,
            { top: insets.top + 8 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2} />
        </Pressable>

        <View
          style={[
            styles.centerContent,
            { paddingTop: insets.top + (compact ? 10 : 14) },
            compact && styles.centerCompact,
            isShortHeight && styles.centerShort,
          ]}
        >
          <SmartFinanceEmblem compact={compact} />
          <Animated.View
            key={modeKey ?? title}
            entering={FadeIn.duration(240)}
            exiting={FadeOut.duration(160)}
            style={styles.textBlock}
          >
            <Text
              style={[
                styles.title,
                compact && styles.titleCompact,
                isShortHeight && styles.titleShort,
              ]}
            >
              {title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </Animated.View>
        </View>

        {/* Seamless white wave transition */}
        <Svg
          width={width + 2}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
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
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: TouchTarget.minSize,
    height: TouchTarget.minSize,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    flex: 1,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 6,
  },
  centerCompact: {
    paddingBottom: 38,
    gap: 4,
  },
  centerShort: {
    paddingBottom: 36,
    gap: 3,
  },
  textBlock: {
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 25,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginTop: 2,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 23,
  },
  titleShort: {
    fontSize: 22,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  bottomCurve: {
    position: 'absolute',
    bottom: -1,
    left: -1,
    zIndex: 3,
  },
});
