import { GoalStatus } from '@prisma/client';
import { z } from 'zod';

export const createGoalSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama target wajib diisi').max(100),
    targetAmount: z.number().positive('Target nominal harus lebih dari 0').optional(),
    target_amount: z.number().positive('Target nominal harus lebih dari 0').optional(),
    currentAmount: z.number().min(0).optional(),
    current_amount: z.number().min(0).optional(),
    deadline: z.coerce.date(),
  })
  .refine((d) => Boolean(d.targetAmount ?? d.target_amount), {
    message: 'targetAmount wajib lebih dari 0',
    path: ['targetAmount'],
  });

export const updateGoalSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  targetAmount: z.number().positive().optional(),
  target_amount: z.number().positive().optional(),
  deadline: z.coerce.date().optional(),
  status: z.nativeEnum(GoalStatus).optional(),
});

export const contributeGoalSchema = z.object({
  amount: z.number().positive('Nominal setoran harus lebih dari 0'),
});

export const goalIdParamSchema = z.object({
  id: z.string().trim().min(1, 'ID target tidak valid'),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type ContributeGoalInput = z.infer<typeof contributeGoalSchema>;
