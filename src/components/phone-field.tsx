import { TextField } from '@/components/text-field';
import { t } from '@/i18n';

interface PhoneFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
}

export function PhoneField({ value, onChangeText, error }: PhoneFieldProps) {
  return (
    <TextField
      label={t('auth.phoneLabel')}
      placeholder={t('auth.phonePlaceholder')}
      keyboardType="phone-pad"
      autoComplete="tel"
      textContentType="telephoneNumber"
      value={value}
      onChangeText={onChangeText}
      error={error}
    />
  );
}
