import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, apiUpload } from '../../src/api/client';

const mock = vi.hoisted(() => ({
  state: { accessToken: 'old', refreshToken: 'refresh', sessionId: 'session', organizationId: null as string | null,
    setSession: vi.fn(), clear: vi.fn() },
  platform: { OS: 'web' }, fetch: vi.fn(), id: 0,
}));
vi.mock('react-native', () => ({ Platform: mock.platform }));
vi.mock('expo-constants', () => ({ default: {} }));
vi.mock('@/api/device', () => ({ createRequestId: () => 'request-' + ++mock.id, getOrCreateInstallId: async () => 'device' }));
vi.mock('@/store/auth-store', () => ({ useAuthStore: { getState: () => mock.state } }));
const ok = (data: unknown) => new Response(JSON.stringify({ data, meta: { requestId: 'test', nextCursor: null } }), { status: 200 });
const fail = (status: number) => new Response(JSON.stringify({ status, code: status === 401 ? 'SESSION_EXPIRED' : 'INTERNAL_ERROR', detail: 'Erreur', fields: [] }), { status });
beforeEach(() => {
  mock.fetch.mockReset(); mock.state.clear.mockReset(); mock.state.setSession.mockReset();
  Object.assign(mock.state, { accessToken: 'old', refreshToken: 'refresh', sessionId: 'session', organizationId: null });
  mock.state.setSession.mockImplementation(async (tokens: { accessToken: string; refreshToken: string; sessionId: string }) => { Object.assign(mock.state, tokens); });
  vi.stubGlobal('fetch', mock.fetch);
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('Network and session safety', () => {
  it('keeps the same idempotency key when retrying after token refresh', async () => {
    mock.fetch.mockResolvedValueOnce(fail(401)).mockResolvedValueOnce(ok({ accessToken: 'new', refreshToken: 'rotated', sessionId: 'rotated-session' })).mockResolvedValueOnce(ok({ id: 'one' }));
    expect((await apiRequest('/orders', { method: 'POST', body: { test: true }, idempotent: true })).data).toEqual({ id: 'one' });
    const first = mock.fetch.mock.calls[0]?.[1] as RequestInit;
    const retried = mock.fetch.mock.calls[2]?.[1] as RequestInit;
    expect((first.headers as Record<string, string>)['Idempotency-Key']).toBe((retried.headers as Record<string, string>)['Idempotency-Key']);
    expect((retried.headers as Record<string, string>).Authorization).toBe('Bearer new');
  });
  it('does not log out on a refresh network failure', async () => {
    mock.fetch.mockResolvedValueOnce(fail(401)).mockRejectedValueOnce(new TypeError('offline'));
    await expect(apiRequest('/me')).rejects.toMatchObject({ problem: { status: 0 } });
    expect(mock.state.clear).not.toHaveBeenCalled();
  });
  it('does not log out when the refresh server returns 500', async () => {
    mock.fetch.mockResolvedValueOnce(fail(401)).mockResolvedValueOnce(fail(500));
    await expect(apiRequest('/me')).rejects.toMatchObject({ problem: { status: 500 } });
    expect(mock.state.clear).not.toHaveBeenCalled();
  });
  it('clears a genuinely revoked session', async () => {
    mock.fetch.mockResolvedValueOnce(fail(401)).mockResolvedValueOnce(fail(401));
    await expect(apiRequest('/me')).rejects.toMatchObject({ problem: { status: 401 } });
    expect(mock.state.clear).toHaveBeenCalledOnce();
  });
  it('never restores an old account after logout during refresh', async () => {
    mock.fetch.mockResolvedValueOnce(fail(401)).mockImplementationOnce(async () => {
      mock.state.refreshToken = 'another-account';
      mock.state.sessionId = 'another-session';
      return ok({ accessToken: 'late-old-token' });
    });
    await expect(apiRequest('/me')).rejects.toMatchObject({ problem: { status: 401 } });
    expect(mock.state.setSession).not.toHaveBeenCalled();
    expect(mock.fetch).toHaveBeenCalledTimes(2);
  });
  it('aborts a stalled request and reports a recoverable error', async () => {
    vi.useFakeTimers();
    mock.fetch.mockImplementation((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const assertion = expect(apiRequest('/me')).rejects.toMatchObject({ problem: { status: 0 } });
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
  });
  it('uploads a real Blob on web instead of a native URI object', async () => {
    mock.fetch.mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } })).mockResolvedValueOnce(ok({ id: 'image' }));
    await apiUpload('/merchant/products/product/image', { uri: 'blob:local', name: 'dish.png' });
    const body = (mock.fetch.mock.calls[1]?.[1] as RequestInit).body as FormData;
    expect(body.get('image')).toBeInstanceOf(Blob);
    expect((body.get('image') as Blob).size).toBe(3);
  });
});
