export const VALID_CATEGORY_ICONS = [
  'Utensils',
  'Coffee',
  'ShoppingBag',
  'Gift',
  'Shirt',
  'Sparkles',
  'Gamepad2',
  'Film',
  'Music',
  'BookOpen',
  'Zap',
  'Home',
  'Wrench',
  'Smartphone',
  'Briefcase',
  'Store',
  'TrendingUp',
  'Wallet',
  'Car',
  'HeartPulse',
  'GraduationCap',
  'PawPrint',
  'Dumbbell',
  'HeartHandshake',
  'Plane',
  'CreditCard',
  'Receipt',
  'Tag',
] as const;

export type ValidCategoryIcon = (typeof VALID_CATEGORY_ICONS)[number];

const ICON_TOPIC_GROUPS: Array<{ re: RegExp; icons: ValidCategoryIcon[] }> = [
  {
    re: /makan|minum|jajan|snack|kopi|ngopi|kuliner|sarapan|nasi|warteg/i,
    icons: ['Utensils', 'Coffee', 'ShoppingBag', 'Gift'],
  },
  {
    re: /belanja|fashion|baju|sepatu|skincare|perawatan|kecantikan|kosmetik/i,
    icons: ['ShoppingBag', 'Shirt', 'Sparkles', 'Gift'],
  },
  {
    re: /hiburan|hobi|game|nonton|film|musik|konser|buku/i,
    icons: ['Gamepad2', 'Film', 'Music', 'BookOpen'],
  },
  {
    re: /tagihan|listrik|air|internet|wifi|pulsa|rumah|kos|servis|bengkel/i,
    icons: ['Zap', 'Home', 'Wrench', 'Smartphone'],
  },
  {
    re: /gaji|usaha|jualan|bisnis|freelance|bonus|investasi|pemasukan|hadiah/i,
    icons: ['Briefcase', 'Store', 'TrendingUp', 'Gift', 'Wallet'],
  },
  {
    re: /kesehatan|medis|obat|dokter|klinik/i,
    icons: ['HeartPulse', 'Sparkles', 'Tag'],
  },
  {
    re: /pendidikan|belajar|kursus|kuliah|sekolah|skripsi/i,
    icons: ['GraduationCap', 'BookOpen', 'Tag'],
  },
  {
    re: /hewan|kucing|anjing|peliharaan/i,
    icons: ['PawPrint', 'HeartHandshake', 'Tag'],
  },
  {
    re: /olahraga|gym|fitness|lari|sepeda/i,
    icons: ['Dumbbell', 'HeartPulse', 'Tag'],
  },
  {
    re: /transport|ojek|bensin|parkir|tol|kereta|travel|liburan/i,
    icons: ['Car', 'Plane', 'Tag'],
  },
  {
    re: /donasi|sedekah|zakat|amal|sosial/i,
    icons: ['HeartHandshake', 'Gift', 'Tag'],
  },
];

export function normalizeValidCategoryIcon(raw?: string | null): ValidCategoryIcon | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  const found = VALID_CATEGORY_ICONS.find((ic) => ic.toLowerCase() === trimmed);
  return found ?? null;
}

export function pickCategoryIcon(
  name: string,
  aiIcon?: string | null,
  usedIcons: string[] = []
): ValidCategoryIcon {
  const usedSet = new Set(usedIcons.map((i) => i.trim().toLowerCase()).filter(Boolean));
  const validAiIcon = normalizeValidCategoryIcon(aiIcon);

  const matchedGroup = ICON_TOPIC_GROUPS.find((g) => g.re.test(name));
  const candidates: ValidCategoryIcon[] = matchedGroup
    ? [...matchedGroup.icons]
    : ['Tag', 'Receipt', 'CreditCard', 'Wallet'];

  if (validAiIcon) {
    if (!usedSet.has(validAiIcon.toLowerCase())) {
      return validAiIcon;
    }
    const unusedInGroup = candidates.find((c) => !usedSet.has(c.toLowerCase()));
    if (unusedInGroup) {
      return unusedInGroup;
    }
    return validAiIcon;
  }

  const unusedCandidate = candidates.find((c) => !usedSet.has(c.toLowerCase()));
  if (unusedCandidate) {
    return unusedCandidate;
  }

  const anyUnused = VALID_CATEGORY_ICONS.find((c) => !usedSet.has(c.toLowerCase()));
  return anyUnused ?? candidates[0] ?? 'Tag';
}
