import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  WELCOME_COVER_MS,
  WELCOME_MIN_VISIBLE_MS,
  remainingVisibleMs,
  useTransitionStore,
} from '../../src/store/transition-store';

describe('welcome transition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useTransitionStore.setState({ welcomeRun: 0, revealedRun: 0 });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('replays on every sign-in', () => {
    void useTransitionStore.getState().coverWelcome();
    void useTransitionStore.getState().coverWelcome();
    expect(useTransitionStore.getState().welcomeRun).toBe(2);
  });

  it('lets the session change only once the screen is covered', async () => {
    let covered = false;
    void useTransitionStore
      .getState()
      .coverWelcome()
      .then(() => {
        covered = true;
      });

    await vi.advanceTimersByTimeAsync(WELCOME_COVER_MS - 1);
    expect(covered).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(covered).toBe(true);
  });

  it('stays up until the home screen is announced ready', () => {
    void useTransitionStore.getState().coverWelcome();
    expect(useTransitionStore.getState().revealedRun).toBe(0);
    useTransitionStore.getState().revealWelcome();
    expect(useTransitionStore.getState().revealedRun).toBe(1);
  });

  it('a reveal from an earlier sign-in does not dismiss a new one', () => {
    void useTransitionStore.getState().coverWelcome();
    useTransitionStore.getState().revealWelcome();
    void useTransitionStore.getState().coverWelcome();
    const state = useTransitionStore.getState();
    expect(state.revealedRun).not.toBe(state.welcomeRun);
  });

  it('keeps the message readable for a minimum time', () => {
    expect(remainingVisibleMs(1000, 1300)).toBe(WELCOME_MIN_VISIBLE_MS - 300);
    expect(remainingVisibleMs(1000, 1000 + WELCOME_MIN_VISIBLE_MS + 500)).toBe(0);
  });
});
