import { GoalStatus, NotificationType, type FinancialGoal } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logAudit } from '../../utils/audit';
import { AppError } from '../../utils/errors';
import type {
  ContributeGoalInput,
  CreateGoalInput,
  UpdateGoalInput,
} from './goals.schema';

function serializeGoal(goal: FinancialGoal) {
  const targetAmount = Number(goal.targetAmount);
  const currentAmount = Number(goal.currentAmount);
  const percentage =
    targetAmount > 0
      ? Math.min(100, Math.round((currentAmount / targetAmount) * 1000) / 10)
      : 0;

  return {
    id: goal.id,
    userId: goal.userId,
    name: goal.name,
    targetAmount,
    currentAmount,
    remainingAmount: Math.max(0, targetAmount - currentAmount),
    percentage,
    deadline: goal.deadline,
    status: goal.status,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

export async function listGoals(userId: string) {
  const goals = await prisma.financialGoal.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
  });
  return goals.map(serializeGoal);
}

export async function createGoal(
  userId: string,
  input: CreateGoalInput,
  ipAddress?: string | null
) {
  const targetAmount = (input.targetAmount ?? input.target_amount)!;
  const currentAmount = input.currentAmount ?? input.current_amount ?? 0;
  const status =
    currentAmount >= targetAmount ? GoalStatus.COMPLETED : GoalStatus.ACTIVE;

  const goal = await prisma.financialGoal.create({
    data: {
      userId,
      name: input.name,
      targetAmount,
      currentAmount,
      deadline: input.deadline,
      status,
    },
  });

  await logAudit({
    userId,
    action: 'GOAL_CREATE',
    entityType: 'FINANCIAL_GOAL',
    entityId: goal.id,
    ipAddress,
  });

  return serializeGoal(goal);
}

export async function updateGoal(
  userId: string,
  goalId: string,
  input: UpdateGoalInput,
  ipAddress?: string | null
) {
  const existing = await prisma.financialGoal.findFirst({
    where: { id: goalId, userId },
  });
  if (!existing) {
    throw new AppError('Target tabungan tidak ditemukan', 404);
  }

  const targetAmount = input.targetAmount ?? input.target_amount;
  const updated = await prisma.financialGoal.update({
    where: { id: goalId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(targetAmount !== undefined ? { targetAmount } : {}),
      ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });

  await logAudit({
    userId,
    action: 'GOAL_UPDATE',
    entityType: 'FINANCIAL_GOAL',
    entityId: updated.id,
    ipAddress,
  });

  return serializeGoal(updated);
}

export async function contributeGoal(
  userId: string,
  goalId: string,
  input: ContributeGoalInput,
  ipAddress?: string | null
) {
  const existing = await prisma.financialGoal.findFirst({
    where: { id: goalId, userId },
  });
  if (!existing) {
    throw new AppError('Target tabungan tidak ditemukan', 404);
  }
  if (existing.status === GoalStatus.CANCELLED) {
    throw new AppError('Target tabungan yang dibatalkan tidak dapat disetor', 400);
  }

  const nextAmount = Number(existing.currentAmount) + input.amount;
  const targetAmount = Number(existing.targetAmount);
  const reachedTarget = nextAmount >= targetAmount;
  const nextStatus = reachedTarget ? GoalStatus.COMPLETED : GoalStatus.ACTIVE;

  const updated = await prisma.$transaction(async (tx) => {
    const goal = await tx.financialGoal.update({
      where: { id: goalId },
      data: {
        currentAmount: nextAmount,
        status: nextStatus,
      },
    });

    if (reachedTarget && existing.status !== GoalStatus.COMPLETED) {
      await tx.notification.create({
        data: {
          userId,
          type: NotificationType.GOAL_MILESTONE,
          title: `Target "${goal.name}" Tercapai!`,
          body: `Selamat! Tabungan "${goal.name}" telah mencapai target sebesar Rp ${targetAmount.toLocaleString('id-ID')}.`,
        },
      });
    }

    return goal;
  });

  await logAudit({
    userId,
    action: 'GOAL_CONTRIBUTE',
    entityType: 'FINANCIAL_GOAL',
    entityId: goalId,
    metadata: { amount: input.amount, reachedTarget },
    ipAddress,
  });

  return serializeGoal(updated);
}

export async function deleteGoal(
  userId: string,
  goalId: string,
  ipAddress?: string | null
) {
  const existing = await prisma.financialGoal.findFirst({
    where: { id: goalId, userId },
  });
  if (!existing) {
    throw new AppError('Target tabungan tidak ditemukan', 404);
  }

  await prisma.financialGoal.delete({ where: { id: goalId } });

  await logAudit({
    userId,
    action: 'GOAL_DELETE',
    entityType: 'FINANCIAL_GOAL',
    entityId: goalId,
    ipAddress,
  });

  return { deleted: true, goalId };
}
