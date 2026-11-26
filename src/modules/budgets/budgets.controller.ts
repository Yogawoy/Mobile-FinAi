import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import type { UpsertBudgetInput } from './budgets.schema';
import * as budgetsService from './budgets.service';

export async function listBudgetsHandler(req: Request, res: Response) {
  const now = new Date();
  const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
  const year = req.query.year ? Number(req.query.year) : now.getFullYear();

  const data = await budgetsService.listBudgets(req.user!.userId, month, year);
  return sendSuccess(res, 'Daftar anggaran berhasil diambil', data);
}

export async function upsertBudgetHandler(req: Request, res: Response) {
  const budget = await budgetsService.upsertBudget(
    req.user!.userId,
    req.body as UpsertBudgetInput,
    req.ip ?? null
  );
  return sendSuccess(res, 'Anggaran berhasil disimpan', budget, 201);
}

export async function deleteBudgetHandler(req: Request, res: Response) {
  const result = await budgetsService.deleteBudget(
    req.user!.userId,
    String(req.params.id),
    req.ip ?? null
  );
  return sendSuccess(res, 'Anggaran berhasil dihapus', result);
}
