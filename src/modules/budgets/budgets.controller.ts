import { BudgetPeriod } from '@prisma/client';
import type { Request, Response } from 'express';
import { getWibNow } from '../../utils/budgetWindow';
import { sendSuccess } from '../../utils/response';
import type { UpsertBudgetInput } from './budgets.schema';
import * as budgetsService from './budgets.service';

export async function listBudgetsHandler(req: Request, res: Response) {
  const wibNow = getWibNow();
  const month = req.query.month ? Number(req.query.month) : wibNow.month;
  const year = req.query.year ? Number(req.query.year) : wibNow.year;
  const rawPeriod = typeof req.query.period === 'string' ? req.query.period.toUpperCase() : undefined;
  const periodFilter =
    rawPeriod === BudgetPeriod.DAILY ||
    rawPeriod === BudgetPeriod.WEEKLY ||
    rawPeriod === BudgetPeriod.MONTHLY
      ? (rawPeriod as BudgetPeriod)
      : undefined;

  const data = await budgetsService.getBudgetsWithSummary(
    req.user!.userId,
    month,
    year,
    periodFilter
  );
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

export async function resetBudgetHandler(req: Request, res: Response) {
  const result = await budgetsService.resetBudget(
    req.user!.userId,
    String(req.params.id),
    req.ip ?? null
  );
  return sendSuccess(res, 'Hitungan anggaran berhasil di-reset ke Rp 0', result);
}
