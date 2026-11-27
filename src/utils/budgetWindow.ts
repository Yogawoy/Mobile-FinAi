import { BudgetPeriod } from '@prisma/client';

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface WibDateParts {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  wibDate: Date;
}

/**
 * Mengembalikan komponen tanggal/waktu saat ini dalam zona waktu Asia/Jakarta (WIB, UTC+7)
 * agar perhitungan harian/mingguan/bulanan tetap akurat di server cloud UTC.
 */
export function getWibNow(referenceDate = new Date()): WibDateParts {
  const shifted = new Date(referenceDate.getTime() + WIB_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    dayOfWeek: shifted.getUTCDay(),
    wibDate: shifted,
  };
}

/**
 * Mengonversi tanggal kalender WIB (00:00:00 WIB) ke instant UTC untuk query Prisma.
 */
export function wibMidnightToUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - WIB_OFFSET_MS);
}

export function getDaysInMonth(month: number, year: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getMonthDateRangeWib(month: number, year: number) {
  return {
    start: wibMidnightToUtc(year, month, 1),
    end: wibMidnightToUtc(year, month + 1, 1),
  };
}

export function getBudgetPeriodLabel(period: BudgetPeriod): string {
  switch (period) {
    case BudgetPeriod.DAILY:
      return 'Hari Ini';
    case BudgetPeriod.WEEKLY:
      return 'Minggu Ini';
    default:
      return 'Bulan Ini';
  }
}

export function toMonthlyEquivalent(
  limitAmount: number,
  period: BudgetPeriod,
  daysInMonth: number
): number {
  if (!Number.isFinite(limitAmount) || limitAmount <= 0) return 0;
  switch (period) {
    case BudgetPeriod.DAILY:
      return Math.round(limitAmount * daysInMonth);
    case BudgetPeriod.WEEKLY:
      return Math.round(limitAmount * (daysInMonth / 7));
    default:
      return Math.round(limitAmount);
  }
}

export function getBudgetDateRange(
  period: BudgetPeriod,
  month: number,
  year: number,
  referenceDate = new Date()
): { start: Date; end: Date; isArchivedMonth: boolean } {
  const wibRef = getWibNow(referenceDate);
  const isCurrentWibMonth = month === wibRef.month && year === wibRef.year;

  // Bulan lampau (arsip): evaluasi memakai rentang penuh bulan tersebut
  if (!isCurrentWibMonth) {
    const { start, end } = getMonthDateRangeWib(month, year);
    return { start, end, isArchivedMonth: true };
  }

  if (period === BudgetPeriod.DAILY) {
    const start = wibMidnightToUtc(wibRef.year, wibRef.month, wibRef.day);
    const end = wibMidnightToUtc(wibRef.year, wibRef.month, wibRef.day + 1);
    return { start, end, isArchivedMonth: false };
  }

  if (period === BudgetPeriod.WEEKLY) {
    const diffToMonday = wibRef.dayOfWeek === 0 ? -6 : 1 - wibRef.dayOfWeek;
    const start = wibMidnightToUtc(
      wibRef.year,
      wibRef.month,
      wibRef.day + diffToMonday
    );
    const end = wibMidnightToUtc(
      wibRef.year,
      wibRef.month,
      wibRef.day + diffToMonday + 7
    );
    return { start, end, isArchivedMonth: false };
  }

  const { start, end } = getMonthDateRangeWib(month, year);
  return { start, end, isArchivedMonth: false };
}
