/**
 * File des commandes : tri, filtres et compteurs.
 *
 * Logique pure, sans dépendance à React Native, pour rester testable.
 */

export type QueueStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_RESTAURANT'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface QueueOrder {
  id: string;
  status: QueueStatus;
  placedAt: string;
}

export type OrderFilter = 'all' | 'todo' | 'kitchen' | 'ready';

export const ORDER_FILTERS: readonly OrderFilter[] = ['all', 'todo', 'kitchen', 'ready'];

export type QueueTone = 'neutral' | 'progress' | 'success' | 'danger';

/** Rang d'affichage : ce qui attend une réponse d'abord, l'historique en dernier. */
const RANK: Record<QueueStatus, number> = {
  PENDING_RESTAURANT: 0,
  ACCEPTED: 1,
  PREPARING: 1,
  READY: 2,
  PENDING_PAYMENT: 3,
  COMPLETED: 4,
  REJECTED: 4,
  CANCELLED: 4,
};

export function matchesFilter(status: QueueStatus, filter: OrderFilter): boolean {
  switch (filter) {
    case 'todo':
      return status === 'PENDING_RESTAURANT';
    case 'kitchen':
      return status === 'ACCEPTED' || status === 'PREPARING';
    case 'ready':
      return status === 'READY';
    default:
      return true;
  }
}

export function countByFilter(orders: readonly QueueOrder[]): Record<OrderFilter, number> {
  const counts: Record<OrderFilter, number> = { all: orders.length, todo: 0, kitchen: 0, ready: 0 };
  for (const order of orders) {
    if (matchesFilter(order.status, 'todo')) counts.todo += 1;
    else if (matchesFilter(order.status, 'kitchen')) counts.kitchen += 1;
    else if (matchesFilter(order.status, 'ready')) counts.ready += 1;
  }
  return counts;
}

/** Commandes qui attendent une réponse du restaurant. */
export function pendingCount(orders: readonly QueueOrder[] | undefined): number {
  return orders?.filter((order) => order.status === 'PENDING_RESTAURANT').length ?? 0;
}

/**
 * Tickets en cours triés par ancienneté (le plus ancien attend depuis le plus
 * longtemps), historique du plus récent au plus ancien.
 */
export function sortQueue<T extends QueueOrder>(orders: readonly T[]): T[] {
  return [...orders].sort((left, right) => {
    const rank = RANK[left.status] - RANK[right.status];
    if (rank !== 0) return rank;
    const age = Date.parse(left.placedAt) - Date.parse(right.placedAt);
    return RANK[left.status] >= 4 ? -age : age;
  });
}

/**
 * Nouvelles commandes à traiter depuis le dernier relevé.
 * Au premier chargement (`known` nul) rien n'est signalé : ce n'est pas une arrivée.
 */
export function newPendingIds(known: ReadonlySet<string> | null, orders: readonly QueueOrder[]): string[] {
  if (known === null) return [];
  return orders
    .filter((order) => order.status === 'PENDING_RESTAURANT' && !known.has(order.id))
    .map((order) => order.id);
}

export function statusTone(status: QueueStatus): QueueTone {
  switch (status) {
    case 'PENDING_RESTAURANT':
    case 'PENDING_PAYMENT':
    case 'ACCEPTED':
    case 'PREPARING':
      return 'progress';
    case 'READY':
    case 'COMPLETED':
      return 'success';
    case 'REJECTED':
    case 'CANCELLED':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** Une commande est active tant que le restaurant a encore quelque chose à faire. */
export function isActive(status: QueueStatus): boolean {
  return RANK[status] <= 2;
}

/** Minutes écoulées depuis la réception, jamais négatives (horloges décalées). */
export function elapsedMinutes(placedAt: string, now: Date): number {
  const placed = Date.parse(placedAt);
  if (Number.isNaN(placed)) return 0;
  return Math.max(0, Math.floor((now.getTime() - placed) / 60_000));
}

/** Au-delà de ce délai sans réponse, le ticket est signalé comme en retard. */
export const LATE_AFTER_MINUTES = 10;

export function isLate(status: QueueStatus, placedAt: string, now: Date): boolean {
  return status === 'PENDING_RESTAURANT' && elapsedMinutes(placedAt, now) >= LATE_AFTER_MINUTES;
}
