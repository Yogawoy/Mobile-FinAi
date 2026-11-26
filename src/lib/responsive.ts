import { useWindowDimensions } from 'react-native';

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  return {
    width,
    height,
    isSmallWidth: width < 375,
    isShortHeight: height < 700,
    isLargeWidth: width >= 420,
    horizontalPadding: width < 375 ? 14 : 16,
    clamp,
  };
}
