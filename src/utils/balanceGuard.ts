import { AppError } from './errors';

export function formatIdrPlain(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

/**
 * Memastikan saldo dompet mencukupi sebelum pengurangan saldo dilakukan.
 * Menolak dengan HTTP 400 jika saldo akhir akan menjadi minus (< 0).
 */
export function assertSufficientBalance(
  wallet: { name: string; currentBalance: number | { toString(): string } },
  requiredAmount: number,
  customMessage?: string
): void {
  const available = Number(wallet.currentBalance);
  if (!Number.isFinite(available) || available < requiredAmount) {
    throw new AppError(
      customMessage ??
        `Saldo ${wallet.name} tidak cukup, sisa saat ini ${formatIdrPlain(available)}`,
      400
    );
  }
}
