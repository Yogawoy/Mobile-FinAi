export type WalletThemeKey =
  | 'periwinkle'
  | 'indigo'
  | 'teal'
  | 'blue'
  | 'slate'
  | 'navy'
  | 'peach'
  | 'lavender';

export interface WalletTheme {
  key: WalletThemeKey;
  label: string;
  colors: [string, string, string];
  accentBg: string;
  accentText: string;
}

export const WALLET_THEMES: Record<WalletThemeKey, WalletTheme> = {
  periwinkle: {
    key: 'periwinkle',
    label: 'Periwinkle',
    colors: ['#8C8BE8', '#7C7CE6', '#5F5ED4'],
    accentBg: '#E4E2FB',
    accentText: '#5F5ED4',
  },
  indigo: {
    key: 'indigo',
    label: 'Indigo',
    colors: ['#818CF8', '#6366F1', '#4F46E5'],
    accentBg: '#E4E2FB',
    accentText: '#4F46E5',
  },
  teal: {
    key: 'teal',
    label: 'Mint Teal',
    colors: ['#14B8A6', '#0D9488', '#0F766E'],
    accentBg: '#CCFBF1',
    accentText: '#0F766E',
  },
  blue: {
    key: 'blue',
    label: 'Ocean Blue',
    colors: ['#4B89FF', '#3B7AF5', '#2563EB'],
    accentBg: '#DBEAFE',
    accentText: '#1D4ED8',
  },
  slate: {
    key: 'slate',
    label: 'Slate',
    colors: ['#475569', '#334155', '#1E293B'],
    accentBg: '#E2E8F0',
    accentText: '#334155',
  },
  navy: {
    key: 'navy',
    label: 'Deep Navy',
    colors: ['#4F46E5', '#3730A3', '#1E1B4B'],
    accentBg: '#E0E7FF',
    accentText: '#3730A3',
  },
  peach: {
    key: 'peach',
    label: 'Rose Peach',
    colors: ['#FB7185', '#F43F5E', '#E11D48'],
    accentBg: '#FFE4E6',
    accentText: '#BE123C',
  },
  lavender: {
    key: 'lavender',
    label: 'Lavender',
    colors: ['#A78BFA', '#8B5CF6', '#6D28D9'],
    accentBg: '#EDE9FE',
    accentText: '#6D28D9',
  },
};

export function resolveWalletTheme(color?: string | null, type?: string | null): WalletTheme {
  const key = (color || '').toLowerCase().trim() as WalletThemeKey;
  if (key && WALLET_THEMES[key]) {
    return WALLET_THEMES[key];
  }

  switch ((type || '').toUpperCase()) {
    case 'E_WALLET':
      return WALLET_THEMES.teal;
    case 'CASH':
      return WALLET_THEMES.slate;
    default:
      return WALLET_THEMES.indigo;
  }
}

export function getWalletTypeLabels(type?: string | null): {
  subLabel: string;
  typeLabel: string;
} {
  switch ((type || '').toUpperCase()) {
    case 'BANK':
      return { subLabel: 'REKENING BANK', typeLabel: 'Bank' };
    case 'E_WALLET':
      return { subLabel: 'DOMPET DIGITAL', typeLabel: 'E-Wallet' };
    case 'CASH':
      return { subLabel: 'UANG TUNAI', typeLabel: 'Tunai' };
    default:
      return { subLabel: 'DOMPET', typeLabel: 'Lainnya' };
  }
}
