export interface EnvelopeMeta {
  requestId: string;
  nextCursor: string | null;
}

export interface ResponseEnvelope<T> {
  data: T;
  meta: EnvelopeMeta;
}

export interface ProblemFieldError {
  field: string;
  code: string;
  message: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  requestId: string;
  fields: ProblemFieldError[];
}

export interface MoneyView {
  amount: string;
  currency: string;
  formatted: string;
}

export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  sessionId: string;
  accountCreated: boolean;
}

export interface Membership {
  organizationId: string;
  organizationName: string;
  roleCode: string;
  establishmentIds: string[];
}

export interface MeProfile {
  id: string;
  phoneE164: string;
  email: string | null;
  fullName: string | null;
  status: string;
  language: string;
  phoneVerified: boolean;
  avatarUrl: string | null;
  defaultCity: string | null;
  defaultDistrict: string | null;
  createdAt: string;
  memberships: Membership[];
  platformRole: 'ADMIN' | 'SUPPORT' | null;
}

export interface OtpRequested {
  challengeId: string;
  expiresAt: string;
  expiresInSeconds: number;
  devCode?: string;
}

export interface DeviceInfo {
  installId: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  appVersion?: string;
  osVersion?: string;
  model?: string;
}
