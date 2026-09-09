import { z } from "zod";
const amount = z.string().regex(/^\d{1,15}$/);
export const actionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("expense"),
    establishmentId: z.string().uuid(),
    amount,
    label: z.string().trim().min(1).max(160),
    category: z.string().max(80).optional(),
  }),
  z.object({
    kind: z.literal("availability"),
    establishmentId: z.string().uuid(),
    productId: z.string().uuid(),
    status: z.enum(["AVAILABLE", "OUT_OF_STOCK", "HIDDEN"]),
    clientChangedAt: z.string().datetime(),
  }),
  z.object({
    kind: z.literal("order"),
    establishmentId: z.string().uuid(),
    customerName: z.string().trim().min(1).max(160),
    service: z.enum(["DINE_IN", "TAKEAWAY"]),
    expectedTotalAmount: amount,
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().min(1).max(20),
        }),
      )
      .min(1)
      .max(100),
  }),
]);
export type OfflineAction = z.infer<typeof actionSchema>;
export interface QueueItem {
  id: string;
  version: 1;
  createdAt: number;
  action: OfflineAction;
  attempts: number;
  nextAttemptAt: number;
  status: "pending" | "conflict";
  error?: string;
}
export function aggregate(action: OfflineAction): string {
  return action.kind === "availability"
    ? action.productId
    : action.establishmentId;
}
export function nextBatch(items: QueueItem[], now: number): QueueItem[] {
  const seen = new Set<string>();
  return [...items]
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
    .filter((item) => {
      const key = aggregate(item.action);
      if (seen.has(key)) return false;
      seen.add(key);
      return item.status === "pending" && item.nextAttemptAt <= now;
    });
}
export const retryDelay = (attempt: number) =>
  Math.min(300_000, 1000 * 2 ** Math.min(attempt, 9));
