import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';

export function notFoundHandler(req: Request, res: Response) {
  return sendError(res, `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`, 404);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.errors);
  }

  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return sendError(res, 'Validasi input gagal', 422, errors);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return sendError(res, 'Data duplikat sudah terdaftar', 409);
    }
    if (err.code === 'P2025') {
      return sendError(res, 'Data tidak ditemukan', 404);
    }
    if (err.code === 'P2003') {
      return sendError(res, 'Relasi data tidak valid atau masih digunakan', 400);
    }
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(res, 'Format JSON pada request body tidak valid', 400);
  }

  if (env.NODE_ENV !== 'production') {
    console.error(
      'Unhandled API error:',
      err instanceof Error ? err.stack || err.message : err
    );
  } else {
    console.error('Unhandled API error:', err instanceof Error ? err.message : 'Unknown error');
  }
  return sendError(res, 'Terjadi kesalahan internal pada server', 500);
}
