import { create } from 'zustand';

/** Temps laissé au voile pour couvrir l'écran avant de changer de page. */
export const WELCOME_COVER_MS = 220;
/** Durée minimale d'affichage, pour que le message reste lisible. */
export const WELCOME_MIN_VISIBLE_MS = 1000;
/** Garde-fou : le voile ne reste jamais bloqué si l'accueil tarde ou échoue. */
export const WELCOME_MAX_VISIBLE_MS = 8000;

interface TransitionState {
  /** Incrémenté à chaque connexion réussie : le voile d'accueil se rejoue. */
  welcomeRun: number;
  /** Dernier passage dont l'accueil est prêt à être dévoilé. */
  revealedRun: number;
  /**
   * Couvre l'écran. La promesse se résout quand il est couvert : la session
   * et la navigation peuvent alors changer sans à-coup visible.
   */
  coverWelcome: () => Promise<void>;
  /** L'accueil est en place (ou la connexion a échoué) : le voile peut s'effacer. */
  revealWelcome: () => void;
}

export const useTransitionStore = create<TransitionState>((set, get) => ({
  welcomeRun: 0,
  revealedRun: 0,
  coverWelcome: () => {
    set((state) => ({ welcomeRun: state.welcomeRun + 1 }));
    return new Promise((resolve) => setTimeout(resolve, WELCOME_COVER_MS));
  },
  revealWelcome: () => set({ revealedRun: get().welcomeRun }),
}));

/** Temps restant avant de pouvoir effacer le voile, compte tenu de la durée minimale. */
export function remainingVisibleMs(startedAt: number, now: number): number {
  return Math.max(0, WELCOME_MIN_VISIBLE_MS - (now - startedAt));
}
