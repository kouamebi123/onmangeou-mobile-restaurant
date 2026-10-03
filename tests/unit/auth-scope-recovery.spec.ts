import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoredSession } from '../../src/store/secure-session';

const storage = vi.hoisted(() => ({ session: null as StoredSession | null }));
vi.mock('@/store/secure-session', () => ({
  readStoredSession: async () => storage.session,
  writeStoredSession: async (session: StoredSession) => {
    storage.session = session;
  },
  clearStoredSession: async () => {
    storage.session = null;
  },
}));

import { useAuthStore } from '../../src/store/auth-store';

const tokens = (name: string) => ({
  accessToken: `${name}-access`,
  refreshToken: `${name}-refresh`,
  sessionId: `${name}-session`,
  accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
  refreshTokenExpiresAt: '2030-02-01T00:00:00.000Z',
  accountCreated: false,
});

const stored = (name: string, organizationId: string | null): StoredSession => {
  const pair = tokens(name);
  return {
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken,
    sessionId: pair.sessionId,
    accessTokenExpiresAt: pair.accessTokenExpiresAt,
    refreshTokenExpiresAt: pair.refreshTokenExpiresAt,
    organizationId,
  };
};

beforeEach(async () => {
  storage.session = null;
  await useAuthStore.getState().clear();
});

describe('Merchant scope recovery', () => {
  it('never starts for a session that has just been opened by signing in', async () => {
    await useAuthStore.getState().hydrate();
    // Sign-in stores the tokens first and scopes them to the organization next:
    // a recovery started in between would replay the same refresh token.
    await useAuthStore.getState().setSession(tokens('login'));

    expect(useAuthStore.getState().organizationId).toBeNull();
    expect(useAuthStore.getState().scopeRecoveryPending).toBe(false);
  });

  it('starts for a stored session that has no organization', async () => {
    storage.session = stored('legacy', null);
    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().scopeRecoveryPending).toBe(true);
  });

  it('does not start for a stored session that already has its organization', async () => {
    storage.session = stored('scoped', 'org-1');
    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().scopeRecoveryPending).toBe(false);
  });

  it('stays pending during the identity refresh and ends once the organization is restored', async () => {
    storage.session = stored('legacy', null);
    await useAuthStore.getState().hydrate();

    await useAuthStore.getState().setSession(tokens('identity'), null, true);
    expect(useAuthStore.getState().scopeRecoveryPending).toBe(true);

    await useAuthStore.getState().setSession(tokens('scoped'), 'org-1', true);
    expect(useAuthStore.getState().scopeRecoveryPending).toBe(false);
    expect(storage.session?.organizationId).toBe('org-1');
  });

  it('ends when the account has no restaurant yet, and on sign-out', async () => {
    storage.session = stored('legacy', null);
    await useAuthStore.getState().hydrate();
    useAuthStore.getState().finishScopeRecovery();
    expect(useAuthStore.getState().scopeRecoveryPending).toBe(false);

    storage.session = stored('legacy', null);
    await useAuthStore.getState().hydrate();
    await useAuthStore.getState().clear();
    expect(useAuthStore.getState().scopeRecoveryPending).toBe(false);
  });
});
