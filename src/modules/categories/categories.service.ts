import { CategoryType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logAudit } from '../../utils/audit';
import { AppError } from '../../utils/errors';
import type { CreateCategoryInput, UpdateCategoryInput } from './categories.schema';

export async function listCategories(userId: string, typeFilter?: CategoryType) {
  const categories = await prisma.category.findMany({
    where: {
      userId,
      ...(typeFilter ? { type: typeFilter } : {}),
    },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });

  return categories.map((cat) => ({
    id: cat.id,
    userId: cat.userId,
    name: cat.name,
    type: cat.type,
    icon: cat.icon,
    color: cat.color,
    isDefault: cat.isDefault,
    transactionCount: cat._count.transactions,
    createdAt: cat.createdAt,
  }));
}

export async function createCategory(
  userId: string,
  input: CreateCategoryInput,
  ipAddress?: string | null
) {
  const duplicate = await prisma.category.findFirst({
    where: {
      userId,
      type: input.type,
      name: { equals: input.name, mode: 'insensitive' },
    },
  });
  if (duplicate) {
    throw new AppError('Kategori dengan nama dan tipe tersebut sudah ada', 409);
  }

  const created = await prisma.category.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      icon: input.icon,
      color: input.color,
      isDefault: false,
    },
  });

  await logAudit({
    userId,
    action: 'CATEGORY_CREATE',
    entityType: 'CATEGORY',
    entityId: created.id,
    ipAddress,
  });

  return {
    ...created,
    transactionCount: 0,
  };
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  input: UpdateCategoryInput,
  ipAddress?: string | null
) {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!existing) {
    throw new AppError('Kategori tidak ditemukan', 404);
  }

  if (input.name && input.name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await prisma.category.findFirst({
      where: {
        userId,
        type: existing.type,
        name: { equals: input.name, mode: 'insensitive' },
        id: { not: categoryId },
      },
    });
    if (duplicate) {
      throw new AppError('Nama kategori tersebut sudah digunakan', 409);
    }
  }

  const updated = await prisma.category.update({
    where: { id: categoryId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
    include: {
      _count: { select: { transactions: true } },
    },
  });

  await logAudit({
    userId,
    action: 'CATEGORY_UPDATE',
    entityType: 'CATEGORY',
    entityId: updated.id,
    ipAddress,
  });

  return {
    id: updated.id,
    userId: updated.userId,
    name: updated.name,
    type: updated.type,
    icon: updated.icon,
    color: updated.color,
    isDefault: updated.isDefault,
    transactionCount: updated._count.transactions,
    createdAt: updated.createdAt,
  };
}

export async function deleteCategory(
  userId: string,
  categoryId: string,
  ipAddress?: string | null
) {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!existing) {
    throw new AppError('Kategori tidak ditemukan', 404);
  }

  if (existing.isDefault) {
    throw new AppError('Kategori bawaan sistem tidak dapat dihapus', 400);
  }

  const [txCount, budgetCount] = await Promise.all([
    prisma.transaction.count({ where: { userId, categoryId } }),
    prisma.budget.count({ where: { userId, categoryId } }),
  ]);

  if (txCount > 0 || budgetCount > 0) {
    throw new AppError(
      'Kategori masih digunakan pada transaksi atau anggaran sehingga tidak dapat dihapus',
      400
    );
  }

  await prisma.category.delete({
    where: { id: categoryId },
  });

  await logAudit({
    userId,
    action: 'CATEGORY_DELETE',
    entityType: 'CATEGORY',
    entityId: categoryId,
    ipAddress,
  });

  return { deleted: true, categoryId };
}
