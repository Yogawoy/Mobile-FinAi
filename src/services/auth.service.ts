import { apiRequest } from '@/lib/api-client';
import type {
  AuthResponseData,
  LoginPayload,
  RegisterPayload,
  SafeUser,
} from '@/types/api';

export const authService = {
  login(payload: LoginPayload) {
    return apiRequest<AuthResponseData>('/api/auth/login', {
      method: 'POST',
      body: {
        email: payload.email.trim(),
        password: payload.password,
        rememberMe: payload.rememberMe ?? true,
      },
      skipAuth: true,
    });
  },

  register(payload: RegisterPayload) {
    return apiRequest<AuthResponseData>('/api/auth/register', {
      method: 'POST',
      body: {
        name: payload.name.trim(),
        email: payload.email.trim(),
        password: payload.password,
      },
      skipAuth: true,
    });
  },

  me() {
    return apiRequest<{ user: SafeUser }>('/api/auth/me');
  },

  updateProfile(name: string) {
    return apiRequest<{ user: SafeUser }>('/api/auth/me', {
      method: 'PATCH',
      body: { name: name.trim() },
    });
  },

  logout() {
    return apiRequest<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    });
  },
};
