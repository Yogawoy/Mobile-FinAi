export type WalletColorKey = 'royal' | 'teal' | 'navy' | 'slate' | 'emerald';

export type WalletTypeKey = 'BANK' | 'EWALLET' | 'E_WALLET' | 'SAVINGS' | 'CASH';

export interface WalletTheme {
  key: WalletColorKey;
  label: string;
  gradient: [string, string, string];
  dotColor: string;
  shadowColor: string;
  subLabel: string;
}

export const WALLET_THEMES: Record<WalletColorKey, WalletTheme> = {
  royal: {
    key: 'royal',
    label: 'Royal Blue',
    gradient: ['#4B89FF', '#3B7AF5', '#2563EB'],
    dotColor: '#3B7AF5',
    shadowColor: '#2563EB',
    subLabel: 'DEBIT CARD',
  },
  teal: {
    key: 'teal',
    label: 'Emerald Teal',
    gradient: ['#14B8A6', '#0D9488', '#0F766E'],
    dotColor: '#14B8A6',
    shadowColor: '#0D9488',
    subLabel: 'E-WALLET',
  },
  navy: {
    key: 'navy',
    label: 'Deep Navy',
    gradient: ['#2563EB', '#1D4ED8', '#1E3A8A'],
    dotColor: '#1D4ED8',
    shadowColor: '#1E3A8A',
    subLabel: 'SAVINGS',
  },
  slate: {
    key: 'slate',
    label: 'Satin Slate',
    gradient: ['#475569', '#334155', '#1E293B'],
    dotColor: '#475569',
    shadowColor: '#1E293B',
    subLabel: 'CASH',
  },
  emerald: {
    key: 'emerald',
    label: 'Emerald',
    gradient: ['#10B981', '#059669', '#047857'],
    dotColor: '#10B981',
    shadowColor: '#059669',
    subLabel: 'SAVINGS',
  },
};

export const WALLET_COLOR_OPTIONS: WalletTheme[] = [
  WALLET_THEMES.royal,
  WALLET_THEMES.teal,
  WALLET_THEMES.navy,
  WALLET_THEMES.slate,
  WALLET_THEMES.emerald,
];

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

  switch (type) {
    case 'EWALLET':
    case 'E_WALLET':
      return { ...WALLET_THEMES.teal, subLabel: 'E-WALLET' };
    case 'SAVINGS':
      return { ...WALLET_THEMES.navy, subLabel: 'SAVINGS' };
    case 'CASH':
      return { ...WALLET_THEMES.slate, subLabel: 'CASH' };
    case 'BANK':
    default:
      return { ...WALLET_THEMES.royal, subLabel: 'DEBIT CARD' };
  }
}
