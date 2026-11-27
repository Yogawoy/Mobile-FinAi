export type WalletColorKey =
  | 'royal'
  | 'navy'
  | 'ocean'
  | 'teal'
  | 'emerald'
  | 'forest'
  | 'amber'
  | 'orange'
  | 'crimson'
  | 'rose'
  | 'bronze'
  | 'obsidian';

export type WalletTypeKey = 'BANK' | 'EWALLET' | 'E_WALLET' | 'SAVINGS' | 'CASH';

export interface WalletTheme {
  key: WalletColorKey;
  label: string;
  primary: string;
  secondary: string;
  gradient: [string, string, string];
  dotColor: string;
  shadowColor: string;
  subLabel: string;
}

export const WALLET_THEMES: Record<WalletColorKey, WalletTheme> = {
  royal: {
    key: 'royal',
    label: 'Royal Blue',
    primary: '#2563EB',
    secondary: '#1D4ED8',
    gradient: ['#2563EB', '#2158E1', '#1D4ED8'],
    dotColor: '#2563EB',
    shadowColor: '#1D4ED8',
    subLabel: 'DEBIT CARD',
  },
  navy: {
    key: 'navy',
    label: 'Deep Navy',
    primary: '#1E3A8A',
    secondary: '#0F172A',
    gradient: ['#1E3A8A', '#17295A', '#0F172A'],
    dotColor: '#1E3A8A',
    shadowColor: '#0F172A',
    subLabel: 'SAVINGS',
  },
  ocean: {
    key: 'ocean',
    label: 'Ocean Sky',
    primary: '#0284C7',
    secondary: '#0369A1',
    gradient: ['#0284C7', '#0276B4', '#0369A1'],
    dotColor: '#0284C7',
    shadowColor: '#0369A1',
    subLabel: 'DEBIT CARD',
  },
  teal: {
    key: 'teal',
    label: 'Teal Mint',
    primary: '#0D9488',
    secondary: '#115E59',
    gradient: ['#0D9488', '#0F7970', '#115E59'],
    dotColor: '#0D9488',
    shadowColor: '#115E59',
    subLabel: 'E-WALLET',
  },
  emerald: {
    key: 'emerald',
    label: 'Emerald',
    primary: '#059669',
    secondary: '#047857',
    gradient: ['#059669', '#048760', '#047857'],
    dotColor: '#059669',
    shadowColor: '#047857',
    subLabel: 'SAVINGS',
  },
  forest: {
    key: 'forest',
    label: 'Forest Green',
    primary: '#15803D',
    secondary: '#14532D',
    gradient: ['#15803D', '#146A35', '#14532D'],
    dotColor: '#15803D',
    shadowColor: '#14532D',
    subLabel: 'SAVINGS',
  },
  amber: {
    key: 'amber',
    label: 'Amber Gold',
    primary: '#D97706',
    secondary: '#B45309',
    gradient: ['#D97706', '#C66507', '#B45309'],
    dotColor: '#D97706',
    shadowColor: '#B45309',
    subLabel: 'DEBIT CARD',
  },
  orange: {
    key: 'orange',
    label: 'Sunset Orange',
    primary: '#EA580C',
    secondary: '#C2410C',
    gradient: ['#EA580C', '#D64C0C', '#C2410C'],
    dotColor: '#EA580C',
    shadowColor: '#C2410C',
    subLabel: 'E-WALLET',
  },
  crimson: {
    key: 'crimson',
    label: 'Crimson Red',
    primary: '#DC2626',
    secondary: '#991B1B',
    gradient: ['#DC2626', '#BA2020', '#991B1B'],
    dotColor: '#DC2626',
    shadowColor: '#991B1B',
    subLabel: 'DEBIT CARD',
  },
  rose: {
    key: 'rose',
    label: 'Rose Ruby',
    primary: '#E11D48',
    secondary: '#9F1239',
    gradient: ['#E11D48', '#C01740', '#9F1239'],
    dotColor: '#E11D48',
    shadowColor: '#9F1239',
    subLabel: 'E-WALLET',
  },
  bronze: {
    key: 'bronze',
    label: 'Warm Bronze',
    primary: '#92400E',
    secondary: '#78350F',
    gradient: ['#92400E', '#853A0E', '#78350F'],
    dotColor: '#92400E',
    shadowColor: '#78350F',
    subLabel: 'CASH',
  },
  obsidian: {
    key: 'obsidian',
    label: 'Obsidian Black',
    primary: '#1E293B',
    secondary: '#090D16',
    gradient: ['#1E293B', '#131B28', '#090D16'],
    dotColor: '#1E293B',
    shadowColor: '#090D16',
    subLabel: 'CASH',
  },
};

export const WALLET_COLOR_OPTIONS: WalletTheme[] = [
  WALLET_THEMES.royal,
  WALLET_THEMES.navy,
  WALLET_THEMES.ocean,
  WALLET_THEMES.teal,
  WALLET_THEMES.emerald,
  WALLET_THEMES.forest,
  WALLET_THEMES.amber,
  WALLET_THEMES.orange,
  WALLET_THEMES.crimson,
  WALLET_THEMES.rose,
  WALLET_THEMES.bronze,
  WALLET_THEMES.obsidian,
];

const LEGACY_HEX_TO_KEY: Record<string, WalletColorKey> = {
  '#3B7AF5': 'royal',
  '#4B89FF': 'royal',
  '#14B8A6': 'teal',
  '#1D4ED8': 'navy',
  '#475569': 'obsidian',
  '#334155': 'obsidian',
  '#10B981': 'emerald',
};

export function resolveWalletColorKey(
  color?: string | null,
  type?: WalletTypeKey
): WalletColorKey {
  if (color) {
    const trimmed = color.trim();
    const lower = trimmed.toLowerCase();
    if (lower === 'slate') return 'obsidian';
    if (lower in WALLET_THEMES) {
      return lower as WalletColorKey;
    }

    const upper = trimmed.toUpperCase();
    for (const theme of WALLET_COLOR_OPTIONS) {
      if (
        theme.primary.toUpperCase() === upper ||
        theme.secondary.toUpperCase() === upper ||
        theme.dotColor.toUpperCase() === upper
      ) {
        return theme.key;
      }
    }
    if (LEGACY_HEX_TO_KEY[upper]) {
      return LEGACY_HEX_TO_KEY[upper];
    }
  }

  switch (type) {
    case 'EWALLET':
    case 'E_WALLET':
      return 'teal';
    case 'SAVINGS':
      return 'navy';
    case 'CASH':
      return 'obsidian';
    case 'BANK':
    default:
      return 'royal';
  }
}

export function getWalletSubLabel(type: WalletTypeKey): string {
  switch (type) {
    case 'BANK':
      return 'DEBIT CARD';
    case 'EWALLET':
    case 'E_WALLET':
      return 'E-WALLET';
    case 'SAVINGS':
      return 'SAVINGS';
    case 'CASH':
      return 'CASH';
    default:
      return 'DEBIT CARD';
  }
}

export function getWalletTheme(
  type: WalletTypeKey,
  colorKey?: WalletColorKey
): WalletTheme {
  if (colorKey && WALLET_THEMES[colorKey]) {
    return {
      ...WALLET_THEMES[colorKey],
      subLabel: getWalletSubLabel(type),
    };
  }

  const fallbackKey = resolveWalletColorKey(undefined, type);
  return {
    ...WALLET_THEMES[fallbackKey],
    subLabel: getWalletSubLabel(type),
  };
}
