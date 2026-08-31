import { describe, expect, it } from 'vitest';

import { normalizeApiBaseUrl } from '../../src/api/url';

describe('normalizeApiBaseUrl', () => {
  it('ajoute le préfixe à une origine Railway', () => {
    expect(normalizeApiBaseUrl('https://onmangeou-backend-api-production.up.railway.app/')).toBe(
      'https://onmangeou-backend-api-production.up.railway.app/api/v1',
    );
  });

  it('ne duplique pas un préfixe déjà présent', () => {
    expect(normalizeApiBaseUrl('http://localhost:3000/api/v1')).toBe('http://localhost:3000/api/v1');
  });
});
