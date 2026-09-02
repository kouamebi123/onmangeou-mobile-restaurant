import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { createRequestId, getOrCreateInstallId } from '@/api/device';
import { ApiError, fallbackProblem, isProblemDetails, unwrapEnvelope } from '@/api/envelope';
import type { ResponseEnvelope, TokenPair } from '@/api/types';
import { normalizeApiBaseUrl } from '@/api/url';
import { useAuthStore } from '@/store/auth-store';
import { t } from '@/i18n';

const DEFAULT_API_URL = 'https://onmangeou-backend-api-production.up.railway.app/api/v1';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
  idempotent?: boolean;
  idempotencyKey?: string;
}

export interface UploadAsset {
  uri: string;
  name?: string;
  mimeType?: string;
}

let refreshInFlight: Promise<string | null> | null = null;

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

async function refreshSession(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const { refreshToken, organizationId, setSession, clear } = useAuthStore.getState();
    if (!refreshToken) {
      return null;
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
      if (useAuthStore.getState().refreshToken !== refreshToken || useAuthStore.getState().organizationId !== organizationId) return null;
      await setSession(envelope.data, undefined, true);
      return envelope.data.sessionId;
    } catch (error) {
      if (useAuthStore.getState().refreshToken !== refreshToken || useAuthStore.getState().organizationId !== organizationId) return null;
      // A network/server outage is not proof that the session was revoked.
      if (error instanceof ApiError && error.problem.status === 401) {
        await clear();
        return null;
      }
      throw error;
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

  const response = await fetchResponse(buildUrl(path, options.query), {
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
  const sessionId = useAuthStore.getState().sessionId;
  const organizationId = useAuthStore.getState().organizationId;
  const stableOptions = options.idempotent && !options.idempotencyKey
    ? { ...options, idempotencyKey: createRequestId() } : options;
  try {
    return await rawRequest<T>(path, stableOptions);
  } catch (error) {
    const unauthorized =
      error instanceof ApiError && (error.problem.status === 401 || error.problem.code === 'SESSION_EXPIRED');
    const canRefresh = options.auth !== false && sessionId === useAuthStore.getState().sessionId
      && organizationId === useAuthStore.getState().organizationId && Boolean(useAuthStore.getState().refreshToken);

    if (unauthorized && canRefresh && !path.startsWith('/auth/refresh')) {
      const refreshed = await refreshSession();
      if (refreshed && refreshed === useAuthStore.getState().sessionId && organizationId === useAuthStore.getState().organizationId) {
        return rawRequest<T>(path, stableOptions);
      }
    }

    throw error;
  }
}

async function fetchResponse(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new ApiError(fallbackProblem(t(controller.signal.aborted ? 'network.timeout' : 'network.offline')));
  } finally {
    clearTimeout(timeout);
  }
}

async function rawUpload<T>(path: string, asset: UploadAsset): Promise<ResponseEnvelope<T>> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const localImage = await fetchResponse(asset.uri, {});
    if (!localImage.ok) throw new ApiError(fallbackProblem(t('imagePicker.unreadable')));
    form.append('image', await localImage.blob(), asset.name ?? 'image.jpg');
  } else {
    form.append('image', {
      uri: asset.uri,
      name: asset.name ?? 'image.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  }
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Request-Id': createRequestId(),
    'X-Device-Install-Id': await getOrCreateInstallId(),
  };
  const token = useAuthStore.getState().accessToken;
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetchResponse(buildUrl(path), { method: 'POST', headers, body: form });
  const parsed = await parseBody(response);
  if (!response.ok) {
    throw new ApiError(isProblemDetails(parsed) ? parsed : fallbackProblem("L'envoi de l'image a échoué."));
  }
  return unwrapEnvelope<T>(parsed);
}

export async function apiUpload<T>(path: string, asset: UploadAsset): Promise<ResponseEnvelope<T>> {
  const sessionId = useAuthStore.getState().sessionId;
  const organizationId = useAuthStore.getState().organizationId;
  try {
    return await rawUpload<T>(path, asset);
  } catch (error) {
    const unauthorized = error instanceof ApiError && error.problem.status === 401;
    if (unauthorized && sessionId === useAuthStore.getState().sessionId && organizationId === useAuthStore.getState().organizationId) {
      const refreshed = await refreshSession();
      if (refreshed && refreshed === useAuthStore.getState().sessionId && organizationId === useAuthStore.getState().organizationId) return rawUpload<T>(path, asset);
    }
    throw error;
  }
}
