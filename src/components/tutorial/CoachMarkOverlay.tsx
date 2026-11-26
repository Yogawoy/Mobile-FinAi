import React, { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
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

const MORPH_EASING = Easing.bezier(0.22, 1, 0.36, 1);

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
  const [tooltipHeight, setTooltipHeight] = useState(182);
  const [hasInitializedSpot, setHasInitializedSpot] = useState(false);

  const isClosingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SharedValues for 60fps spotlight morphing & tooltip glide
  const animX = useSharedValue(0);
  const animY = useSharedValue(0);
  const animW = useSharedValue(0);
  const animH = useSharedValue(0);
  const animR = useSharedValue(16);
  const tooltipTop = useSharedValue(Math.max(insets.top + 60, screenHeight * 0.34));
  const backdropOpacity = useSharedValue(0);
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
    if (!visible) {
      setHasInitializedSpot(false);
      isClosingRef.current = false;
      backdropOpacity.value = 0;
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      return;
    }
    measureOverlayOrigin();
  }, [visible, stepIndex, targetRect, measureOverlayOrigin, backdropOpacity]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

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

  useEffect(() => {
    if (!visible) return;

    if (!spot) {
      if (!hasInitializedSpot) {
        backdropOpacity.value = withTiming(1, {
          duration: reducedMotion ? 0 : 280,
          easing: Easing.out(Easing.cubic),
        });
      }
      return;
    }

    const placeBelow = spot.y + spot.height + 210 < containerH;
    const targetTooltipTop = placeBelow
      ? spot.y + spot.height + 14
      : Math.max(insets.top + 14, spot.y - tooltipHeight - 14);

    if (!hasInitializedSpot) {
      // Snap directly to Step 1 coordinates so it never jumps from (0,0)
      animX.value = spot.x;
      animY.value = spot.y;
      animW.value = spot.width;
      animH.value = spot.height;
      animR.value = spot.borderRadius;
      tooltipTop.value = targetTooltipTop;
      setHasInitializedSpot(true);
      backdropOpacity.value = withTiming(1, {
        duration: reducedMotion ? 0 : 280,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    const morphDuration = reducedMotion ? 0 : 280;
    const tooltipDuration = reducedMotion ? 0 : 260;

    animX.value = withTiming(spot.x, { duration: morphDuration, easing: MORPH_EASING });
    animY.value = withTiming(spot.y, { duration: morphDuration, easing: MORPH_EASING });
    animW.value = withTiming(spot.width, { duration: morphDuration, easing: MORPH_EASING });
    animH.value = withTiming(spot.height, { duration: morphDuration, easing: MORPH_EASING });
    animR.value = withTiming(spot.borderRadius, { duration: morphDuration, easing: MORPH_EASING });
    tooltipTop.value = withTiming(targetTooltipTop, {
      duration: tooltipDuration,
      easing: MORPH_EASING,
    });
  }, [
    visible,
    spot?.x,
    spot?.y,
    spot?.width,
    spot?.height,
    spot?.borderRadius,
    containerH,
    tooltipHeight,
    insets.top,
    hasInitializedSpot,
    reducedMotion,
    animX,
    animY,
    animW,
    animH,
    animR,
    tooltipTop,
    backdropOpacity,
  ]);

  const rootOpacityStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const topPanelStyle = useAnimatedStyle(() => ({
    height: Math.max(0, animY.value),
  }));

  const bottomPanelStyle = useAnimatedStyle(() => ({
    top: animY.value + animH.value,
  }));

  const leftPanelStyle = useAnimatedStyle(() => ({
    top: animY.value,
    height: animH.value,
    width: Math.max(0, animX.value),
  }));

  const rightPanelStyle = useAnimatedStyle(() => ({
    top: animY.value,
    height: animH.value,
    left: animX.value + animW.value,
  }));

  const frameStyle = useAnimatedStyle(() => ({
    top: animY.value,
    left: animX.value,
    width: animW.value,
    height: animH.value,
    borderRadius: animR.value,
    opacity: pulseOpacity.value,
  }));

  const tooltipPosStyle = useAnimatedStyle(() => ({
    top: tooltipTop.value,
  }));

  const triggerFadeOutAndClose = (cb: () => void) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    const duration = reducedMotion ? 0 : 220;
    backdropOpacity.value = withTiming(0, {
      duration,
      easing: Easing.in(Easing.cubic),
    });
    closeTimerRef.current = setTimeout(() => {
      cb();
    }, duration);
  };

  const handleTooltipLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - tooltipHeight) > 2) {
      setTooltipHeight(h);
    }
  };

  if (!visible || !step) return null;

  const horizontalMargin = screenWidth < 375 ? 14 : 16;
  const isLastStep = stepIndex >= totalSteps - 1;
  const showSpotlight = hasInitializedSpot || Boolean(spot);

  return (
    <Animated.View
      ref={overlayRef}
      collapsable={false}
      onLayout={measureOverlayOrigin}
      style={[StyleSheet.absoluteFill, styles.root, rootOpacityStyle]}
    >
      {showSpotlight ? (
        <>
          {/* 4-View Animated Dark Backdrop around spotlight cutout */}
          <Animated.View
            pointerEvents="auto"
            style={[
              styles.backdropPanel,
              { top: 0, left: 0, right: 0 },
              topPanelStyle,
            ]}
          />
          <Animated.View
            pointerEvents="auto"
            style={[
              styles.backdropPanel,
              { left: 0, right: 0, bottom: 0 },
              bottomPanelStyle,
            ]}
          />
          <Animated.View
            pointerEvents="auto"
            style={[styles.backdropPanel, { left: 0 }, leftPanelStyle]}
          />
          <Animated.View
            pointerEvents="auto"
            style={[styles.backdropPanel, { right: 0 }, rightPanelStyle]}
          />

          {/* Morphing Blue Spotlight Frame */}
          <Animated.View
            pointerEvents="none"
            style={[styles.spotlightFrame, frameStyle]}
          />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.backdropPanel]} />
      )}

      {/* Gliding Floating Tooltip Card */}
      <Animated.View
        onLayout={handleTooltipLayout}
        style={[
          styles.tooltipCard,
          {
            left: horizontalMargin,
            right: horizontalMargin,
          },
          tooltipPosStyle,
        ]}
      >
        <View style={styles.tooltipHeader}>
          <View style={styles.stepPill}>
            <Text style={[styles.stepPillText, Typography.tabularNums]}>
              {stepIndex + 1} dari {totalSteps}
            </Text>
          </View>

          <Pressable
            onPress={() => triggerFadeOutAndClose(onSkip)}
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

        <Animated.View key={step.key} entering={FadeIn.duration(220)}>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>
        </Animated.View>

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
              onPress={() => {
                if (isLastStep) {
                  triggerFadeOutAndClose(onNext);
                } else {
                  onNext();
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={isLastStep ? 'Mengerti, Mulai!' : 'Lanjut'}
              style={({ pressed }) => [
                styles.nextBtn,
                pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
              ]}
            >
              <Text style={styles.nextBtnText}>
                {isLastStep ? 'Mengerti, Mulai!' : 'Lanjut'}
              </Text>
              {!isLastStep ? (
                <ArrowRight size={15} color="#FFFFFF" strokeWidth={2.3} />
              ) : null}
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
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
