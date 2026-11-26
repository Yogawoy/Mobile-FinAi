import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'finai_access_token';
const REFRESH_TOKEN_KEY = 'finai_refresh_token';
const SETUP_COMPLETED_KEY = 'finai_has_completed_setup';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://localhost:4000/api'
).replace(/\/+$/, '');

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setTokens(accessToken: string, refreshToken?: string): Promise<void> {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken !== undefined) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  },

  async getHasCompletedSetup(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(SETUP_COMPLETED_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  },

  async setHasCompletedSetup(completed: boolean): Promise<void> {
    await AsyncStorage.setItem(SETUP_COMPLETED_KEY, completed ? 'true' : 'false');
  },
};

export class ApiError extends Error {
  status: number;
  errors?: unknown;

  constructor(message: string, status: number, errors?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

let sessionExpiredHandler: (() => void | Promise<void>) | null = null;

export function setSessionExpiredHandler(
  handler: (() => void | Promise<void>) | null
) {
  sessionExpiredHandler = handler;
}

let activeRefreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return null;
      const json = (await res.json()) as {
        success?: boolean;
        data?: { accessToken?: string };
      };
      const newAccessToken = json?.data?.accessToken;
      if (!json?.success || !newAccessToken) return null;

      await tokenStorage.setTokens(newAccessToken);
      return newAccessToken;
    } catch {
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  skipAuth?: boolean;
  _isRetry?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeoutMs = 15000,
    skipAuth = false,
    _isRetry = false,
  } = options;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;
  const token = skipAuth ? null : await tokenStorage.getAccessToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (response.status === 401 && !skipAuth && !_isRetry) {
      const nextToken = await refreshAccessToken();
      if (nextToken) {
        return apiRequest<T>(path, { ...options, _isRetry: true });
      }
      await tokenStorage.clearTokens();
      if (sessionExpiredHandler) {
        await sessionExpiredHandler();
      }
    }

    const rawText = await response.text();
    let parsed: {
      success?: boolean;
      message?: string;
      data?: T;
      meta?: Record<string, unknown>;
      errors?: unknown;
    } | null = null;

    if (rawText) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = null;
      }
    }

    if (!response.ok || !parsed || !parsed.success) {
      const msg =
        parsed?.message || `Permintaan gagal (HTTP ${response.status})`;
      throw new ApiError(msg, response.status, parsed?.errors);
    }

    return parsed.data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(
        'Koneksi ke server habis waktu. Periksa jaringan Anda.',
        408
      );
    }

    throw new ApiError(
      'Tidak dapat terhubung ke server FinAI. Pastikan backend aktif dan URL benar.',
      0
    );
  } finally {
    clearTimeout(timer);
  }
}

export function getApiErrorMessage(
  err: unknown,
  fallback = 'Terjadi kesalahan pada server'
): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
