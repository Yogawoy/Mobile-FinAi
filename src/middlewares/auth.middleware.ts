import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Token autentikasi tidak ditemukan', 401);
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return sendError(res, 'Token autentikasi tidak valid', 401);
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };
    return next();
  } catch {
    return sendError(res, 'Token tidak valid atau sudah kedaluwarsa', 401);
  }
}
