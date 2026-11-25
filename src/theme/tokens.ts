import { Easing } from 'react-native-reanimated';

export const Colors = {
  canvas: '#F5F7FB',
  surface: '#FFFFFF',
  border: '#E8EDF5',

  primary: '#3B7AF5',
  primaryDark: '#2563EB',
  primaryLight: '#4B89FF',
  primarySoft: '#EBF2FF',

  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  dotInactive: '#CBD5E1',

  income: '#10B981',
  incomeSoft: '#ECFDF5',
  incomeText: '#047857',

  expense: '#EF4444',
  expenseSoft: '#FEF2F2',
  expenseText: '#DC2626',

  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  warningText: '#B45309',
} as const;

export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const Typography = {
  tabularNums: {
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  full: 999,
} as const;

export const TouchTarget = {
  minSize: 44,
} as const;

export const Motion = {
  splashEnterMs: 550,
  splashTextDelayMs: 200,
  splashTextMs: 450,
  splashHoldMs: 1800,
  splashExitMs: 350,
  pressMs: 120,
  easeOutCubic: Easing.out(Easing.cubic),
} as const;
