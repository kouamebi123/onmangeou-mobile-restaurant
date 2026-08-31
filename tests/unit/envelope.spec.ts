import { describe, expect, it } from 'vitest';

import { unwrapEnvelope } from '../../src/api/envelope';

describe('unwrapEnvelope', () => {
  it('extrait data et meta', () => {
    const envelope = unwrapEnvelope<string[]>({
      data: ['a'],
      meta: { requestId: 'req-1', nextCursor: null },
    });
    expect(envelope.data).toEqual(['a']);
    expect(envelope.meta.requestId).toBe('req-1');
  });
});
