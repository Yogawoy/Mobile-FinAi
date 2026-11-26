import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet } from 'lucide-react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Colors, FontFamily, Motion, Radius } from '@/theme/tokens';

interface AnimatedSplashProps {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const reducedMotion = useReducedMotion();

  const containerOpacity = useSharedValue(1);
  const logoScale = useSharedValue(reducedMotion ? 1 : 0.85);
  const logoOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const textOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const textTranslateY = useSharedValue(reducedMotion ? 0 : 10);

  useEffect(() => {
    if (!reducedMotion) {
      logoScale.value = withTiming(1, {
        duration: Motion.splashEnterMs,
        easing: Motion.easeOutCubic,
      });
      logoOpacity.value = withTiming(1, {
        duration: Motion.splashEnterMs,
        easing: Motion.easeOutCubic,
      });
      textOpacity.value = withDelay(
        Motion.splashTextDelayMs,
        withTiming(1, {
          duration: Motion.splashTextMs,
          easing: Motion.easeOutCubic,
        })
      );
      textTranslateY.value = withDelay(
        Motion.splashTextDelayMs,
        withTiming(0, {
          duration: Motion.splashTextMs,
          easing: Motion.easeOutCubic,
        })
      );
    }

    const timer = setTimeout(() => {
      containerOpacity.value = withTiming(
        0,
        {
          duration: Motion.splashExitMs,
          easing: Motion.easeOutCubic,
        },
        (finished) => {
          if (finished) {
            runOnJS(onFinish)();
          }
        }
      );
    }, Motion.splashHoldMs);

    return () => clearTimeout(timer);
  }, [containerOpacity, logoOpacity, logoScale, onFinish, reducedMotion, textOpacity, textTranslateY]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <Animated.View style={[styles.overlay, containerStyle]} pointerEvents="auto">
      <LinearGradient
        colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.center}>
          <Animated.View style={[styles.logoEmblem, logoStyle]}>
            <Wallet size={36} color={Colors.primary} strokeWidth={1.75} />
          </Animated.View>

          <Animated.View style={[styles.textBlock, textStyle]}>
            <Text style={styles.brandTitle}>Smart Finance</Text>
            <Text style={styles.brandSubtitle}>Keuangan Pribadi Berbasis AI</Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  center: {
    alignItems: 'center',
  },
  logoEmblem: {
    width: 76,
    height: 76,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 6,
  },
  textBlock: {
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  brandTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 26,
    color: Colors.surface,
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: 0.1,
  },
});
