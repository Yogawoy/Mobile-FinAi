import { CategoryType } from '@prisma/client';
import type { Request, Response } from 'express';
import { AppError } from '../../utils/errors';
import { sendSuccess } from '../../utils/response';
import type { CreateCategoryInput, UpdateCategoryInput } from './categories.schema';
import * as categoriesService from './categories.service';

export async function listCategoriesHandler(req: Request, res: Response) {
  const rawType = req.query.type ? String(req.query.type).toUpperCase() : undefined;
  let typeFilter: CategoryType | undefined;
  if (rawType) {
    if (rawType !== CategoryType.INCOME && rawType !== CategoryType.EXPENSE) {
      throw new AppError('Parameter type harus INCOME atau EXPENSE', 400);
    }
    typeFilter = rawType;
  }

  const data = await categoriesService.listCategories(req.user!.userId, typeFilter);
  return sendSuccess(res, 'Daftar kategori berhasil diambil', data);
}

export async function createCategoryHandler(req: Request, res: Response) {
  const created = await categoriesService.createCategory(
    req.user!.userId,
    req.body as CreateCategoryInput,
    req.ip ?? null
  );
  return sendSuccess(res, 'Kategori baru berhasil dibuat', created, 201);
}

export async function updateCategoryHandler(req: Request, res: Response) {
  const updated = await categoriesService.updateCategory(
    req.user!.userId,
    String(req.params.id),
    req.body as UpdateCategoryInput,
    req.ip ?? null
  );
  return sendSuccess(res, 'Kategori berhasil diperbarui', updated);
}

export async function deleteCategoryHandler(req: Request, res: Response) {
  const result = await categoriesService.deleteCategory(
    req.user!.userId,
    String(req.params.id),
    req.ip ?? null
  );
  return sendSuccess(res, 'Kategori berhasil dihapus', result);
}
