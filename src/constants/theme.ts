export const FinColors = {
  canvas: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceSoft: '#F9FAFC',
  surfaceGlass: 'rgba(255, 255, 255, 0.86)',

  textPrimary: '#242636',
  textSecondary: '#757A95',
  textMuted: '#A0A4B8',

  periwinkle: '#7C7CE6',
  periwinkleDark: '#5F5ED4',
  lavender: '#E4E2FB',
  lavenderSoft: '#F3F2FF',
  iceblue: '#D6E4FA',
  iceblueText: '#3B6DB0',
  mint: '#D0EFE5',
  mintText: '#1B7354',
  peach: '#FCE2E0',
  peachText: '#B83A38',
  amberBg: '#FEF3C7',
  amberText: '#B45309',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',

  borderSubtle: 'rgba(36, 38, 54, 0.08)',
  borderCard: 'rgba(228, 226, 251, 0.9)',
} as const;

export const FinRadius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 999,
} as const;

export const FinShadow = {
  card: {
    shadowColor: '#30334A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  floating: {
    shadowColor: '#30334A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
