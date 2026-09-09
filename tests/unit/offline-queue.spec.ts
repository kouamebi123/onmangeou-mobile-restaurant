import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({
  values: new Map<string, string>(),
  request: vi.fn(),
  auth: { sessionScope: "session", organizationId: "org" },
  sequence: 0,
}));
vi.mock("@/api/client", () => ({ apiRequest: f.request }));
vi.mock("@/api/device", () => ({
  createIdempotencyKey: () => `key-${++f.sequence}`,
}));
vi.mock("@/store/auth-store", () => ({
  useAuthStore: { getState: () => f.auth },
}));
vi.mock("@/offline/storage", () => ({
  listValues: async (scope: string, prefix: string) =>
    [...f.values]
      .filter(([key]) => key.startsWith(`${scope}:${prefix}`))
      .map(([, value]) => value),
  readValue: async (scope: string, key: string) =>
    f.values.get(`${scope}:${key}`) ?? null,
  writeValue: async (scope: string, key: string, value: string) => {
    f.values.set(`${scope}:${key}`, value);
  },
  removeValue: async (scope: string, key: string) => {
    f.values.delete(`${scope}:${key}`);
  },
}));
import { enqueue, synchronize, queueItems, cachedRead, discard } from "@/offline/queue";
import { ApiError, fallbackProblem } from "@/api/envelope";
import { nextBatch, type QueueItem } from "@/offline/action";
const action = {
  kind: "expense" as const,
  establishmentId: "00000000-0000-4000-8000-000000000001",
  amount: "1200",
  label: "Achat",
};
beforeEach(() => {
  f.values.clear();
  f.request.mockReset();
  f.auth = { sessionScope: "session", organizationId: "org" };
});
describe("file durable hors connexion", () => {
  it("supprime une action sans déclencher son envoi", async () => {
    await enqueue(action);
    const item = (await queueItems("session:org"))[0]!;
    await discard(item.id);
    expect(f.request).not.toHaveBeenCalled();
    expect(await queueItems("session:org")).toHaveLength(0);
  });
  it("conserve la même clé après une réponse perdue et retire uniquement après succès", async () => {
    await enqueue(action);
    f.request.mockRejectedValueOnce(new ApiError(fallbackProblem("offline")));
    await synchronize();
    const first = (await queueItems("session:org"))[0]!;
    expect(first.attempts).toBe(1);
    first.nextAttemptAt = 0;
    f.values.set(`session:org:action:${first.id}`, JSON.stringify(first));
    f.request.mockResolvedValueOnce({ data: {} });
    await synchronize();
    expect(f.request.mock.calls[0]![1].idempotencyKey).toBe(
      f.request.mock.calls[1]![1].idempotencyKey,
    );
    expect(await queueItems("session:org")).toHaveLength(0);
  });
  it("isole les files entre sessions", async () => {
    await enqueue(action);
    f.auth.sessionScope = "other";
    await synchronize();
    expect(f.request).not.toHaveBeenCalled();
    expect(await queueItems("session:org")).toHaveLength(1);
  });
  it("ne rejoue pas automatiquement une action trop ancienne", async () => {
    await enqueue(action);
    const item = (await queueItems("session:org"))[0]!;
    item.createdAt -= 86400_000;
    f.values.set(`session:org:action:${item.id}`, JSON.stringify(item));
    await synchronize();
    expect(f.request).not.toHaveBeenCalled();
    expect((await queueItems("session:org"))[0]!.status).toBe("conflict");
  });
  it("bloque les actions suivantes du même établissement après un conflit", () => {
    const first: QueueItem = {
      id: "a",
      version: 1,
      createdAt: 1,
      nextAttemptAt: 0,
      attempts: 1,
      status: "conflict",
      action,
    };
    expect(
      nextBatch(
        [first, { ...first, id: "b", createdAt: 2, status: "pending" }],
        10,
      ),
    ).toEqual([]);
  });
  it("ne masque pas une révocation par un ancien cache", async () => {
    await cachedRead("menu", async () => ["plat"]);
    const denied = new ApiError({ ...fallbackProblem("refusé"), status: 403 });
    await expect(
      cachedRead("menu", async () => {
        throw denied;
      }),
    ).rejects.toBe(denied);
    expect(
      await cachedRead("menu", async () => {
        throw new ApiError(fallbackProblem("offline"));
      }),
    ).toEqual(["plat"]);
  });
  it("bloque un changement de prix pour décision humaine", async () => {
    await enqueue(action);
    f.request.mockRejectedValue(
      new ApiError({ ...fallbackProblem("prix modifié"), status: 409 }),
    );
    await synchronize();
    await synchronize();
    expect(f.request).toHaveBeenCalledTimes(1);
    expect((await queueItems("session:org"))[0]!.status).toBe("conflict");
  });
});
