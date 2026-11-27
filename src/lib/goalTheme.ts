import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Briefcase,
  Car,
  GraduationCap,
  HeartHandshake,
  Home,
  Laptop,
  PiggyBank,
  Plane,
  ShieldCheck,
  Target,
} from 'lucide-react-native';
import React from 'react';

export type GoalThemeColorKey =
  | 'royal'
  | 'emerald'
  | 'teal'
  | 'amber'
  | 'rose'
  | 'slate';

export type GoalThemeIconKey =
  | 'shield'
  | 'laptop'
  | 'plane'
  | 'graduation'
  | 'home'
  | 'car'
  | 'heart'
  | 'briefcase'
  | 'piggy'
  | 'target';

export interface GoalThemePref {
  iconKey: GoalThemeIconKey;
  colorKey: GoalThemeColorKey;
}

export interface GoalColorPaletteItem {
  key: GoalThemeColorKey;
  label: string;
  primary: string;
  gradient: [string, string, string];
  softBg: string;
  text: string;
}

export const GOAL_COLOR_PALETTE: GoalColorPaletteItem[] = [
  {
    key: 'royal',
    label: 'Royal Blue',
    primary: '#2563EB',
    gradient: ['#3B82F6', '#2563EB', '#1D4ED8'],
    softBg: '#EBF2FF',
    text: '#1D4ED8',
  },
  {
    key: 'emerald',
    label: 'Emerald',
    primary: '#059669',
    gradient: ['#10B981', '#059669', '#047857'],
    softBg: '#ECFDF5',
    text: '#047857',
  },
  {
    key: 'teal',
    label: 'Teal',
    primary: '#0D9488',
    gradient: ['#14B8A6', '#0D9488', '#0F766E'],
    softBg: '#F0FDFA',
    text: '#0F766E',
  },
  {
    key: 'amber',
    label: 'Amber Gold',
    primary: '#D97706',
    gradient: ['#F59E0B', '#D97706', '#B45309'],
    softBg: '#FFFBEB',
    text: '#B45309',
  },
  {
    key: 'rose',
    label: 'Rose',
    primary: '#E11D48',
    gradient: ['#F43F5E', '#E11D48', '#BE123C'],
    softBg: '#FFF1F2',
    text: '#BE123C',
  },
  {
    key: 'slate',
    label: 'Slate Navy',
    primary: '#1E293B',
    gradient: ['#334155', '#1E293B', '#0F172A'],
    softBg: '#F1F5F9',
    text: '#1E293B',
  },
];

export const GOAL_ICON_OPTIONS: Array<{
  key: GoalThemeIconKey;
  label: string;
}> = [
  { key: 'shield', label: 'Darurat' },
  { key: 'laptop', label: 'Gadget' },
  { key: 'plane', label: 'Liburan' },
  { key: 'graduation', label: 'Pendidikan' },
  { key: 'home', label: 'Rumah' },
  { key: 'car', label: 'Kendaraan' },
  { key: 'heart', label: 'Keluarga' },
  { key: 'briefcase', label: 'Usaha' },
  { key: 'piggy', label: 'Tabungan' },
  { key: 'target', label: 'Target' },
];

export function getGoalColorPalette(colorKey?: string): GoalColorPaletteItem {
  return (
    GOAL_COLOR_PALETTE.find((c) => c.key === colorKey) ?? GOAL_COLOR_PALETTE[0]
  );
}

export function renderGoalThemeIcon(
  key: string | undefined,
  color: string,
  size = 19
): React.ReactElement {
  const IconComp =
    key === 'shield'
      ? ShieldCheck
      : key === 'laptop'
        ? Laptop
        : key === 'plane'
          ? Plane
          : key === 'graduation'
            ? GraduationCap
            : key === 'home'
              ? Home
              : key === 'car'
                ? Car
                : key === 'heart'
                  ? HeartHandshake
                  : key === 'briefcase'
                    ? Briefcase
                    : key === 'piggy'
                      ? PiggyBank
                      : Target;
  return React.createElement(IconComp, { size, color, strokeWidth: 2 });
}

const STORAGE_KEY = 'finai_goal_theme_prefs_v1';

export async function loadGoalThemePrefs(): Promise<
  Record<string, GoalThemePref>
> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, GoalThemePref>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveGoalThemePref(
  goalId: string,
  pref: GoalThemePref
): Promise<Record<string, GoalThemePref>> {
  const existing = await loadGoalThemePrefs();
  const next = { ...existing, [goalId]: pref };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Abaikan jika penyimpanan lokal penuh
  }
  return next;
}
