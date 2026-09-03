import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'OnMangeOu Restaurant',
  slug: 'onmangeou-restaurant',
  owner: 'manu99',
  extra: {
    eas: { projectId: '88a9ebeb-d938-4fb8-b688-cc09d506f326' },
  },
  updates: {
    url: 'https://u.expo.dev/88a9ebeb-d938-4fb8-b688-cc09d506f326',
  },
  // Keep Expo Go on SDK 54; native EAS builds use a compatibility fingerprint.
  runtimeVersion: process.env.ONMANGEOU_NATIVE_RUNTIME === '1'
    ? { policy: 'fingerprint' }
    : { policy: 'sdkVersion' },
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'onmangeou-restaurant',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'ci.onmangeou.restaurant',
    icon: './assets/expo.icon',
  },
  android: {
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
    adaptiveIcon: {
      backgroundColor: '#173B36',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    package: 'ci.onmangeou.restaurant',
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-notifications',
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#173B36',
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
      },
    ],
    'expo-secure-store',
    'expo-font',
    [
      'expo-image-picker',
      {
        photosPermission: 'OnMangeOu utilise vos photos pour illustrer votre restaurant et vos plats.',
        microphonePermission: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
};

export default config;
