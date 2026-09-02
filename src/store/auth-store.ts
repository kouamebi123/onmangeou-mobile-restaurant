import { create } from 'zustand';

import type { TokenPair } from '@/api/types';
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
  type StoredSession,
} from '@/store/secure-session';

interface AuthState {
  hydrated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  sessionScope: string | null;
  organizationId: string | null;
  hydrate: () => Promise<void>;
  setSession: (tokens: TokenPair, organizationId?: string | null, isRefresh?: boolean) => Promise<void>;
  setOrganizationId: (organizationId: string | null) => Promise<void>;
  clear: () => Promise<void>;
}

function toStored(tokens: TokenPair, organizationId: string | null): StoredSession {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    sessionId: tokens.sessionId,
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
    organizationId,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  accessToken: null,
  refreshToken: null,
  sessionId: null,
  sessionScope: null,
  organizationId: null,

  hydrate: async () => {
    const stored = await readStoredSession();
    set({
      hydrated: true,
      accessToken: stored?.accessToken ?? null,
      refreshToken: stored?.refreshToken ?? null,
      sessionId: stored?.sessionId ?? null,
      sessionScope: stored?.sessionId ?? null,
      organizationId: stored?.organizationId ?? null,
    });
  },

  setSession: async (tokens, organizationId, isRefresh = false) => {
    const nextOrganizationId = organizationId === undefined ? get().organizationId : organizationId;
    await writeStoredSession(toStored(tokens, nextOrganizationId));
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId: tokens.sessionId,
      sessionScope: isRefresh ? get().sessionScope : tokens.sessionId,
      organizationId: nextOrganizationId,
    });
  },

  setOrganizationId: async (organizationId) => {
    const { accessToken, refreshToken, sessionId } = get();
    if (!accessToken || !refreshToken || !sessionId) {
      set({ organizationId });
      return;
    }
    await writeStoredSession({
      accessToken,
      refreshToken,
      sessionId,
      accessTokenExpiresAt: (await readStoredSession())?.accessTokenExpiresAt ?? '',
      refreshTokenExpiresAt: (await readStoredSession())?.refreshTokenExpiresAt ?? '',
      organizationId,
    });
    set({ organizationId });
  },

  clear: async () => {
    await clearStoredSession();
    set({
      accessToken: null,
      refreshToken: null,
      sessionId: null,
      sessionScope: null,
      organizationId: null,
    });
  },
}));
