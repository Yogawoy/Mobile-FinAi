import React, { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeftRight, Home, PieChart, Sparkles, Wallet } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useFinance } from '@/context/FinanceContext';
import { Colors, FontFamily, Motion } from '@/theme/tokens';

const AI_BTN_SIZE = 60;
const AI_PROTRUDE = 26;

function buildNotchPaths(width: number, totalHeight: number) {
  const r = 22;
  const cx = width / 2;
  const mouthHalf = 52;
  const depth = 40;

  const topEdge = [
    `M 0 ${r}`,
    `Q 0 0 ${r} 0`,
    `L ${cx - mouthHalf} 0`,
    `C ${cx - 36} 0, ${cx - 34} ${depth}, ${cx} ${depth}`,
    `C ${cx + 34} ${depth}, ${cx + 36} 0, ${cx + mouthHalf} 0`,
    `L ${width - r} 0`,
    `Q ${width} 0 ${width} ${r}`,
  ].join(' ');

  const fillPath = `${topEdge} L ${width} ${totalHeight} L 0 ${totalHeight} Z`;

  return { fillPath, strokePath: topEdge };
}

interface SideTabItemProps {
  routeName: string;
  label: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function SideTabItem({
  routeName,
  label,
  isFocused,
  onPress,
  onLongPress,
}: SideTabItemProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const color = isFocused ? Colors.primary : Colors.textMuted;

  const renderIcon = () => {
    switch (routeName) {
      case 'index':
        return <Home size={22} color={color} strokeWidth={1.85} />;
      case 'transactions':
        return <ArrowLeftRight size={22} color={color} strokeWidth={1.85} />;
      case 'wallets':
        return <Wallet size={22} color={color} strokeWidth={1.85} />;
      case 'budgets':
        return <PieChart size={22} color={color} strokeWidth={1.85} />;
      default:
        return <Home size={22} color={color} strokeWidth={1.85} />;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        if (!reducedMotion) {
          scale.value = withTiming(0.93, { duration: Motion.pressMs });
        }
      }}
      onPressOut={() => {
        if (!reducedMotion) {
          scale.value = withTiming(1, { duration: Motion.pressMs });
        }
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      style={styles.sideTab}
    >
      <Animated.View style={[styles.sideTabInner, animatedStyle]}>
        {renderIcon()}
        <Text
          maxFontSizeMultiplier={1.15}
          style={[
            styles.sideLabel,
            {
              color,
              fontFamily: isFocused ? FontFamily.semibold : FontFamily.medium,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export interface CurvedTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string }>;
  };
  descriptors?: Record<
    string,
    { options?: { title?: string; tabBarLabel?: unknown } }
  >;
  navigation?: {
    emit?: (event: {
      type: string;
      target?: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented?: boolean };
    navigate?: (name: string) => void;
  };
}

export function CurvedBottomTabBar({
  state,
  descriptors,
  navigation,
}: CurvedTabBarProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { registerAiButtonRect } = useFinance();
  const aiBtnRef = useRef<ComponentRef<typeof View>>(null);
  const aiScale = useSharedValue(1);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const measureAiButton = useCallback(() => {
    requestAnimationFrame(() => {
      aiBtnRef.current?.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0) {
          registerAiButtonRect({ x, y, width: w, height: h });
        }
      });
    });
  }, [registerAiButtonRect]);

  useEffect(() => {
    const timer = setTimeout(measureAiButton, 120);
    return () => clearTimeout(timer);
  }, [width, insets.bottom, measureAiButton]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const bottomInset = Math.max(insets.bottom, 8);
  const barHeight = 68 + bottomInset;
  const wrapperHeight = barHeight + AI_PROTRUDE + 6;
  const { fillPath, strokePath } = buildNotchPaths(width, barHeight);

  const aiAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: aiScale.value }],
  }));

  if (isKeyboardVisible) {
    return null;
  }

  const navigateToRoute = (routeKey: string, routeName: string, isFocused: boolean) => {
    const event = navigation?.emit?.({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!isFocused && !event?.defaultPrevented) {
      if (navigation?.navigate) {
        navigation.navigate(routeName);
      } else {
        const targetPath = routeName === 'index' ? '/(tabs)' : `/(tabs)/${routeName}`;
        router.navigate(targetPath as never);
      }
    }
  };

  const getRouteMeta = (name: string) => {
    const idx = state.routes.findIndex((r) => r.name === name);
    if (idx === -1) return null;
    const route = state.routes[idx];
    const options = descriptors?.[route.key]?.options;
    const label =
      typeof options?.tabBarLabel === 'string'
        ? options.tabBarLabel
        : options?.title ?? route.name;
    return {
      route,
      label,
      isFocused: state.index === idx,
    };
  };

  const leftRoutes = [getRouteMeta('index'), getRouteMeta('transactions')].filter(Boolean);
  const rightRoutes = [getRouteMeta('wallets'), getRouteMeta('budgets')].filter(Boolean);
  const aiMeta = getRouteMeta('ai');

  return (
    <View style={[styles.wrapper, { height: wrapperHeight }]} pointerEvents="box-none">
      {/* Curved White SVG Surface + Top Stroke */}
      <View style={[styles.svgShadowWrap, { width, height: barHeight }]} pointerEvents="none">
        <Svg width={width} height={barHeight}>
          <Path d={fillPath} fill="#FFFFFF" />
          <Path d={strokePath} stroke="#E8EDF5" strokeWidth={1} fill="none" />
        </Svg>
      </View>

      {/* 4 Side Tabs Row */}
      <View
        style={[styles.tabsRow, { height: barHeight, paddingBottom: bottomInset }]}
        pointerEvents="box-none"
      >
        <View style={styles.sideGroup}>
          {leftRoutes.map((meta) =>
            meta ? (
              <SideTabItem
                key={meta.route.key}
                routeName={meta.route.name}
                label={meta.label}
                isFocused={meta.isFocused}
                onPress={() =>
                  navigateToRoute(meta.route.key, meta.route.name, meta.isFocused)
                }
                onLongPress={() =>
                  navigation?.emit?.({ type: 'tabLongPress', target: meta.route.key })
                }
              />
            ) : null
          )}
        </View>

        <View style={styles.centerSpacer} pointerEvents="none" />

        <View style={styles.sideGroup}>
          {rightRoutes.map((meta) =>
            meta ? (
              <SideTabItem
                key={meta.route.key}
                routeName={meta.route.name}
                label={meta.label}
                isFocused={meta.isFocused}
                onPress={() =>
                  navigateToRoute(meta.route.key, meta.route.name, meta.isFocused)
                }
                onLongPress={() =>
                  navigation?.emit?.({ type: 'tabLongPress', target: meta.route.key })
                }
              />
            ) : null
          )}
        </View>
      </View>

      {/* Center Floating AI Button (kept inside wrapper bounds for Android touch handling) */}
      {aiMeta ? (
        <Pressable
          onPress={() => navigateToRoute(aiMeta.route.key, aiMeta.route.name, aiMeta.isFocused)}
          onLongPress={() =>
            navigation?.emit?.({ type: 'tabLongPress', target: aiMeta.route.key })
          }
          onPressIn={() => {
            if (!reducedMotion) {
              aiScale.value = withSpring(0.92, { damping: 14, stiffness: 260 });
            }
          }}
          onPressOut={() => {
            if (!reducedMotion) {
              aiScale.value = withSpring(1, { damping: 14, stiffness: 260 });
            }
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: aiMeta.isFocused }}
          accessibilityLabel="Asisten AI"
          style={[styles.aiFloatingBtn, { left: width / 2 - AI_BTN_SIZE / 2 }]}
        >
          <Animated.View style={aiAnimatedStyle}>
            <View
              ref={aiBtnRef}
              collapsable={false}
              onLayout={measureAiButton}
              style={[styles.aiGradientCircle, aiMeta.isFocused && styles.aiActiveRing]}
            >
              <LinearGradient
                colors={['#4B89FF', '#3B7AF5', '#2563EB']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Sparkles size={26} color="#FFFFFF" strokeWidth={2} />
            </View>
          </Animated.View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  svgShadowWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    zIndex: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
  },
  tabsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  sideGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerSpacer: {
    width: 84,
  },
  sideTab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideTabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sideLabel: {
    fontSize: 11,
  },
  aiFloatingBtn: {
    position: 'absolute',
    top: 6,
    width: AI_BTN_SIZE,
    height: AI_BTN_SIZE,
    zIndex: 20,
    elevation: 10,
    borderRadius: AI_BTN_SIZE / 2,
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  aiGradientCircle: {
    width: AI_BTN_SIZE,
    height: AI_BTN_SIZE,
    borderRadius: AI_BTN_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiActiveRing: {
    borderWidth: 2.5,
    borderColor: '#DBEAFE',
  },
});
