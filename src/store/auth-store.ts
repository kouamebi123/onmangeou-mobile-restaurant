import { create } from "zustand";

import type { TokenPair } from "@/api/types";
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
  type StoredSession,
} from "@/store/secure-session";

interface AuthState {
  hydrated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  sessionScope: string | null;
  organizationId: string | null;
  /**
   * True only for a session restored from storage without its organization
   * (written by an older version of the app). A session opened by signing in
   * is scoped by the sign-in flow itself: recovering it in parallel would
   * replay the same refresh token and the API would revoke the whole session.
   */
  scopeRecoveryPending: boolean;
  hydrate: () => Promise<void>;
  finishScopeRecovery: () => void;
  setSession: (
    tokens: TokenPair,
    organizationId?: string | null,
    isRefresh?: boolean,
  ) => Promise<void>;
  setOrganizationId: (organizationId: string | null) => Promise<void>;
  clear: () => Promise<void>;
}

function toStored(
  tokens: TokenPair,
  organizationId: string | null,
): StoredSession {
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
  scopeRecoveryPending: false,

  hydrate: async () => {
    const stored = await readStoredSession();
    set({
      hydrated: true,
      accessToken: stored?.accessToken ?? null,
      refreshToken: stored?.refreshToken ?? null,
      sessionId: stored?.sessionId ?? null,
      sessionScope: stored?.sessionScope ?? stored?.sessionId ?? null,
      organizationId: stored?.organizationId ?? null,
      scopeRecoveryPending:
        Boolean(stored?.refreshToken) && !stored?.organizationId,
    });
  },

  finishScopeRecovery: () => set({ scopeRecoveryPending: false }),

  setSession: async (tokens, organizationId, isRefresh = false) => {
    const nextOrganizationId =
      organizationId === undefined ? get().organizationId : organizationId;
    await writeStoredSession({
      ...toStored(tokens, nextOrganizationId),
      sessionScope: isRefresh
        ? (get().sessionScope ?? tokens.sessionId)
        : tokens.sessionId,
    });
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId: tokens.sessionId,
      sessionScope: isRefresh ? get().sessionScope : tokens.sessionId,
      organizationId: nextOrganizationId,
      // A new sign-in owns its own scoping; a recovered scope ends the recovery.
      scopeRecoveryPending:
        isRefresh && !nextOrganizationId ? get().scopeRecoveryPending : false,
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
      sessionScope: get().sessionScope ?? sessionId,
      accessTokenExpiresAt:
        (await readStoredSession())?.accessTokenExpiresAt ?? "",
      refreshTokenExpiresAt:
        (await readStoredSession())?.refreshTokenExpiresAt ?? "",
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
      scopeRecoveryPending: false,
    });
  },
}));
