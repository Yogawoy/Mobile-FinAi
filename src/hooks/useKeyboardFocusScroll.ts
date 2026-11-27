import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextInputProps,
} from 'react-native';

export interface MeasurableTarget {
  measureInWindow?: (
    callback: (x: number, y: number, width: number, height: number) => void
  ) => void;
}

export type FocusScrollTarget =
  | Parameters<NonNullable<TextInputProps['onFocus']>>[0]
  | React.RefObject<MeasurableTarget | null>
  | MeasurableTarget
  | null
  | undefined;

interface UseKeyboardFocusScrollOptions {
  stickyBottomHeight?: number;
  breathingRoom?: number;
}

export interface KeyboardFocusScrollController {
  scrollViewRef: React.RefObject<ComponentRef<typeof ScrollView> | null>;
  keyboardHeight: number;
  scrollToInput: (target: FocusScrollTarget) => void;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export const KeyboardFocusScrollContext =
  createContext<KeyboardFocusScrollController | null>(null);

export function useKeyboardFocusScrollContext() {
  return useContext(KeyboardFocusScrollContext);
}

function extractMeasurable(target: FocusScrollTarget): MeasurableTarget | null {
  if (!target) return null;
  if ('currentTarget' in target && target.currentTarget) {
    return target.currentTarget as unknown as MeasurableTarget;
  }
  if ('target' in target && target.target && typeof target.target === 'object') {
    return target.target as unknown as MeasurableTarget;
  }
  if ('current' in target) {
    return target.current ?? null;
  }
  if ('measureInWindow' in target) {
    return target;
  }
  return null;
}

export function useKeyboardFocusScroll(
  options: UseKeyboardFocusScrollOptions = {}
): KeyboardFocusScrollController {
  const { stickyBottomHeight = 0, breathingRoom = 32 } = options;

  const scrollViewRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFocusedRef = useRef<MeasurableTarget | null>(null);

  const performMeasureAndScroll = useCallback(
    (measurable: MeasurableTarget | null, kbHeight: number) => {
      if (!measurable || typeof measurable.measureInWindow !== 'function') {
        return;
      }
      const sv = scrollViewRef.current as unknown as
        | (MeasurableTarget & {
            scrollTo?: (opts: { y: number; animated?: boolean }) => void;
          })
        | null;
      if (!sv) return;

      const windowHeight = Dimensions.get('window').height;
      const effectiveKb =
        kbHeight > 0 ? kbHeight : Math.round(windowHeight * 0.36);

      const measureAndAdjust = (svTop: number, svBottom: number) => {
        try {
          measurable.measureInWindow?.((_x, y, _w, h) => {
            if (typeof y !== 'number' || typeof h !== 'number') return;
            const safeBottom =
              Math.min(svBottom, windowHeight - effectiveKb) -
              stickyBottomHeight -
              breathingRoom;
            const inputBottom = y + h;

            if (inputBottom > safeBottom) {
              const delta = inputBottom - safeBottom;
              sv.scrollTo?.({
                y: Math.max(0, scrollOffsetRef.current + delta),
                animated: true,
              });
            } else if (y < svTop + 16) {
              const deltaUp = svTop + 16 - y;
              sv.scrollTo?.({
                y: Math.max(0, scrollOffsetRef.current - deltaUp),
                animated: true,
              });
            }
          });
        } catch {
          // Ignore measurement errors on unmounted nodes
        }
      };

      try {
        if (typeof sv.measureInWindow === 'function') {
          sv.measureInWindow((_sx, sy, _sw, sh) => {
            if (typeof sy === 'number' && typeof sh === 'number' && sh > 0) {
              measureAndAdjust(sy, sy + sh);
            } else {
              measureAndAdjust(64, windowHeight);
            }
          });
        } else {
          measureAndAdjust(64, windowHeight);
        }
      } catch {
        measureAndAdjust(64, windowHeight);
      }
    },
    [breathingRoom, stickyBottomHeight]
  );

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const nextHeight = e.endCoordinates?.height ?? 0;
      keyboardHeightRef.current = nextHeight;
      setKeyboardHeight(nextHeight);

      if (lastFocusedRef.current) {
        if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = setTimeout(() => {
          performMeasureAndScroll(lastFocusedRef.current, nextHeight);
        }, 160);
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
      lastFocusedRef.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, [performMeasureAndScroll]);

  const scrollToInput = useCallback(
    (target: FocusScrollTarget) => {
      const measurable = extractMeasurable(target);
      if (!measurable) return;
      lastFocusedRef.current = measurable;

      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      const delay = Platform.OS === 'android' ? 180 : 80;
      pendingTimerRef.current = setTimeout(() => {
        performMeasureAndScroll(measurable, keyboardHeightRef.current);
      }, delay);
    },
    [performMeasureAndScroll]
  );

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  return {
    scrollViewRef,
    keyboardHeight,
    scrollToInput,
    onScroll,
  };
}
