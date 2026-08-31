import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { createRequestId, getOrCreateInstallId } from '@/api/device';
import { ApiError, fallbackProblem, isProblemDetails, unwrapEnvelope } from '@/api/envelope';
import type { ResponseEnvelope, TokenPair } from '@/api/types';
import { normalizeApiBaseUrl } from '@/api/url';
import { useAuthStore } from '@/store/auth-store';

const DEFAULT_API_URL = 'https://onmangeou-backend-api-production.up.railway.app/api/v1';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
  idempotent?: boolean;
  idempotencyKey?: string;
}

let refreshInFlight: Promise<boolean> | null = null;

export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;
  if (Platform.OS === 'web' || !/localhost|127\.0\.0\.1/.test(configured)) {
    return normalizeApiBaseUrl(configured);
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return normalizeApiBaseUrl(configured);
  }
  return normalizeApiBaseUrl(configured.replace(/localhost|127\.0\.0\.1/, host));
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${normalized}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(fallbackProblem('Reponse illisible du service.'));
  }
}

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const { refreshToken, organizationId, setSession, clear } = useAuthStore.getState();
    if (!refreshToken) {
      return false;
    }

    try {
      const body: { refreshToken: string; organizationId?: string } = { refreshToken };
      if (organizationId) {
        body.organizationId = organizationId;
      }
      const envelope = await rawRequest<TokenPair>('/auth/refresh', {
        method: 'POST',
        body,
        auth: false,
      });
      await setSession(envelope.data);
      return true;
    } catch {
      await clear();
      return false;
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<ResponseEnvelope<T>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Request-Id': createRequestId(),
    'X-Device-Install-Id': await getOrCreateInstallId(),
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth !== false) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  if (options.idempotent) {
    headers['Idempotency-Key'] = options.idempotencyKey ?? createRequestId();
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const parsed = await parseBody(response);

  if (!response.ok) {
    if (isProblemDetails(parsed)) {
      throw new ApiError(parsed);
    }
    throw new ApiError(fallbackProblem('La demande n\'a pas abouti. Reessayez.'));
  }

  if (response.status === 204 || parsed === null) {
    return {
      data: null as T,
      meta: { requestId: headers['X-Request-Id'] ?? 'local', nextCursor: null },
    };
  }

  return unwrapEnvelope<T>(parsed);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ResponseEnvelope<T>> {
  try {
    return await rawRequest<T>(path, options);
  } catch (error) {
    const unauthorized =
      error instanceof ApiError && (error.problem.status === 401 || error.problem.code === 'SESSION_EXPIRED');
    const canRefresh = options.auth !== false && Boolean(useAuthStore.getState().refreshToken);

    if (unauthorized && canRefresh && !path.startsWith('/auth/refresh')) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return rawRequest<T>(path, options);
      }
    }

    throw error;
  }
}
