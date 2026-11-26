import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import type {
  ContributeGoalInput,
  CreateGoalInput,
  UpdateGoalInput,
} from './goals.schema';
import * as goalsService from './goals.service';

export async function listGoalsHandler(req: Request, res: Response) {
  const data = await goalsService.listGoals(req.user!.userId);
  return sendSuccess(res, 'Daftar target tabungan berhasil diambil', data);
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

export async function deleteGoalHandler(req: Request, res: Response) {
  const result = await goalsService.deleteGoal(
    req.user!.userId,
    String(req.params.id),
    req.ip ?? null
  );
  return sendSuccess(res, 'Target tabungan berhasil dihapus', result);
}
