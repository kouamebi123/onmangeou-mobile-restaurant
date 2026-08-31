const API_PREFIX = '/api/v1';

/** Accepte une origine seule ou une URL d'API déjà préfixée. */
export function normalizeApiBaseUrl(value: string): string {
  const base = value.trim().replace(/\/+$/, '');

  return base.endsWith(API_PREFIX) ? base : `${base}${API_PREFIX}`;
}
