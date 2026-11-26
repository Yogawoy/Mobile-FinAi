import React, { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TutorialTargetRect } from '@/context/FinanceContext';
import { FontFamily, Typography } from '@/theme/tokens';

export interface CoachMarkStep {
  key: string;
  title: string;
  description: string;
}

interface CoachMarkOverlayProps {
  visible: boolean;
  stepIndex: number;
  totalSteps: number;
  step: CoachMarkStep;
  targetRect: TutorialTargetRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function CoachMarkOverlay({
  visible,
  stepIndex,
  totalSteps,
  step,
  targetRect,
  onNext,
  onPrev,
  onSkip,
}: CoachMarkOverlayProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const overlayRef = useRef<ComponentRef<typeof View>>(null);
  const [overlayOrigin, setOverlayOrigin] = useState({ x: 0, y: 0 });
  const [overlayHeight, setOverlayHeight] = useState(screenHeight);

  const pulseOpacity = useSharedValue(0.9);

  const measureOverlayOrigin = useCallback(() => {
    requestAnimationFrame(() => {
      overlayRef.current?.measureInWindow((ox, oy, _w, oh) => {
        setOverlayOrigin({ x: ox, y: oy });
        if (oh > 0) setOverlayHeight(oh);
      });
    });
  }, []);

  useEffect(() => {
    if (!visible) return;
    measureOverlayOrigin();
  }, [visible, stepIndex, targetRect, measureOverlayOrigin]);

  useEffect(() => {
    if (!visible || reducedMotion) return;
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.95, { duration: 900, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [visible, reducedMotion, pulseOpacity]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  if (!visible || !step) return null;

  const containerH = overlayHeight > 0 ? overlayHeight : screenHeight;

  let spot: {
    x: number;
    y: number;
    width: number;
    height: number;
    borderRadius: number;
  } | null = null;

  if (targetRect && targetRect.width > 0 && targetRect.height > 0) {
    const pad = targetRect.padding ?? 8;
    const x = Math.max(0, targetRect.x - overlayOrigin.x - pad);
    const y = Math.max(0, targetRect.y - overlayOrigin.y - pad);
    const width = Math.min(screenWidth - x, targetRect.width + pad * 2);
    const height = targetRect.height + pad * 2;
    const borderRadius = targetRect.isCircle
      ? width / 2
      : (targetRect.borderRadius ?? 16);

    if (width > 0 && height > 0) {
      spot = { x, y, width, height, borderRadius };
    }
  }

  const horizontalMargin = screenWidth < 375 ? 14 : 16;
  const isLastStep = stepIndex >= totalSteps - 1;

  const tooltipPositionStyle = spot
    ? spot.y + spot.height + 210 < containerH
      ? { top: spot.y + spot.height + 14 }
      : { bottom: Math.max(insets.bottom + 14, containerH - spot.y + 14) }
    : { top: Math.max(insets.top + 60, containerH * 0.34) };

  return (
    <View
      ref={overlayRef}
      collapsable={false}
      onLayout={measureOverlayOrigin}
      style={[StyleSheet.absoluteFill, styles.root]}
    >
      {spot ? (
        <>
          {/* 4-View Dark Backdrop around spotlight cutout */}
          <View
            pointerEvents="auto"
            style={[
              styles.backdropPanel,
              { top: 0, left: 0, right: 0, height: Math.max(0, spot.y) },
            ]}
          />
          <View
            pointerEvents="auto"
            style={[
              styles.backdropPanel,
              { top: spot.y + spot.height, left: 0, right: 0, bottom: 0 },
            ]}
          />
          <View
            pointerEvents="auto"
            style={[
              styles.backdropPanel,
              {
                top: spot.y,
                left: 0,
                width: Math.max(0, spot.x),
                height: spot.height,
              },
            ]}
          />
          <View
            pointerEvents="auto"
            style={[
              styles.backdropPanel,
              {
                top: spot.y,
                left: spot.x + spot.width,
                right: 0,
                height: spot.height,
              },
            ]}
          />

          {/* Subtle Blue Spotlight Frame */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.spotlightFrame,
              {
                top: spot.y,
                left: spot.x,
                width: spot.width,
                height: spot.height,
                borderRadius: spot.borderRadius,
              },
              haloStyle,
            ]}
          />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.backdropPanel]} />
      )}

      {/* Floating Tooltip Card */}
      <Animated.View
        key={step.key}
        entering={FadeIn.duration(200).easing(Easing.out(Easing.cubic))}
        style={[
          styles.tooltipCard,
          {
            left: horizontalMargin,
            right: horizontalMargin,
          },
          tooltipPositionStyle,
        ]}
      >
        <View style={styles.tooltipHeader}>
          <View style={styles.stepPill}>
            <Text style={[styles.stepPillText, Typography.tabularNums]}>
              {stepIndex + 1} dari {totalSteps}
            </Text>
          </View>

          <Pressable
            onPress={onSkip}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Lewati panduan"
            style={({ pressed }) => [
              styles.skipBtn,
              pressed && { opacity: 0.65 },
            ]}
          >
            <Text style={styles.skipText}>Lewati</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>

        <View style={styles.footerRow}>
          <View style={styles.dotsRow}>
            {Array.from({ length: totalSteps }).map((_, idx) => {
              const active = idx === stepIndex;
              return (
                <View
                  key={idx}
                  style={[styles.dot, active ? styles.dotActive : styles.dotIdle]}
                />
              );
            })}
          </View>

          <View style={styles.actionsRow}>
            {stepIndex > 0 ? (
              <Pressable
                onPress={onPrev}
                accessibilityRole="button"
                accessibilityLabel="Langkah sebelumnya"
                style={({ pressed }) => [
                  styles.backBtn,
                  pressed && { opacity: 0.72 },
                ]}
              >
                <Text style={styles.backBtnText}>Kembali</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={onNext}
              accessibilityRole="button"
              accessibilityLabel={isLastStep ? 'Mulai!' : 'Lanjut'}
              style={({ pressed }) => [
                styles.nextBtn,
                pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
              ]}
            >
              <Text style={styles.nextBtnText}>
                {isLastStep ? 'Mulai!' : 'Lanjut'}
              </Text>
              {!isLastStep ? (
                <ArrowRight size={15} color="#FFFFFF" strokeWidth={2.3} />
              ) : null}
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 999,
    elevation: 999,
  },
  backdropPanel: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
  },
  spotlightFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#60A5FA',
  },
  tooltipCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 16,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepPill: {
    backgroundColor: '#EBF2FF',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepPillText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: '#3B7AF5',
  },
  skipBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  skipText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#64748B',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 15.5,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  description: {
    marginTop: 6,
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#475569',
  },
  footerRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 99,
  },
  dotActive: {
    width: 16,
    backgroundColor: '#3B7AF5',
  },
  dotIdle: {
    width: 6,
    backgroundColor: '#CBD5E1',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#475569',
  },
  nextBtn: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: '#3B7AF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
