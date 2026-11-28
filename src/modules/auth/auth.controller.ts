import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import type {
  GoogleLoginInput,
  LoginInput,
  LogoutInput,
  RefreshInput,
  RegisterInput,
  SetupInput,
  UpdateMeInput,
} from './auth.schema';
import * as authService from './auth.service';

function getRequestMeta(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}

export async function registerHandler(req: Request, res: Response) {
  const data = await authService.registerUser(
    req.body as RegisterInput,
    getRequestMeta(req)
  );
  return sendSuccess(res, 'Registrasi berhasil', data, 201);
}

export async function loginHandler(req: Request, res: Response) {
  const data = await authService.loginUser(
    req.body as LoginInput,
    getRequestMeta(req)
  );
  return sendSuccess(res, 'Login berhasil', data, 200);
}

export async function googleLoginHandler(req: Request, res: Response) {
  const { idToken } = req.body as GoogleLoginInput;
  const data = await authService.loginWithGoogle(idToken, getRequestMeta(req));
  return sendSuccess(res, 'Login dengan Google berhasil', data, 200);
}

export async function refreshHandler(req: Request, res: Response) {
  const body = req.body as RefreshInput;
  const data = await authService.refreshAccessToken(body.refreshToken);
  return sendSuccess(res, 'Access token diperbarui', data, 200);
}

export async function logoutHandler(req: Request, res: Response) {
  const userId = req.user!.userId;
  const body = (req.body ?? {}) as LogoutInput;
  await authService.logoutUser(userId, body?.refreshToken, getRequestMeta(req));
  return sendSuccess(res, 'Logout berhasil', null, 200);
}

export async function getMeHandler(req: Request, res: Response) {
  const user = await authService.getMe(req.user!.userId);
  return sendSuccess(res, 'Profil pengguna berhasil diambil', user, 200);
}

export async function updateMeHandler(req: Request, res: Response) {
  const user = await authService.updateMe(
    req.user!.userId,
    req.body as UpdateMeInput,
    getRequestMeta(req)
  );
  return sendSuccess(res, 'Profil pengguna berhasil diperbarui', user, 200);
}

export async function setupHandler(req: Request, res: Response) {
  const result = await authService.setupAccountBlueprint(
    req.user!.userId,
    req.body as SetupInput,
    getRequestMeta(req)
  );
  return sendSuccess(res, 'Setup blueprint akun berhasil disimpan', result, 201);
}
