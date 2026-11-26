import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import type { CreateWalletInput, UpdateWalletInput } from './wallets.schema';
import * as walletsService from './wallets.service';

export async function listWalletsHandler(req: Request, res: Response) {
  const includeArchived = String(req.query.includeArchived || '').toLowerCase() === 'true';
  const data = await walletsService.listWallets(req.user!.userId, includeArchived);
  return sendSuccess(res, 'Daftar dompet berhasil diambil', data);
}

export async function createWalletHandler(req: Request, res: Response) {
  const wallet = await walletsService.createWallet(
    req.user!.userId,
    req.body as CreateWalletInput,
    req.ip ?? null
  );
  return sendSuccess(res, 'Dompet baru berhasil dibuat', wallet, 201);
}

export async function updateWalletHandler(req: Request, res: Response) {
  const wallet = await walletsService.updateWallet(
    req.user!.userId,
    String(req.params.id),
    req.body as UpdateWalletInput,
    req.ip ?? null
  );
  return sendSuccess(res, 'Dompet berhasil diperbarui', wallet);
}

export async function deleteWalletHandler(req: Request, res: Response) {
  const result = await walletsService.deleteOrArchiveWallet(
    req.user!.userId,
    String(req.params.id),
    req.ip ?? null
  );
  const message = result.archived
    ? 'Dompet memiliki riwayat transaksi sehingga otomatis diarsipkan'
    : 'Dompet berhasil dihapus permanen';
  return sendSuccess(res, message, result);
}
