import { CategoryType } from '@prisma/client';
import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi').max(60),
  type: z.nativeEnum(CategoryType),
  icon: z.string().trim().min(1).max(40).optional(),
  color: z.string().trim().min(3).max(20).default('#3B7AF5'),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  icon: z.string().trim().min(1).max(40).optional(),
  color: z.string().trim().min(3).max(20).optional(),
});

export const categoryIdParamSchema = z.object({
  id: z.string().trim().min(1, 'ID kategori tidak valid'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
