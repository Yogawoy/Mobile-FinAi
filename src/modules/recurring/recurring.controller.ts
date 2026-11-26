import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import type { CreateRecurringInput, UpdateRecurringInput } from './recurring.schema';
import * as recurringService from './recurring.service';

export async function listRecurringHandler(req: Request, res: Response) {
  const data = await recurringService.listRecurring(req.user!.userId);
  return sendSuccess(res, 'Daftar jadwal rutin berhasil diambil', data);
}

export async function createRecurringHandler(req: Request, res: Response) {
  const created = await recurringService.createRecurring(
    req.user!.userId,
    req.body as CreateRecurringInput,
    req.ip ?? null
  );
  return sendSuccess(res, 'Jadwal rutin berhasil dibuat', created, 201);
}

export async function updateRecurringHandler(req: Request, res: Response) {
  const updated = await recurringService.updateRecurring(
    req.user!.userId,
    String(req.params.id),
    req.body as UpdateRecurringInput,
    req.ip ?? null
  );
  return sendSuccess(res, 'Jadwal rutin berhasil diperbarui', updated);
}

export async function deleteRecurringHandler(req: Request, res: Response) {
  const result = await recurringService.deleteRecurring(
    req.user!.userId,
    String(req.params.id),
    req.ip ?? null
  );
  return sendSuccess(res, 'Jadwal rutin berhasil dihapus', result);
}

export async function executeRecurringHandler(req: Request, res: Response) {
  const result = await recurringService.executeRecurring(
    req.user!.userId,
    String(req.params.id),
    req.ip ?? null
  );
  return sendSuccess(res, 'Jadwal rutin berhasil dieksekusi', result, 201);
}
