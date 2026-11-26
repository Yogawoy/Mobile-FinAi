import { getApiUrlOverride, getSessionToken } from '@/lib/storage';
import type { ApiResponse, ErrorCode } from '@/types/api';

export const DEFAULT_PRODUCTION_API_URL = 'https://finai-yogawoy8-9503s-projects.vercel.app';

export class ApiClientError extends Error {
  code: ErrorCode | string;
  status: number;
  details?: Record<string, string[]>;

  constructor(
    code: ErrorCode | string,
    message: string,
    status: number,
    details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

let unauthorizedHandler: (() => void | Promise<void>) | null = null;

export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null) {
  unauthorizedHandler = handler;
}

export async function getApiBaseUrl(): Promise<string> {
  const override = await getApiUrlOverride();
  if (override) return override;

  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');

  return DEFAULT_PRODUCTION_API_URL;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  skipAuth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeoutMs = 15000,
    skipAuth = false,
  } = options;

  const baseUrl = await getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;

  const token = skipAuth ? null : await getSessionToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-client-type': 'mobile',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const rawText = await response.text();
    let parsed: ApiResponse<T> | null = null;

    if (rawText) {
      try {
        parsed = JSON.parse(rawText) as ApiResponse<T>;
      } catch {
        parsed = null;
      }
    }

    if (!response.ok || !parsed || !parsed.success) {
      const errCode = parsed && !parsed.success ? parsed.error.code : 'INTERNAL_ERROR';
      const errMessage =
        parsed && !parsed.success
          ? parsed.error.message
          : `Permintaan gagal (HTTP ${response.status})`;
      const errDetails = parsed && !parsed.success ? parsed.error.details : undefined;

      if (response.status === 401 && !skipAuth && unauthorizedHandler) {
        await unauthorizedHandler();
      }

      throw new ApiClientError(errCode, errMessage, response.status, errDetails);
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError(
        'TIMEOUT_ERROR',
        'Koneksi ke server habis waktu. Periksa jaringan Anda.',
        408
      );
    }

    throw new ApiClientError(
      'NETWORK_ERROR',
      'Tidak dapat terhubung ke server FinAI. Pastikan internet atau server lokal aktif.',
      0
    );
  } finally {
    clearTimeout(timer);
  }
}

export function extractErrorMessage(error: unknown, fallback = 'Terjadi kesalahan'): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
