import type { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200,
  meta?: Record<string, unknown>
) {
  const payload: Record<string, unknown> = {
    success: true,
    message,
  };
  if (data !== undefined) {
    payload.data = data;
  }
  if (meta !== undefined) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: unknown
) {
  const payload: Record<string, unknown> = {
    success: false,
    message,
  };
  if (errors !== undefined) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
}
