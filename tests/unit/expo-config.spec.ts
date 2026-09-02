import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from '../../app.config';
import eas from '../../eas.json';
import pkg from '../../package.json';

describe('Expo Go / EAS restaurant configuration', () => {
  it('targets the restaurant project, never the client project', () => {
    const projectId = '88a9ebeb-d938-4fb8-b688-cc09d506f326';
    expect(config.owner).toBe('manu99');
    expect(config.slug).toBe('onmangeou-restaurant');
    expect(config.extra?.eas.projectId).toBe(projectId);
    expect(config.updates?.url).toBe(`https://u.expo.dev/${projectId}`);
    expect(config.runtimeVersion).toEqual({ policy: 'sdkVersion' });
  });

  it('uses the SDK 54 native stack used by the client', () => {
    expect(pkg.dependencies.expo).toMatch(/^54\./);
    expect(pkg.dependencies['react-native']).toBe('0.81.5');
    expect(pkg.dependencies['expo-updates']).toMatch(/29\./);
    expect(pkg.dependencies['expo-image-picker']).toMatch(/17\./);
    expect(config.plugins).not.toContain('expo-image');
    expect(pkg.scripts['start:go']).toContain('--go');
  });

  it('references existing visual assets', () => {
    expect(existsSync(config.icon!)).toBe(true);
    expect(existsSync(config.ios!.icon as string)).toBe(true);
    expect(existsSync(config.android!.adaptiveIcon!.foregroundImage!)).toBe(true);
  });

  it('separates preview and production updates and keeps the Railway API prefix', () => {
    expect(eas.build.preview.channel).toBe('preview');
    expect(eas.build.production.channel).toBe('production');
    const api = 'https://onmangeou-backend-api-production.up.railway.app/api/v1';
    expect(eas.build.base.env.EXPO_PUBLIC_API_URL).toBe(api);
    expect(readFileSync('.env.example', 'utf8')).toContain(api);
  });
});
