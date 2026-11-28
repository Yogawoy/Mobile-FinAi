import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtUserPayload {
  userId: string;
  email: string;
}

export function signAccessToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
}

export function signRefreshToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): JwtUserPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
  }) as JwtUserPayload;
}

export function verifyRefreshToken(token: string): JwtUserPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
  }) as JwtUserPayload;
}
