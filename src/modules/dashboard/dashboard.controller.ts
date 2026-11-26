import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { getDashboardSummary } from './dashboard.service';

export async function getDashboardSummaryHandler(req: Request, res: Response) {
  const now = new Date();
  const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
  const year = req.query.year ? Number(req.query.year) : now.getFullYear();

  const summary = await getDashboardSummary(req.user!.userId, month, year);
  return sendSuccess(res, 'Ringkasan dashboard berhasil diambil', summary);
}
