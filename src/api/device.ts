import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { kvGet, kvSet } from '@/store/kv-store';
import type { DeviceInfo } from './types';

const INSTALL_ID_KEY = 'onmangeou.device.installId';

export async function getOrCreateInstallId(): Promise<string> {
  const existing = await kvGet(INSTALL_ID_KEY);
  if (existing) {
    return existing;
  }
  const created = Crypto.randomUUID();
  await kvSet(INSTALL_ID_KEY, created);
  return created;
}

export async function buildDeviceInfo(): Promise<DeviceInfo> {
  const installId = await getOrCreateInstallId();
  const platform = Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : 'WEB';
  const info: DeviceInfo = { installId, platform };
  if (Device.osVersion) {
    info.osVersion = Device.osVersion;
  }
  if (Device.modelName) {
    info.model = Device.modelName;
  }
  return info;
}

export function createIdempotencyKey(): string {
  return Crypto.randomUUID();
}

export function createRequestId(): string {
  return Crypto.randomUUID();
}
