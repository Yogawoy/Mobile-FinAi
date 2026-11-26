export function parseDecimal(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatIDR(amount: number | string): string {
  const num = typeof amount === 'number' ? amount : parseDecimal(amount);
  const rounded = Math.round(Math.abs(num));
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return num < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

export function computeTotalBalance(
  wallets: Array<{ balance: string | number; isArchived?: boolean }>
): number {
  return wallets.reduce((sum, w) => {
    if (w.isArchived) return sum;
    return sum + parseDecimal(w.balance);
  }, 0);
}
