import type { Wallet } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logAuditBackground } from '../../utils/audit';
import { AppError } from '../../utils/errors';
import type { CreateWalletInput, UpdateWalletInput } from './wallets.schema';

function serializeWallet(wallet: Wallet, totalActiveBalance: number) {
  const currentBalance = Number(wallet.currentBalance);
  const allocationPercentage =
    !wallet.isArchived && totalActiveBalance > 0 && currentBalance > 0
      ? Math.round((currentBalance / totalActiveBalance) * 1000) / 10
      : 0;

  return {
    id: wallet.id,
    userId: wallet.userId,
    name: wallet.name,
    type: wallet.type,
    initialBalance: Number(wallet.initialBalance),
    currentBalance,
    color: wallet.color,
    accountNumber: wallet.accountNumber,
    isArchived: wallet.isArchived,
    allocationPercentage,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
  };
}

export async function listWallets(userId: string, includeArchived: boolean) {
  const wallets = await prisma.wallet.findMany({
    where: {
      userId,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    orderBy: [{ isArchived: 'asc' }, { createdAt: 'asc' }],
  });

  const activeWallets = includeArchived
    ? wallets.filter((w) => !w.isArchived)
    : wallets;

  const totalActiveBalance = activeWallets.reduce(
    (sum, w) => sum + Number(w.currentBalance),
    0
  );

  return {
    totalActiveBalance,
    wallets: wallets.map((w) => serializeWallet(w, totalActiveBalance)),
  };
}

export async function createWallet(
  userId: string,
  input: CreateWalletInput,
  ipAddress?: string | null
) {
  const balance = input.initialBalance ?? input.initial_balance ?? 0;
  if (balance < 0) {
    throw new AppError('Saldo awal dompet tidak boleh kurang dari Rp 0', 400);
  }
  const accountNumber = input.accountNumber ?? input.account_number ?? null;

  const wallet = await prisma.wallet.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      initialBalance: balance,
      currentBalance: balance,
      color: input.color,
      accountNumber,
    },
  });

  logAuditBackground({
    userId,
    action: 'WALLET_CREATE',
    entityType: 'WALLET',
    entityId: wallet.id,
    metadata: { name: wallet.name, type: wallet.type, initialBalance: balance },
    ipAddress,
  });

  return serializeWallet(wallet, balance);
}

export async function updateWallet(
  userId: string,
  walletId: string,
  input: UpdateWalletInput,
  ipAddress?: string | null
) {
  const existing = await prisma.wallet.findFirst({
    where: { id: walletId, userId },
  });
  if (!existing) {
    throw new AppError('Dompet tidak ditemukan', 404);
  }

  const isArchived = input.isArchived ?? input.is_archived;
  const accountNumber =
    input.accountNumber !== undefined
      ? input.accountNumber
      : input.account_number;

  const updated = await prisma.wallet.update({
    where: { id: walletId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(accountNumber !== undefined ? { accountNumber } : {}),
      ...(isArchived !== undefined ? { isArchived } : {}),
    },
  });

  logAuditBackground({
    userId,
    action: 'WALLET_UPDATE',
    entityType: 'WALLET',
    entityId: updated.id,
    ipAddress,
  });

  return serializeWallet(updated, Number(updated.currentBalance));
}

export async function deleteOrArchiveWallet(
  userId: string,
  walletId: string,
  ipAddress?: string | null
) {
  const [existing, txCount] = await Promise.all([
    prisma.wallet.findFirst({
      where: { id: walletId, userId },
      select: { id: true },
    }),
    prisma.transaction.count({
      where: {
        userId,
        OR: [{ walletId }, { destinationWalletId: walletId }],
      },
    }),
  ]);
  if (!existing) {
    throw new AppError('Dompet tidak ditemukan', 404);
  }

  if (txCount > 0) {
    const archived = await prisma.wallet.update({
      where: { id: walletId },
      data: { isArchived: true },
    });

    logAuditBackground({
      userId,
      action: 'WALLET_ARCHIVE',
      entityType: 'WALLET',
      entityId: walletId,
      metadata: { reason: 'has_transactions', txCount },
      ipAddress,
    });

    return {
      archived: true,
      deleted: false,
      wallet: serializeWallet(archived, 0),
    };
  }

  await prisma.wallet.delete({
    where: { id: walletId },
  });

  logAuditBackground({
    userId,
    action: 'WALLET_DELETE',
    entityType: 'WALLET',
    entityId: walletId,
    ipAddress,
  });

  return {
    archived: false,
    deleted: true,
    walletId,
  };
}
