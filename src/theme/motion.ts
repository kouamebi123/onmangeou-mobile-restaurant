import { tokens } from './tokens';

/**
 * Règles de mouvement de l'application : rien n'apparaît d'un coup.
 *
 * Durées tirées des tokens de design. Logique pure, sans React Native, pour
 * rester testable.
 */
export const motion = {
  /** Apparition d'un contenu : fondu avec une légère montée. */
  appearMs: tokens.motion.slow,
  /** Ouverture ou fermeture d'une section repliable. */
  expandMs: tokens.motion.slow,
  /** Fondu d'une image qui finit de charger. */
  imageMs: tokens.motion.base,
  /** Hauteur de la montée, en points. */
  rise: 8,
  /** Décalage entre deux éléments d'une liste qui apparaît. */
  staggerMs: 45,
  /** Au-delà, les éléments arrivent ensemble : une longue liste ne doit pas faire attendre. */
  maxStaggered: 6,
} as const;

/** Retard d'apparition du n-ième élément d'une liste, plafonné. */
export function staggerDelay(index: number): number {
  if (!Number.isFinite(index) || index <= 0) return 0;
  return Math.min(Math.floor(index), motion.maxStaggered) * motion.staggerMs;
}

/** Hauteur visible d'une section en cours d'ouverture (progress de 0 à 1). */
export function expandedHeight(contentHeight: number, progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return Math.max(0, contentHeight) * clamped;
}
