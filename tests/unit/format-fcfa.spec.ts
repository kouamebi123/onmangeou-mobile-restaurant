import { describe, expect, it } from 'vitest';

import { formatFcfa } from '../../src/theme/format-fcfa';

describe('formatFcfa', () => {
  it('formate un montant entier avec le libelle FCFA', () => {
    expect(formatFcfa('12500')).toBe('12\u202F500\u202FFCFA');
  });
});
