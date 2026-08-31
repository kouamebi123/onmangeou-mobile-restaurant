import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { useRouter } from 'expo-router';

import { fetchMe, refreshTokens, requestOtp, updateMe, verifyOtp } from '@/api/auth';
import { createOrganization } from '@/api/merchant';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Logo } from '@/components/logo';
import { HeroBlobs } from '@/components/page-hero';
import { PhoneField } from '@/components/phone-field';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { RestaurantPlaceForm } from '@/features/onboarding/restaurant-place-form';
import {
  EMPTY_RESTAURANT_PLACE,
  provisionEstablishment,
  restaurantPlaceFields,
} from '@/features/onboarding/restaurant-place';
import { t } from '@/i18n';
import { useAuthStore } from '@/store/auth-store';
import { tokens } from '@/theme';

const phoneSchema = z.object({
  phone: z.string().min(8).max(24),
});

const registerSchema = restaurantPlaceFields
  .extend({
    fullName: z.string().min(2).max(160),
  })
  .refine((values) => Object.values(values.weekDays).some(Boolean), {
    message: 'Au moins un jour d’ouverture',
    path: ['weekDays'],
  })
  .refine((values) => values.dineIn || values.takeaway, {
    message: 'Choisissez au moins un mode de service',
    path: ['dineIn'],
  });

const codeSchema = z.object({
  code: z.string().regex(/^\d{4,8}$/),
});

type PhoneValues = z.infer<typeof phoneSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type CodeValues = z.infer<typeof codeSchema>;

export function OtpScreen() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [intent, setIntent] = useState<'signup' | 'signin'>('signin');
  const [step, setStep] = useState<'welcome' | 'register' | 'phone' | 'code'>('welcome');
  const [phone, setPhone] = useState('');
  const [pendingRegister, setPendingRegister] = useState<RegisterValues | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();

  const phoneForm = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { ...EMPTY_RESTAURANT_PLACE, fullName: '' },
  });
  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const sendCode = async (value: string) => {
    const result = await requestOtp(value);
    setPhone(value);
    setDevCode(result.devCode);
    setStep('code');
  };

  const finishSession = async (refreshToken: string) => {
    const me = await fetchMe();
    if (intent === 'signup') {
      if (pendingRegister?.fullName) {
        await updateMe({ fullName: pendingRegister.fullName });
      }
      if (me.memberships.length === 0 && pendingRegister) {
        const organization = await createOrganization({
          name: pendingRegister.name,
          contactPhone: pendingRegister.phone,
        });
        const refreshed = await refreshTokens(refreshToken, organization.organizationId);
        await setSession(refreshed, organization.organizationId);
        await provisionEstablishment(pendingRegister);
        router.replace('/(merchant)/manage');
        return;
      }
    }
    const membership = me.memberships[0];
    if (membership) {
      const refreshed = await refreshTokens(refreshToken, membership.organizationId);
      await setSession(refreshed, membership.organizationId);
    }
    router.replace('/(merchant)/activity');
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <HeroBlobs />
        <View style={styles.logoWrap}>
          <Logo variant="dark" height={64} />
        </View>
        <AppText variant="caption" color={tokens.color.brand.accent} style={styles.kicker}>
          {t('auth.kicker')}
        </AppText>
        <AppText variant="title" color={tokens.color.text.onBrand} style={styles.title}>
          {step === 'welcome' ? t('auth.welcomeTitle') : intent === 'signup' ? t('auth.signupTitle') : t('auth.title')}
        </AppText>
        <AppText variant="muted" color={tokens.color.surface.mint}>
          {step === 'welcome' ? t('auth.welcomeLede') : t('auth.lede')}
        </AppText>
      </View>

      <View style={styles.card}>
        {formError ? <AppText color={tokens.color.feedback.error}>{formError}</AppText> : null}

        {step === 'welcome' ? (
          <>
            <Button
              label={t('auth.signup')}
              onPress={() => {
                setIntent('signup');
                setFormError(undefined);
                setStep('register');
              }}
            />
            <Button
              label={t('auth.signin')}
              variant="outline"
              onPress={() => {
                setIntent('signin');
                setFormError(undefined);
                setStep('phone');
              }}
            />
          </>
        ) : null}

        {step === 'register' ? (
          <>
            <AppText variant="muted">{t('auth.signupLede')}</AppText>
            <RestaurantPlaceForm control={registerForm.control} setValue={registerForm.setValue} showOwnerName />
            <Button
              label={t('auth.sendCode')}
              loading={registerForm.formState.isSubmitting}
              onPress={registerForm.handleSubmit(async (values) => {
                setFormError(undefined);
                try {
                  setPendingRegister(values);
                  await sendCode(values.phone);
                } catch (error) {
                  setFormError(error instanceof ApiError ? error.problem.detail : t('errors.generic'));
                }
              })}
            />
            <Button label={t('auth.backWelcome')} variant="ghost" onPress={() => setStep('welcome')} />
          </>
        ) : null}

        {step === 'phone' ? (
          <>
            <Controller
              control={phoneForm.control}
              name="phone"
              render={({ field, fieldState }) => (
                <PhoneField
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error ? t('errors.generic') : undefined}
                />
              )}
            />
            <Button
              label={t('auth.sendCode')}
              loading={phoneForm.formState.isSubmitting}
              onPress={phoneForm.handleSubmit(async (values) => {
                setFormError(undefined);
                try {
                  setPendingRegister(null);
                  await sendCode(values.phone);
                } catch (error) {
                  setFormError(error instanceof ApiError ? error.problem.detail : t('errors.generic'));
                }
              })}
            />
            <Pressable onPress={() => setStep('welcome')}>
              <AppText variant="caption" color={tokens.color.brand.primary} style={styles.center}>
                {t('auth.backWelcome')}
              </AppText>
            </Pressable>
          </>
        ) : null}

        {step === 'code' ? (
          <>
            {devCode ? (
              <View style={styles.devCode}>
                <AppText variant="caption" color={tokens.color.brand.primary}>
                  {t('auth.devCode', { code: devCode })}
                </AppText>
              </View>
            ) : null}
            <Controller
              control={codeForm.control}
              name="code"
              render={({ field, fieldState }) => (
                <TextField
                  label={t('auth.codeLabel')}
                  keyboardType="number-pad"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error ? t('errors.generic') : undefined}
                />
              )}
            />
            <Button
              label={t('auth.verify')}
              loading={codeForm.formState.isSubmitting}
              onPress={codeForm.handleSubmit(async (values) => {
                setFormError(undefined);
                try {
                  const pair = await verifyOtp(phone, values.code);
                  await setSession(pair);
                  await finishSession(pair.refreshToken);
                } catch (error) {
                  setFormError(error instanceof ApiError ? error.problem.detail : t('errors.generic'));
                }
              })}
            />
            <Button
              label={t('common.changePhone')}
              variant="ghost"
              onPress={() => {
                setStep(intent === 'signup' ? 'register' : 'phone');
                setDevCode(undefined);
                setFormError(undefined);
              }}
            />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: tokens.spacing.sm,
    padding: tokens.spacing.lg,
    marginHorizontal: -tokens.layout.screenPadding,
    marginTop: -tokens.layout.screenPadding,
    backgroundColor: tokens.color.brand.deep,
    overflow: 'hidden',
    position: 'relative',
  },
  logoWrap: {
    zIndex: 1,
    alignSelf: 'flex-start',
    marginBottom: tokens.spacing.xs,
  },
  kicker: {
    fontFamily: tokens.typography.family.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { fontSize: tokens.typography.size.xxl },
  card: {
    gap: tokens.spacing.md,
    padding: tokens.spacing.lg,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  devCode: {
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.surface.mint,
  },
  center: { textAlign: 'center' },
});
