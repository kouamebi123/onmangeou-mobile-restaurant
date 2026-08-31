import type { EnvelopeMeta, ProblemDetails, ResponseEnvelope } from './types';

export class ApiError extends Error {
  readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail);
    this.name = 'ApiError';
    this.problem = problem;
  }
}

export function isProblemDetails(value: unknown): value is ProblemDetails {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.status === 'number';
}

export function unwrapEnvelope<T>(payload: unknown): ResponseEnvelope<T> {
  if (typeof payload !== 'object' || payload === null) {
    throw new ApiError(fallbackProblem('Reponse inattendue du service.'));
  }

  const candidate = payload as { data?: T; meta?: EnvelopeMeta };
  if (!('data' in candidate) || candidate.meta === undefined) {
    throw new ApiError(fallbackProblem('Reponse inattendue du service.'));
  }

  return { data: candidate.data as T, meta: candidate.meta };
}

export function fallbackProblem(detail: string): ProblemDetails {
  return {
    type: 'https://api.onmangeou.ci/problems/internal-error',
    title: 'Service indisponible',
    status: 0,
    code: 'CLIENT_TRANSPORT',
    detail,
    requestId: 'local',
    fields: [],
  };
}
