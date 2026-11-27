import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import type {
  ContributeGoalInput,
  CreateGoalInput,
  UpdateGoalInput,
  WithdrawGoalInput,
} from './goals.schema';
import * as goalsService from './goals.service';

export async function listGoalsHandler(req: Request, res: Response) {
  const data = await goalsService.listGoals(req.user!.userId);
  return sendSuccess(res, 'Daftar target tabungan berhasil diambil', data);
}

export async function getGoalDetailHandler(req: Request, res: Response) {
  const data = await goalsService.getGoalById(
    req.user!.userId,
    String(req.params.id)
  );
  return sendSuccess(res, 'Detail target tabungan berhasil diambil', data);
}

export async function createGoalHandler(req: Request, res: Response) {
  const goal = await goalsService.createGoal(
    req.user!.userId,
    req.body as CreateGoalInput,
    req.ip ?? null
  );
  return sendSuccess(res, 'Target tabungan berhasil dibuat', goal, 201);
}

export async function updateGoalHandler(req: Request, res: Response) {
  const goal = await goalsService.updateGoal(
    req.user!.userId,
    String(req.params.id),
    req.body as UpdateGoalInput,
    req.ip ?? null
  );
  return sendSuccess(res, 'Target tabungan berhasil diperbarui', goal);
}

export async function contributeGoalHandler(req: Request, res: Response) {
  const goal = await goalsService.contributeGoal(
    req.user!.userId,
    String(req.params.id),
    req.body as ContributeGoalInput,
    req.ip ?? null
  );
  return sendSuccess(res, 'Setoran target tabungan berhasil dicatat', goal);
}

export async function withdrawGoalHandler(req: Request, res: Response) {
  const goal = await goalsService.withdrawGoal(
    req.user!.userId,
    String(req.params.id),
    req.body as WithdrawGoalInput,
    req.ip ?? null
  );
  return sendSuccess(res, 'Penarikan dana tabungan berhasil dicatat', goal);
}

export async function deleteGoalHandler(req: Request, res: Response) {
  const refundFromQuery =
    typeof req.query.refundToWalletId === 'string'
      ? req.query.refundToWalletId.trim()
      : undefined;
  const refundFromBody =
    req.body && typeof (req.body as { refundToWalletId?: unknown }).refundToWalletId === 'string'
      ? ((req.body as { refundToWalletId: string }).refundToWalletId).trim()
      : undefined;
  const refundToWalletId = refundFromQuery || refundFromBody || undefined;

  const result = await goalsService.deleteGoal(
    req.user!.userId,
    String(req.params.id),
    refundToWalletId,
    req.ip ?? null
  );
  return sendSuccess(res, 'Target tabungan berhasil dihapus', result);
}
