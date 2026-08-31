import { kvDelete, kvGet, kvSet } from '@/store/kv-store';

const PREFIX = 'onmangeou.session.';

export const SESSION_KEYS = {
  accessToken: `${PREFIX}accessToken`,
  refreshToken: `${PREFIX}refreshToken`,
  sessionId: `${PREFIX}sessionId`,
  accessTokenExpiresAt: `${PREFIX}accessTokenExpiresAt`,
  refreshTokenExpiresAt: `${PREFIX}refreshTokenExpiresAt`,
  organizationId: `${PREFIX}organizationId`,
} as const;

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  organizationId: string | null;
}

export async function readStoredSession(): Promise<StoredSession | null> {
  const accessToken = await kvGet(SESSION_KEYS.accessToken);
  const refreshToken = await kvGet(SESSION_KEYS.refreshToken);
  const sessionId = await kvGet(SESSION_KEYS.sessionId);
  const accessTokenExpiresAt = await kvGet(SESSION_KEYS.accessTokenExpiresAt);
  const refreshTokenExpiresAt = await kvGet(SESSION_KEYS.refreshTokenExpiresAt);
  const organizationId = await kvGet(SESSION_KEYS.organizationId);

  if (!accessToken || !refreshToken || !sessionId || !accessTokenExpiresAt || !refreshTokenExpiresAt) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    sessionId,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    organizationId,
  };
}

export async function writeStoredSession(session: StoredSession): Promise<void> {
  await kvSet(SESSION_KEYS.accessToken, session.accessToken);
  await kvSet(SESSION_KEYS.refreshToken, session.refreshToken);
  await kvSet(SESSION_KEYS.sessionId, session.sessionId);
  await kvSet(SESSION_KEYS.accessTokenExpiresAt, session.accessTokenExpiresAt);
  await kvSet(SESSION_KEYS.refreshTokenExpiresAt, session.refreshTokenExpiresAt);
  if (session.organizationId) {
    await kvSet(SESSION_KEYS.organizationId, session.organizationId);
  } else {
    await kvDelete(SESSION_KEYS.organizationId);
  }
}

export async function clearStoredSession(): Promise<void> {
  await Promise.all(Object.values(SESSION_KEYS).map((key) => kvDelete(key)));
}
