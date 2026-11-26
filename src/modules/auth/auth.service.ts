import { CategoryType, WalletType, type User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logAudit } from '../../utils/audit';
import { AppError } from '../../utils/errors';
import { comparePassword, hashPassword, sha256Hash } from '../../utils/hash';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import type {
  LoginInput,
  RegisterInput,
  SetupInput,
  UpdateMeInput,
} from './auth.schema';

const REFRESH_TOKEN_TTL_DAYS = 7;

const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}> = [
    { name: 'Makanan & Minuman', type: CategoryType.EXPENSE, icon: 'utensils', color: '#3B7AF5' },
    { name: 'Transportasi', type: CategoryType.EXPENSE, icon: 'car', color: '#F59E0B' },
    { name: 'Belanja', type: CategoryType.EXPENSE, icon: 'shopping', color: '#0D9488' },
    { name: 'Tagihan & Utilitas', type: CategoryType.EXPENSE, icon: 'zap', color: '#EF4444' },
    { name: 'Ngopi & Hiburan', type: CategoryType.EXPENSE, icon: 'coffee', color: '#64748B' },
    { name: 'Kesehatan', type: CategoryType.EXPENSE, icon: 'heart', color: '#EC4899' },
    { name: 'Gaji / Proyek', type: CategoryType.INCOME, icon: 'briefcase', color: '#10B981' },
    { name: 'Bonus & Hadiah', type: CategoryType.INCOME, icon: 'gift', color: '#3B7AF5' },
    { name: 'Investasi & Dividen', type: CategoryType.INCOME, icon: 'trending-up', color: '#059669' },
  ];

export interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function sanitizeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    currency: user.currency,
    monthlyIncomeTarget: user.monthlyIncomeTarget
      ? Number(user.monthlyIncomeTarget)
      : null,
    financialChallenge: user.financialChallenge,
    budgetRule: user.budgetRule,
    hasCompletedSetup: user.hasCompletedSetup,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function issueTokensAndSave(
  user: Pick<User, 'id' | 'email'>,
  meta: RequestMeta
) {
  const payload = { userId: user.id, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256Hash(refreshToken),
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

export async function registerUser(input: RegisterInput, meta: RequestMeta) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new AppError('Email sudah terdaftar', 409);
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
      },
    });

    await tx.wallet.create({
      data: {
        userId: createdUser.id,
        name: 'Uang Tunai',
        type: WalletType.CASH,
        initialBalance: 0,
        currentBalance: 0,
        color: '#10B981',
      },
    });

    await tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        userId: createdUser.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
      })),
    });

    return createdUser;
  });

  const tokens = await issueTokensAndSave(user, meta);

  await logAudit({
    userId: user.id,
    action: 'AUTH_REGISTER',
    entityType: 'USER',
    entityId: user.id,
    ipAddress: meta.ipAddress,
  });

  return {
    ...tokens,
    user: sanitizeUser(user),
  };
}

export async function loginUser(input: LoginInput, meta: RequestMeta) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (!user || !user.isActive) {
    throw new AppError('Email atau password salah', 401);
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError('Email atau password salah', 401);
  }

  const tokens = await issueTokensAndSave(user, meta);

  await logAudit({
    userId: user.id,
    action: 'AUTH_LOGIN',
    entityType: 'USER',
    entityId: user.id,
    ipAddress: meta.ipAddress,
  });

  return {
    ...tokens,
    user: sanitizeUser(user),
  };
}

export async function refreshAccessToken(refreshTokenInput: string) {
  let decoded: { userId: string; email: string };
  try {
    decoded = verifyRefreshToken(refreshTokenInput);
  } catch {
    throw new AppError('Refresh token tidak valid atau kedaluwarsa', 401);
  }

  const tokenHash = sha256Hash(refreshTokenInput);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (
    !storedToken ||
    storedToken.userId !== decoded.userId ||
    storedToken.revokedAt !== null ||
    storedToken.expiresAt <= new Date() ||
    !storedToken.user.isActive
  ) {
    throw new AppError('Refresh token sudah dicabut atau kedaluwarsa', 401);
  }

  const accessToken = signAccessToken({
    userId: storedToken.user.id,
    email: storedToken.user.email,
  });

  return { accessToken };
}

export async function logoutUser(
  userId: string,
  refreshTokenInput: string | undefined,
  meta: RequestMeta
) {
  const now = new Date();
  if (refreshTokenInput) {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        tokenHash: sha256Hash(refreshTokenInput),
        revokedAt: null,
      },
      data: { revokedAt: now },
    });
  } else {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: now },
    });
  }

  await logAudit({
    userId,
    action: 'AUTH_LOGOUT',
    entityType: 'USER',
    entityId: userId,
    ipAddress: meta.ipAddress,
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new AppError('Pengguna tidak ditemukan', 404);
  }
  return sanitizeUser(user);
}

export async function updateMe(
  userId: string,
  input: UpdateMeInput,
  meta: RequestMeta
) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!existing) {
    throw new AppError('Pengguna tidak ditemukan', 404);
  }

  const updateData: {
    name?: string;
    monthlyIncomeTarget?: number | null;
    financialChallenge?: string | null;
    budgetRule?: string | null;
    passwordHash?: string;
  } = {};

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  const incomeTarget = input.monthlyIncomeTarget ?? input.monthly_income_target;
  if (incomeTarget !== undefined) {
    updateData.monthlyIncomeTarget = incomeTarget;
  }

  const challenge = input.financialChallenge ?? input.financial_challenge;
  if (challenge !== undefined) {
    updateData.financialChallenge = challenge;
  }

  const rule = input.budgetRule ?? input.budget_rule;
  if (rule !== undefined) {
    updateData.budgetRule = rule;
  }

  if (input.newPassword) {
    if (!input.currentPassword) {
      throw new AppError('Password saat ini wajib diisi untuk mengganti password', 400);
    }
    const valid = await comparePassword(input.currentPassword, existing.passwordHash);
    if (!valid) {
      throw new AppError('Password saat ini tidak sesuai', 400);
    }
    updateData.passwordHash = await hashPassword(input.newPassword);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  await logAudit({
    userId,
    action: 'USER_UPDATE_PROFILE',
    entityType: 'USER',
    entityId: userId,
    ipAddress: meta.ipAddress,
  });

  return sanitizeUser(updated);
}

export async function setupAccountBlueprint(
  userId: string,
  input: SetupInput,
  meta: RequestMeta
) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        monthlyIncomeTarget:
          input.monthlyIncomeTarget ?? input.monthly_income_target ?? undefined,
        financialChallenge:
          input.financialChallenge ?? input.financial_challenge ?? undefined,
        budgetRule: input.budgetRule ?? input.budget_rule ?? undefined,
        hasCompletedSetup: true,
      },
    });

    const existingWallets = await tx.wallet.findMany({
      where: { userId },
    });

    const createdWallets = [];
    for (const w of input.wallets) {
      const balance = w.initialBalance ?? w.initial_balance ?? 0;
      const existingWallet = existingWallets.find(
        (ew) => ew.name.toLowerCase() === w.name.toLowerCase()
      );
      if (existingWallet) {
        createdWallets.push(existingWallet);
        continue;
      }
      const wallet = await tx.wallet.create({
        data: {
          userId,
          name: w.name,
          type: w.type,
          initialBalance: balance,
          currentBalance: balance,
          color: w.color,
          accountNumber: w.accountNumber ?? w.account_number ?? null,
        },
      });
      createdWallets.push(wallet);
    }

    const userCategories = await tx.category.findMany({
      where: { userId },
    });

    const createdBudgets = [];
    for (const b of input.budgets) {
      const limit = b.limitAmount ?? b.limit_amount;
      if (!limit) continue;

      let categoryId = b.categoryId ?? b.category_id;
      const rawCatName = (b.categoryName ?? b.category_name ?? '').trim();
      if (!categoryId && rawCatName) {
        const catName = rawCatName.toLowerCase();
        const matched =
          userCategories.find(
            (c) => c.name.toLowerCase() === catName && c.type === CategoryType.EXPENSE
          ) ??
          userCategories.find(
            (c) =>
              c.type === CategoryType.EXPENSE &&
              (c.name.toLowerCase().includes(catName) ||
                catName.includes(c.name.toLowerCase()))
          );
        if (matched) {
          categoryId = matched.id;
        } else {
          const createdCat = await tx.category.create({
            data: {
              userId,
              name: rawCatName,
              type: CategoryType.EXPENSE,
              icon: 'shopping',
              color: '#3B7AF5',
              isDefault: false,
            },
          });
          userCategories.push(createdCat);
          categoryId = createdCat.id;
        }
      }

      if (!categoryId) {
        continue;
      }

      const threshold = b.alertThresholdPct ?? b.alert_threshold_pct ?? 80;
      const budget = await tx.budget.upsert({
        where: {
          userId_categoryId_month_year: {
            userId,
            categoryId,
            month,
            year,
          },
        },
        update: {
          limitAmount: limit,
          alertThresholdPct: threshold,
        },
        create: {
          userId,
          categoryId,
          month,
          year,
          limitAmount: limit,
          alertThresholdPct: threshold,
        },
      });
      createdBudgets.push(budget);
    }

    return {
      user: sanitizeUser(updatedUser),
      wallets: createdWallets.map((w) => ({
        ...w,
        initialBalance: Number(w.initialBalance),
        currentBalance: Number(w.currentBalance),
      })),
      budgets: createdBudgets.map((b) => ({
        ...b,
        limitAmount: Number(b.limitAmount),
      })),
    };
  });

  await logAudit({
    userId,
    action: 'AUTH_SETUP_BLUEPRINT',
    entityType: 'USER',
    entityId: userId,
    metadata: {
      walletsCreated: result.wallets.length,
      budgetsCreated: result.budgets.length,
    },
    ipAddress: meta.ipAddress,
  });

  return result;
}
