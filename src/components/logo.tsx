import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

interface LogoProps {
  variant?: 'light' | 'dark' | 'icon';
  height?: number;
}

const sources = {
  light: require('../../assets/brand/onmangeou-logo-full-light.svg'),
  dark: require('../../assets/brand/onmangeou-logo-full-dark.svg'),
  icon: require('../../assets/brand/onmangeou-logo-icon.svg'),
} as const;

const WIDTH_RATIO = {
  light: 200 / 130,
  dark: 200 / 130,
  icon: 64 / 80,
} as const;

export function Logo({ variant = 'light', height = 48 }: LogoProps) {
  return (
    <Image
      source={sources[variant]}
      style={[styles.logo, { height, width: height * WIDTH_RATIO[variant] }]}
      contentFit="contain"
      accessibilityLabel="OnMangeOù"
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  logo: {},
});
