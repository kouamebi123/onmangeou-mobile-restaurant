import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../src/store/auth-store';
import type { TokenPair } from '../../src/api/types';

vi.mock('@/store/secure-session', () => ({
  clearStoredSession: vi.fn(async () => {}),
  readStoredSession: vi.fn(async () => null),
  writeStoredSession: vi.fn(async () => {}),
}));
const tokens = (id: string): TokenPair => ({
  accessToken: 'access', refreshToken: 'refresh', sessionId: id,
  accessTokenExpiresAt: '', refreshTokenExpiresAt: '', accountCreated: false,
});
beforeEach(async () => { await useAuthStore.getState().clear(); });
describe('Private query cache identity', () => {
  it('preserves the cache scope when the server rotates the session ID', async () => {
    await useAuthStore.getState().setSession(tokens('original'));
    await useAuthStore.getState().setSession(tokens('rotated'), undefined, true);
    expect(useAuthStore.getState().sessionId).toBe('rotated');
    expect(useAuthStore.getState().sessionScope).toBe('original');
  });
  it('changes the scope for a new login', async () => {
    await useAuthStore.getState().setSession(tokens('first'));
    await useAuthStore.getState().setSession(tokens('second'));
    expect(useAuthStore.getState().sessionScope).toBe('second');
  });
  it('clears the scope on logout', async () => {
    await useAuthStore.getState().setSession(tokens('first'));
    await useAuthStore.getState().clear();
    expect(useAuthStore.getState().sessionScope).toBeNull();
  });
});
