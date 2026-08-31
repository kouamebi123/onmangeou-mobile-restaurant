import { apiRequest } from '@/api/client';
import { buildDeviceInfo } from '@/api/device';
import type { MeProfile, OtpRequested, TokenPair } from '@/api/types';

export async function requestOtp(phone: string): Promise<OtpRequested> {
  const envelope = await apiRequest<OtpRequested>('/auth/otp/request', {
    method: 'POST',
    auth: false,
    body: { phone, purpose: 'LOGIN' },
  });
  return envelope.data;
}

export async function verifyOtp(phone: string, code: string, organizationId?: string): Promise<TokenPair> {
  const device = await buildDeviceInfo();
  const body: Record<string, unknown> = { phone, code, purpose: 'LOGIN', device };
  if (organizationId) {
    body.organizationId = organizationId;
  }
  const envelope = await apiRequest<TokenPair>('/auth/otp/verify', {
    method: 'POST',
    auth: false,
    body,
  });
  return envelope.data;
}

export async function refreshTokens(refreshToken: string, organizationId?: string): Promise<TokenPair> {
  const body: Record<string, unknown> = { refreshToken };
  if (organizationId) {
    body.organizationId = organizationId;
  }
  const envelope = await apiRequest<TokenPair>('/auth/refresh', {
    method: 'POST',
    auth: false,
    body,
  });
  return envelope.data;
}

export async function fetchMe(): Promise<MeProfile> {
  const envelope = await apiRequest<MeProfile>('/me');
  return envelope.data;
}

export async function updateMe(input: { fullName?: string }): Promise<MeProfile> {
  const envelope = await apiRequest<MeProfile>('/me', { method: 'PATCH', body: input });
  return envelope.data;
}

export async function logout(): Promise<void> {
  await apiRequest<null>('/auth/logout', { method: 'POST', body: { allDevices: false } });
}
