import {
  GoalFundFlowType,
  GoalMutationType,
  GoalStatus,
  NotificationType,
  type FinancialGoal,
  type GoalMutation,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logAudit } from '../../utils/audit';
import { assertSufficientBalance } from '../../utils/balanceGuard';
import { AppError } from '../../utils/errors';
import type {
  ContributeGoalInput,
  CreateGoalInput,
  UpdateGoalInput,
  WithdrawGoalInput,
} from './goals.schema';

function serializeMutation(m: GoalMutation) {
  return {
    id: m.id,
    goalId: m.goalId,
    type: m.type,
    flowType: m.flowType,
    walletId: m.walletId,
    walletName: m.walletName,
    amount: Number(m.amount),
    note: m.note,
    createdAt: m.createdAt,
  };
}

function serializeGoal(goal: FinancialGoal & { mutations?: GoalMutation[] }) {
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
    mutations: goal.mutations ? goal.mutations.map(serializeMutation) : [],
  };
}

export async function listGoals(userId: string) {
  const goals = await prisma.financialGoal.findMany({
    where: { userId },
    include: {
      mutations: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
    orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
  });
  return goals.map(serializeGoal);
}

export async function getGoalById(userId: string, goalId: string) {
  const goal = await prisma.financialGoal.findFirst({
    where: { id: goalId, userId },
    include: {
      mutations: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });
  if (!goal) {
    throw new AppError('Target tabungan tidak ditemukan', 404);
  }
  return serializeGoal(goal);
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

  const useWalletForInitial =
    currentAmount > 0 &&
    input.initialSourceType === 'WALLET' &&
    Boolean(input.initialWalletId);

  const goal = await prisma.$transaction(async (tx) => {
    let walletNameSnapshot: string | null = null;
    let usedWalletId: string | null = null;

    if (useWalletForInitial && input.initialWalletId) {
      const wallet = await tx.wallet.findFirst({
        where: { id: input.initialWalletId, userId, isArchived: false },
      });
      if (!wallet) {
        throw new AppError('Dompet asal tidak ditemukan', 404);
      }
      assertSufficientBalance(wallet, currentAmount);

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { currentBalance: { decrement: currentAmount } },
      });

      walletNameSnapshot = wallet.name;
      usedWalletId = wallet.id;
    }

    const created = await tx.financialGoal.create({
      data: {
        userId,
        name: input.name,
        targetAmount,
        currentAmount,
        deadline: input.deadline,
        status,
      },
    });

    if (currentAmount > 0) {
      await tx.goalMutation.create({
        data: {
          userId,
          goalId: created.id,
          type: GoalMutationType.CONTRIBUTE,
          flowType: useWalletForInitial
            ? GoalFundFlowType.WALLET
            : GoalFundFlowType.EXTERNAL,
          walletId: usedWalletId,
          walletName: walletNameSnapshot,
          amount: currentAmount,
          note: 'Saldo awal tabungan',
        },
      });
    }

    return tx.financialGoal.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        mutations: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
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
    include: {
      mutations: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
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
  const effectiveSourceType: GoalFundFlowType =
    input.sourceType === 'EXTERNAL'
      ? GoalFundFlowType.EXTERNAL
      : input.sourceType === 'WALLET' || Boolean(input.walletId)
        ? GoalFundFlowType.WALLET
        : GoalFundFlowType.EXTERNAL;

  if (effectiveSourceType === GoalFundFlowType.WALLET && !input.walletId) {
    throw new AppError('Dompet asal wajib dipilih untuk setoran dari dompet', 400);
  }

  const nextAmount = currentAmount + input.amount;
  const reachedTarget = nextAmount >= targetAmount;
  const nextStatus = reachedTarget ? GoalStatus.COMPLETED : GoalStatus.ACTIVE;

  const updated = await prisma.$transaction(async (tx) => {
    let walletNameSnapshot: string | null = null;
    let usedWalletId: string | null = null;

    if (effectiveSourceType === GoalFundFlowType.WALLET && input.walletId) {
      const wallet = await tx.wallet.findFirst({
        where: { id: input.walletId, userId, isArchived: false },
      });
      if (!wallet) {
        throw new AppError('Dompet asal tidak ditemukan', 404);
      }
      assertSufficientBalance(wallet, input.amount);

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
          'Saldo dompet asal tidak mencukupi untuk setoran ini',
          400
        );
      }

      walletNameSnapshot = wallet.name;
      usedWalletId = wallet.id;
    }

    await tx.goalMutation.create({
      data: {
        userId,
        goalId,
        type: GoalMutationType.CONTRIBUTE,
        flowType: effectiveSourceType,
        walletId: usedWalletId,
        walletName: walletNameSnapshot,
        amount: input.amount,
        note: input.note?.trim() || null,
      },
    });

    const goal = await tx.financialGoal.update({
      where: { id: goalId },
      data: {
        currentAmount: nextAmount,
        status: nextStatus,
      },
      include: {
        mutations: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (reachedTarget && existing.status !== GoalStatus.COMPLETED) {
      await tx.notification.create({
        data: {
          userId,
          type: NotificationType.GOAL_MILESTONE,
          title: `Target "${goal.name}" Tercapai`,
          body: `Tabungan "${goal.name}" telah mencapai target sebesar Rp ${targetAmount.toLocaleString('id-ID')}.`,
        },
      });
    }

    // Invalidate cache AI Advisor & Anomali agar langsung menghitung ulang dengan data terbaru
    await tx.aiInsight.deleteMany({ where: { userId } });
    await tx.spendingAnomaly.deleteMany({ where: { userId } });

    return goal;
  });

  await logAudit({
    userId,
    action: 'GOAL_CONTRIBUTE',
    entityType: 'FINANCIAL_GOAL',
    entityId: goalId,
    metadata: {
      amount: input.amount,
      sourceType: effectiveSourceType,
      walletId: input.walletId ?? null,
      reachedTarget,
    },
    ipAddress,
  });

  return serializeGoal(updated);
}

export async function withdrawGoal(
  userId: string,
  goalId: string,
  input: WithdrawGoalInput,
  ipAddress?: string | null
) {
  const existing = await prisma.financialGoal.findFirst({
    where: { id: goalId, userId },
  });
  if (!existing) {
    throw new AppError('Target tabungan tidak ditemukan', 404);
  }

  const currentAmount = Number(existing.currentAmount);
  const targetAmount = Number(existing.targetAmount);

  if (currentAmount < input.amount) {
    throw new AppError(
      `Saldo tabungan tidak cukup (tersedia Rp ${currentAmount.toLocaleString('id-ID')})`,
      400
    );
  }

  const flowType: GoalFundFlowType =
    input.destinationType === 'WALLET'
      ? GoalFundFlowType.WALLET
      : GoalFundFlowType.EXTERNAL;

  if (flowType === GoalFundFlowType.WALLET && !input.walletId) {
    throw new AppError('Dompet tujuan wajib dipilih', 400);
  }

  const nextAmount = Math.max(0, currentAmount - input.amount);
  const nextStatus =
    nextAmount >= targetAmount ? GoalStatus.COMPLETED : GoalStatus.ACTIVE;

  const updated = await prisma.$transaction(async (tx) => {
    let walletNameSnapshot: string | null = null;
    let usedWalletId: string | null = null;

    if (flowType === GoalFundFlowType.WALLET && input.walletId) {
      const wallet = await tx.wallet.findFirst({
        where: { id: input.walletId, userId, isArchived: false },
      });
      if (!wallet) {
        throw new AppError('Dompet tujuan tidak ditemukan', 404);
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { currentBalance: { increment: input.amount } },
      });

      walletNameSnapshot = wallet.name;
      usedWalletId = wallet.id;
    }

    await tx.goalMutation.create({
      data: {
        userId,
        goalId,
        type: GoalMutationType.WITHDRAW,
        flowType,
        walletId: usedWalletId,
        walletName: walletNameSnapshot,
        amount: input.amount,
        note: input.note?.trim() || null,
      },
    });

    const updatedGoal = await tx.financialGoal.update({
      where: { id: goalId },
      data: {
        currentAmount: nextAmount,
        status: nextStatus,
      },
      include: {
        mutations: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    await tx.aiInsight.deleteMany({ where: { userId } });
    await tx.spendingAnomaly.deleteMany({ where: { userId } });

    return updatedGoal;
  });

  await logAudit({
    userId,
    action: 'GOAL_WITHDRAW',
    entityType: 'FINANCIAL_GOAL',
    entityId: goalId,
    metadata: {
      amount: input.amount,
      destinationType: flowType,
      walletId: input.walletId ?? null,
    },
    ipAddress,
  });

  return serializeGoal(updated);
}

export async function deleteGoal(
  userId: string,
  goalId: string,
  refundToWalletId?: string,
  ipAddress?: string | null
) {
  const existing = await prisma.financialGoal.findFirst({
    where: { id: goalId, userId },
  });
  if (!existing) {
    throw new AppError('Target tabungan tidak ditemukan', 404);
  }

  const currentAmount = Number(existing.currentAmount);

  await prisma.$transaction(async (tx) => {
    if (currentAmount > 0 && refundToWalletId) {
      const wallet = await tx.wallet.findFirst({
        where: { id: refundToWalletId, userId, isArchived: false },
      });
      if (!wallet) {
        throw new AppError('Dompet tujuan pengembalian tidak ditemukan', 404);
      }
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { currentBalance: { increment: currentAmount } },
      });
    }

    await tx.financialGoal.delete({ where: { id: goalId } });
  });

  await logAudit({
    userId,
    action: 'GOAL_DELETE',
    entityType: 'FINANCIAL_GOAL',
    entityId: goalId,
    metadata: {
      refundedAmount: currentAmount > 0 && refundToWalletId ? currentAmount : 0,
      refundToWalletId: refundToWalletId ?? null,
    },
    ipAddress,
  });

  return { deleted: true, goalId };
}
