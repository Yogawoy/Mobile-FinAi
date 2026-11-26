import { formatIDR } from '@/lib/format';
import { type GoalFrequency } from '@/lib/mockData';

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  mei: 4,
  may: 4,
  jun: 5,
  jul: 6,
  agu: 7,
  aug: 7,
  sep: 8,
  okt: 9,
  oct: 9,
  nov: 10,
  des: 11,
  dec: 11,
};

export function parseDeadlineMonths(deadline: string): number {
  const parts = deadline.trim().toLowerCase().split(/\s+/);
  const nowMonthIndex = 2026 * 12 + 10; // Nov 2026
  if (parts.length >= 2) {
    const mKey = parts[0].slice(0, 3);
    const year = Number(parts[1]);
    if (mKey in MONTH_MAP && Number.isFinite(year) && year >= 2026) {
      const targetIndex = year * 12 + MONTH_MAP[mKey];
      return Math.max(1, targetIndex - nowMonthIndex);
    }
  }
  return 6;
}

export function formatCompactIDR(amount: number): string {
  if (amount >= 1_000_000) {
    const jt = (amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1).replace('.', ',');
    return `Rp ${jt}jt`;
  }
  if (amount >= 1_000) {
    const rb = Math.round(amount / 1_000);
    return `Rp ${rb}rb`;
  }
  return formatIDR(amount);
}

export function calculateGoalRecommendation(
  current: number,
  target: number,
  deadline: string,
  frequency: GoalFrequency = 'MONTHLY'
) {
  const remaining = Math.max(0, target - current);
  const months = parseDeadlineMonths(deadline);
  const periods =
    frequency === 'DAILY'
      ? months * 30
      : frequency === 'WEEKLY'
        ? months * 4
        : months;

  const rawPerPeriod = remaining > 0 ? remaining / Math.max(1, periods) : 0;
  const amount = rawPerPeriod > 0 ? Math.ceil(rawPerPeriod / 1_000) * 1_000 : 0;
  const unitLabel =
    frequency === 'DAILY' ? 'hr' : frequency === 'WEEKLY' ? 'mgg' : 'bln';

  return {
    amount,
    unitLabel,
    compactLabel: `Saran: ${formatCompactIDR(amount)}/${unitLabel}`,
  };
}
