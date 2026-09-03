import { describe, expect, it, vi } from "vitest";
import {
  changePushPreference,
  currentPushPreference,
  serializePushSubscription,
} from "../../src/features/notifications/subscription-lock";

describe("push subscription races", () => {
  it("uses a native compatibility fingerprint without changing Expo Go's SDK policy", async () => {
    vi.stubEnv('ONMANGEOU_NATIVE_RUNTIME','1');
    vi.resetModules();
    try {
      const {default:config}=await import('../../app.config');
      expect(config.runtimeVersion).toEqual({policy:'fingerprint'});
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
  it("serializes automatic registration and opt-out across components", async () => {
    const actions: string[] = [];
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const registration = serializePushSubscription(async () => {
      actions.push("register");
      await waiting;
      actions.push("registered");
    });
    const optout = serializePushSubscription(async () => {
      actions.push("disable");
    });
    await Promise.resolve();
    expect(actions).toEqual(["register"]);
    release();
    await Promise.all([registration, optout]);
    expect(actions).toEqual(["register", "registered", "disable"]);
  });
  it("keeps working after a failed request", async () => {
    await expect(
      serializePushSubscription(async () => {
        throw new Error("network");
      }),
    ).rejects.toThrow("network");
    await expect(serializePushSubscription(async () => true)).resolves.toBe(
      true,
    );
  });
  it("invalidates token lookups started before an opt-out", () => {
    const tokenLookupVersion = currentPushPreference();
    changePushPreference();
    expect(currentPushPreference()).not.toBe(tokenLookupVersion);
  });
});
