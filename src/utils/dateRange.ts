import { getDaysInMonth, getWibNow, wibMidnightToUtc } from './budgetWindow';

export interface ParsedWibDateRange {
  startDate: Date;
  endDate: Date;
  label: string;
  dayCount: number;
}

const MONTH_NAMES_ID: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

const MONTH_LABELS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const MONTH_REGEX_PART =
  '(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)';

export function parseWibDateRangeQuery(
  message: string,
  referenceDate = new Date()
): ParsedWibDateRange {
  const q = message.toLowerCase();
  const wib = getWibNow(referenceDate);

  // 1. Rentang tanggal eksplisit (misal: "1 sampai 15 November" atau "1 - 15 November 2026")
  const rangeMatch = q.match(
    new RegExp(
      `(\\d{1,2})\\s*(?:-|sampai|sd|s\\/d|hingga)\\s*(\\d{1,2})\\s+${MONTH_REGEX_PART}(?:\\s+(\\d{4}))?`,
      'i'
    )
  );
  if (rangeMatch) {
    const d1 = Math.max(1, Math.min(31, Number(rangeMatch[1])));
    const d2 = Math.max(d1, Math.min(31, Number(rangeMatch[2])));
    const targetMonth = MONTH_NAMES_ID[rangeMatch[3].toLowerCase()] ?? wib.month;
    const targetYear = rangeMatch[4] ? Number(rangeMatch[4]) : wib.year;
    const maxDay = getDaysInMonth(targetMonth, targetYear);
    const startDay = Math.min(d1, maxDay);
    const endDay = Math.min(d2, maxDay);
    const monthLabel = MONTH_LABELS_ID[targetMonth - 1] ?? String(targetMonth);
    const yearSuffix = rangeMatch[4] ? ` ${targetYear}` : '';

    return {
      startDate: wibMidnightToUtc(targetYear, targetMonth, startDay),
      endDate: wibMidnightToUtc(targetYear, targetMonth, endDay + 1),
      label: `${startDay} sampai ${endDay} ${monthLabel}${yearSuffix}`,
      dayCount: Math.max(1, endDay - startDay + 1),
    };
  }

  // 2. Tanggal tertentu (misal: "tanggal 20 November" atau "tgl 5 Oktober 2026")
  const singleDateMatch = q.match(
    new RegExp(
      `(?:tanggal|tgl)\\s+(\\d{1,2})\\s+${MONTH_REGEX_PART}(?:\\s+(\\d{4}))?`,
      'i'
    )
  );
  if (singleDateMatch) {
    const dayNum = Math.max(1, Math.min(31, Number(singleDateMatch[1])));
    const targetMonth = MONTH_NAMES_ID[singleDateMatch[2].toLowerCase()] ?? wib.month;
    const targetYear = singleDateMatch[3] ? Number(singleDateMatch[3]) : wib.year;
    const clampedDay = Math.min(dayNum, getDaysInMonth(targetMonth, targetYear));
    const monthLabel = MONTH_LABELS_ID[targetMonth - 1] ?? String(targetMonth);
    const yearSuffix = singleDateMatch[3] ? ` ${targetYear}` : '';

    return {
      startDate: wibMidnightToUtc(targetYear, targetMonth, clampedDay),
      endDate: wibMidnightToUtc(targetYear, targetMonth, clampedDay + 1),
      label: `${clampedDay} ${monthLabel}${yearSuffix}`,
      dayCount: 1,
    };
  }

  // 3. N hari terakhir (misal: "3 hari terakhir", "7 hari terakhir", "30 hari terakhir")
  const nDaysMatch = q.match(/(\d+)\s+hari\s+terakhir/i);
  if (nDaysMatch) {
    const n = Math.max(1, Math.min(365, Number(nDaysMatch[1])));
    return {
      startDate: wibMidnightToUtc(wib.year, wib.month, wib.day - (n - 1)),
      endDate: wibMidnightToUtc(wib.year, wib.month, wib.day + 1),
      label: `${n} Hari Terakhir`,
      dayCount: n,
    };
  }

  // 4. Kemarin
  if (/\bkemarin\b/i.test(q)) {
    return {
      startDate: wibMidnightToUtc(wib.year, wib.month, wib.day - 1),
      endDate: wibMidnightToUtc(wib.year, wib.month, wib.day),
      label: 'Kemarin',
      dayCount: 1,
    };
  }

  // 5. Hari ini
  if (/\b(hari\s+ini|sekarang|tadi)\b/i.test(q)) {
    return {
      startDate: wibMidnightToUtc(wib.year, wib.month, wib.day),
      endDate: wibMidnightToUtc(wib.year, wib.month, wib.day + 1),
      label: 'Hari Ini',
      dayCount: 1,
    };
  }

  // 6. Minggu lalu / Pekan lalu (Senin - Minggu pekan sebelumnya)
  if (/\b(minggu\s+lalu|pekan\s+lalu)\b/i.test(q)) {
    const diffToMonday = wib.dayOfWeek === 0 ? 6 : wib.dayOfWeek - 1;
    return {
      startDate: wibMidnightToUtc(wib.year, wib.month, wib.day - diffToMonday - 7),
      endDate: wibMidnightToUtc(wib.year, wib.month, wib.day - diffToMonday),
      label: 'Minggu Lalu',
      dayCount: 7,
    };
  }

  // 7. Minggu ini / Pekan ini (Senin 00:00 WIB sampai hari ini)
  if (/\b(minggu\s+ini|pekan\s+ini)\b/i.test(q)) {
    const diffToMonday = wib.dayOfWeek === 0 ? 6 : wib.dayOfWeek - 1;
    return {
      startDate: wibMidnightToUtc(wib.year, wib.month, wib.day - diffToMonday),
      endDate: wibMidnightToUtc(wib.year, wib.month, wib.day + 1),
      label: 'Minggu Ini',
      dayCount: diffToMonday + 1,
    };
  }

  // 8. Bulan lalu
  if (/\b(bulan\s+lalu|bulan\s+kemarin)\b/i.test(q)) {
    const prevMonth = wib.month === 1 ? 12 : wib.month - 1;
    const prevYear = wib.month === 1 ? wib.year - 1 : wib.year;
    return {
      startDate: wibMidnightToUtc(prevYear, prevMonth, 1),
      endDate: wibMidnightToUtc(prevYear, prevMonth + 1, 1),
      label: 'Bulan Lalu',
      dayCount: getDaysInMonth(prevMonth, prevYear),
    };
  }

  // 9. Bulan tertentu (misal: "bulan Oktober", "September 2026")
  const monthMatch = q.match(
    new RegExp(`(?:bulan\\s+)?${MONTH_REGEX_PART}(?:\\s+(\\d{4}))?`, 'i')
  );
  if (monthMatch) {
    const targetMonth = MONTH_NAMES_ID[monthMatch[1].toLowerCase()] ?? wib.month;
    const targetYear = monthMatch[2]
      ? Number(monthMatch[2])
      : targetMonth > wib.month
        ? wib.year - 1
        : wib.year;
    const monthLabel = MONTH_LABELS_ID[targetMonth - 1] ?? String(targetMonth);
    return {
      startDate: wibMidnightToUtc(targetYear, targetMonth, 1),
      endDate: wibMidnightToUtc(targetYear, targetMonth + 1, 1),
      label: `${monthLabel} ${targetYear}`,
      dayCount: getDaysInMonth(targetMonth, targetYear),
    };
  }

  // 10. Default: Bulan Ini (tanggal 1 sampai hari ini)
  return {
    startDate: wibMidnightToUtc(wib.year, wib.month, 1),
    endDate: wibMidnightToUtc(wib.year, wib.month, wib.day + 1),
    label: 'Bulan Ini',
    dayCount: Math.max(1, wib.day),
  };
}

export function formatWibShortDate(date: Date): string {
  const wib = getWibNow(date);
  const monthShort = (MONTH_LABELS_ID[wib.month - 1] ?? '').slice(0, 3);
  return `${wib.day} ${monthShort}`;
}
