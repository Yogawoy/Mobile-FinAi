export function formatIDR(amount: number): string {
  const rounded = Math.round(Math.abs(amount));
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return amount < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`;
}
