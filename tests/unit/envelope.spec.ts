import { describe, expect, it } from 'vitest';

import { ApiError, fallbackProblem, isProblemDetails, unwrapEnvelope } from '../../src/api/envelope';

describe('unwrapEnvelope', () => {
  it('shows precise validation messages instead of a generic failure', () => {
    const error = new ApiError({ ...fallbackProblem('Invalid'), status: 422,
      fields: [{ field: 'name', code: 'REQUIRED', message: 'Nom requis' }, { field: 'name', code: 'REQUIRED', message: 'Nom requis' }] });
    expect(error.message).toBe('Nom requis');
    expect(error.problem.detail).toBe('Nom requis');
  });
  it('rejects an incomplete error payload', () => {
    expect(isProblemDetails({ status: 500, code: 'ERROR' })).toBe(false);
  });
  it('extrait data et meta', () => {
    const envelope = unwrapEnvelope<string[]>({
      data: ['a'],
      meta: { requestId: 'req-1', nextCursor: null },
    });
    expect(envelope.data).toEqual(['a']);
    expect(envelope.meta.requestId).toBe('req-1');
  });
});
