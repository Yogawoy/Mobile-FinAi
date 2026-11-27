import { GoalStatus, NotificationType, TransactionType, type FinancialGoal } from '@prisma/client';
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

  const currentAmount = Number(existing.currentAmount);
  const targetAmount = Number(existing.targetAmount);
  const remaining = Math.max(0, targetAmount - currentAmount);

  if (existing.status === GoalStatus.COMPLETED || remaining <= 0) {
    throw new AppError('Target tabungan ini sudah tercapai 100%', 400);
  }

  if (input.amount > remaining) {
    throw new AppError(
      `Nominal setoran melebihi sisa kekurangan target (maksimal Rp ${remaining.toLocaleString('id-ID')})`,
      400
    );
  }

  const nextAmount = currentAmount + input.amount;
  const reachedTarget = nextAmount >= targetAmount;
  const nextStatus = reachedTarget ? GoalStatus.COMPLETED : GoalStatus.ACTIVE;

  const updated = await prisma.$transaction(async (tx) => {
    if (input.walletId) {
      const debited = await tx.wallet.updateMany({
        where: {
          id: input.walletId,
          userId,
          isArchived: false,
          currentBalance: { gte: input.amount },
        },
        data: { currentBalance: { decrement: input.amount } },
      });

      if (debited.count === 0) {
        throw new AppError(
          'Saldo dompet asal tidak mencukupi atau dompet tidak ditemukan',
          400
        );
      }

      const isTransfer = Boolean(
        input.destinationWalletId && input.destinationWalletId !== input.walletId
      );

      if (isTransfer && input.destinationWalletId) {
        const credited = await tx.wallet.updateMany({
          where: {
            id: input.destinationWalletId,
            userId,
            isArchived: false,
          },
          data: { currentBalance: { increment: input.amount } },
        });
        if (credited.count === 0) {
          throw new AppError('Dompet tujuan tabungan tidak ditemukan', 404);
        }
      }

      await tx.transaction.create({
        data: {
          userId,
          walletId: input.walletId,
          destinationWalletId: isTransfer ? input.destinationWalletId! : null,
          categoryId: null,
          type: isTransfer ? TransactionType.TRANSFER : TransactionType.EXPENSE,
          amount: input.amount,
          note: input.note?.trim() || `Setoran target ${existing.name}`,
          transactionDate: new Date(),
        },
      });
    }

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
