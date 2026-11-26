import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function sha256Hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
