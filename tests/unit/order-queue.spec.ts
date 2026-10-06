import { describe, expect, it } from 'vitest';

import {
  countByFilter,
  elapsedMinutes,
  isActive,
  isLate,
  matchesFilter,
  newPendingIds,
  pendingCount,
  sortQueue,
  statusTone,
  type QueueOrder,
} from '../../src/features/orders/order-queue';

const order = (id: string, status: QueueOrder['status'], placedAt: string): QueueOrder => ({ id, status, placedAt });

const orders: QueueOrder[] = [
  order('done-old', 'COMPLETED', '2026-10-06T10:00:00Z'),
  order('cooking', 'PREPARING', '2026-10-06T11:40:00Z'),
  order('todo-recent', 'PENDING_RESTAURANT', '2026-10-06T11:58:00Z'),
  order('ready', 'READY', '2026-10-06T11:30:00Z'),
  order('todo-old', 'PENDING_RESTAURANT', '2026-10-06T11:45:00Z'),
  order('done-recent', 'REJECTED', '2026-10-06T11:00:00Z'),
  order('accepted', 'ACCEPTED', '2026-10-06T11:50:00Z'),
];

describe('order queue', () => {
  it('puts tickets awaiting an answer first, oldest first, and history last', () => {
    expect(sortQueue(orders).map((entry) => entry.id)).toEqual([
      'todo-old',
      'todo-recent',
      'cooking',
      'accepted',
      'ready',
      'done-recent',
      'done-old',
    ]);
  });

  it('does not reorder the list it receives', () => {
    const copy = [...orders];
    sortQueue(orders);
    expect(orders).toEqual(copy);
  });

  it('counts each step of the queue', () => {
    expect(countByFilter(orders)).toEqual({ all: 7, todo: 2, kitchen: 2, ready: 1 });
    expect(pendingCount(orders)).toBe(2);
    expect(pendingCount(undefined)).toBe(0);
  });

  it('filters by step', () => {
    expect(matchesFilter('PENDING_RESTAURANT', 'todo')).toBe(true);
    expect(matchesFilter('ACCEPTED', 'kitchen')).toBe(true);
    expect(matchesFilter('PREPARING', 'kitchen')).toBe(true);
    expect(matchesFilter('READY', 'kitchen')).toBe(false);
    expect(matchesFilter('READY', 'ready')).toBe(true);
    expect(matchesFilter('CANCELLED', 'all')).toBe(true);
  });

  it('signals only orders that arrived since the last reading', () => {
    expect(newPendingIds(null, orders)).toEqual([]);
    expect(newPendingIds(new Set(['todo-old']), orders)).toEqual(['todo-recent']);
    expect(newPendingIds(new Set(['todo-old', 'todo-recent']), orders)).toEqual([]);
  });

  it('never signals an order that is no longer awaiting an answer', () => {
    expect(newPendingIds(new Set(), [order('a', 'ACCEPTED', '2026-10-06T11:50:00Z')])).toEqual([]);
  });

  it('measures the wait and flags late answers', () => {
    const now = new Date('2026-10-06T12:00:00Z');
    expect(elapsedMinutes('2026-10-06T11:45:30Z', now)).toBe(14);
    expect(elapsedMinutes('2026-10-06T12:05:00Z', now)).toBe(0);
    expect(elapsedMinutes('pas une date', now)).toBe(0);
    expect(isLate('PENDING_RESTAURANT', '2026-10-06T11:50:00Z', now)).toBe(true);
    expect(isLate('PENDING_RESTAURANT', '2026-10-06T11:51:00Z', now)).toBe(false);
    expect(isLate('PREPARING', '2026-10-06T11:00:00Z', now)).toBe(false);
  });

  it('maps each status to a tone and an activity state', () => {
    expect(statusTone('PENDING_RESTAURANT')).toBe('progress');
    expect(statusTone('READY')).toBe('success');
    expect(statusTone('REJECTED')).toBe('danger');
    expect(isActive('READY')).toBe(true);
    expect(isActive('COMPLETED')).toBe(false);
    expect(isActive('PENDING_PAYMENT')).toBe(false);
  });
});
