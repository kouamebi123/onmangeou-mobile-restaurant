import { apiRequest } from "@/api/client";
import { createIdempotencyKey } from "@/api/device";
import { ApiError } from "@/api/envelope";
import { useAuthStore } from "@/store/auth-store";
import { t } from "@/i18n";
import {
  actionSchema,
  nextBatch,
  retryDelay,
  type OfflineAction,
  type QueueItem,
} from "./action";
import { listValues, readValue, removeValue, writeValue } from "./storage";

export function offlineScope(): string | null {
  const auth = useAuthStore.getState();
  return auth.sessionScope && auth.organizationId
    ? `${auth.sessionScope}:${auth.organizationId}`
    : null;
}
export async function queueItems(scope: string): Promise<QueueItem[]> {
  return (await listValues(scope, "action:")).map(
    (value) => JSON.parse(value) as QueueItem,
  );
}
export async function enqueue(action: OfflineAction): Promise<void> {
  const scope = offlineScope();
  if (!scope) throw new Error(t("offlineQueue.loginRequired"));
  const parsed = actionSchema.safeParse(action);
  if (!parsed.success) throw new Error(t("offlineQueue.invalid"));
  const item: QueueItem = {
    id: createIdempotencyKey(),
    version: 1,
    createdAt: Date.now(),
    action: parsed.data,
    attempts: 0,
    nextAttemptAt: 0,
    status: "pending",
  };
  await writeValue(scope, `action:${item.id}`, JSON.stringify(item));
  if (scope !== offlineScope())
    throw new Error(t("offlineQueue.loginRequired"));
  // The queue is durable before any request is attempted.
}
export async function discard(id: string): Promise<void> {
  const scope = offlineScope();
  // Wait only for a send already in flight; discarding must never start a send.
  if (running) await running;
  if (scope && scope === offlineScope()) await removeValue(scope, `action:${id}`);
}
let running: Promise<boolean> | null = null;
export function synchronize(): Promise<boolean> {
  if (running) return running;
  running = drain().finally(() => {
    running = null;
  });
  return running;
}
async function drain(): Promise<boolean> {
  const scope = offlineScope();
  const { sessionScope, organizationId } = useAuthStore.getState();
  if (!scope || !sessionScope || !organizationId) return false;
  let changed = false;
  for (const item of nextBatch(await queueItems(scope), Date.now())) {
    if (scope !== offlineScope()) break;
    if (
      item.version !== 1 ||
      Date.now() - item.createdAt > 23 * 60 * 60 * 1000
    ) {
      item.status = "conflict";
      item.error = t("offlineQueue.expired");
    } else {
      try {
        const action = actionSchema.parse(item.action);
        const { kind, ...body } = action;
        const path =
          kind === "expense"
            ? "/merchant/expenses"
            : kind === "order"
              ? "/merchant/orders"
              : `/merchant/products/${action.kind === "availability" ? action.productId : ""}/availability`;
        const payload =
          action.kind === "availability"
            ? { status: action.status, clientChangedAt: action.clientChangedAt }
            : action.kind === "order"
              ? { ...body, paymentMethod: "CASH" }
              : body;
        const response = await apiRequest<{ applied?: boolean }>(path, {
          method: kind === "availability" ? "PATCH" : "POST",
          body: payload,
          idempotent: kind !== "availability",
          idempotencyKey: item.id,
          expectedSessionScope: sessionScope,
          expectedOrganizationId: organizationId,
        });
        if (response.data?.applied === false) {
          item.status = "conflict";
          item.error = t("offlineQueue.availabilityConflict");
        } else {
          await removeValue(scope, `action:${item.id}`);
          changed = true;
          continue;
        }
      } catch (error) {
        if (scope !== offlineScope()) break;
        item.attempts += 1;
        const transient =
          error instanceof ApiError &&
          (error.problem.status === 0 ||
            error.problem.status >= 500 ||
            error.problem.status === 429 ||
            error.problem.code === "IDEMPOTENCY_REQUEST_IN_PROGRESS");
        item.status = transient ? "pending" : "conflict";
        item.error =
          error instanceof Error ? error.message : t("errors.generic");
        item.nextAttemptAt = Date.now() + retryDelay(item.attempts);
      }
    }
    await writeValue(scope, `action:${item.id}`, JSON.stringify(item));
  }
  return changed;
}
export async function cachedRead<T>(
  key: string,
  request: () => Promise<T>,
): Promise<T> {
  const scope = offlineScope();
  try {
    const data = await request();
    if (scope && scope === offlineScope())
      await writeValue(
        scope,
        `cache:${key}`,
        JSON.stringify({ at: Date.now(), data }),
      ).catch(() => undefined);
    return data;
  } catch (error) {
    if (
      scope &&
      scope === offlineScope() &&
      error instanceof ApiError &&
      error.problem.status === 0
    ) {
      const value = await readValue(scope, `cache:${key}`);
      if (value) {
        const cached = JSON.parse(value) as { at: number; data: T };
        if (Date.now() - cached.at < 7 * 86400_000) return cached.data;
      }
    }
    throw error;
  }
}
