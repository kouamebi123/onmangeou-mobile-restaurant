import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/app-text';
import { tokens } from '@/theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  return (
    <View style={styles.wrap}>
      <AppText variant="caption">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={tokens.color.text.muted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color={tokens.color.feedback.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.xxs },
  input: {
    minHeight: tokens.layout.minTouchTarget,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    fontFamily: tokens.typography.family.regular,
    fontSize: tokens.typography.size.md,
    color: tokens.color.text.primary,
    backgroundColor: tokens.color.surface.white,
  },
  inputError: { borderColor: tokens.color.feedback.error },
});
