import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { fetchModuleCatalog, MODULE_CODES } from '@/api/merchant';
import { AppText } from '@/components/app-text';
import { PhoneField } from '@/components/phone-field';
import { TextField } from '@/components/text-field';
import { MODULE_COPY } from '@/features/plan/module-copy';
import { quoteModules, WEEK_DAYS, type RestaurantPlaceValues, type WeekDay } from '@/features/onboarding/restaurant-place';
import { t } from '@/i18n';
import { tokens } from '@/theme';

const DAY_LABELS: Record<WeekDay, string> = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mer',
  THURSDAY: 'Jeu',
  FRIDAY: 'Ven',
  SATURDAY: 'Sam',
  SUNDAY: 'Dim',
};

export function RestaurantPlaceForm({
  control,
  setValue,
  showOwnerName = false,
}: {
  control: Control<RestaurantPlaceValues>;
  setValue?: UseFormSetValue<RestaurantPlaceValues>;
  showOwnerName?: boolean;
}) {
  const catalog = useQuery({ queryKey: ['merchant', 'module-catalog'], queryFn: fetchModuleCatalog });
  const modules = useWatch({ control, name: 'modules' });
  const selected = Object.entries(modules ?? {}).filter(([, enabled]) => enabled).map(([code]) => code);

  useEffect(() => {
    if (!catalog.data || !setValue) {
      return;
    }
    const current = modules ?? {};
    const next = { ...current };
    let changed = false;
    for (const item of catalog.data.modules) {
      if (next[item.code] === undefined) {
        next[item.code] = item.included;
        changed = true;
      }
    }
    if (changed) {
      setValue('modules', next);
    }
  }, [catalog.data, modules, setValue]);

  return (
    <>
      {showOwnerName ? (
        <Controller
          control={control}
          name="fullName"
          render={({ field, fieldState }) => (
            <TextField
              label={t('auth.fullName')}
              value={field.value ?? ''}
              onChangeText={field.onChange}
              error={fieldState.error ? t('errors.generic') : undefined}
            />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label={t('auth.organizationName')}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error ? t('errors.generic') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField
            label={t('manage.description')}
            value={field.value ?? ''}
            onChangeText={field.onChange}
            multiline
          />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <PhoneField
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error ? t('errors.generic') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="city"
        render={({ field, fieldState }) => (
          <TextField
            label={t('manage.city')}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error ? t('errors.generic') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="district"
        render={({ field, fieldState }) => (
          <TextField
            label={t('manage.district')}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error ? t('errors.generic') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="addressLine"
        render={({ field, fieldState }) => (
          <TextField
            label={t('manage.address')}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error ? t('errors.generic') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="landmarkText"
        render={({ field }) => (
          <TextField label={t('manage.landmark')} value={field.value ?? ''} onChangeText={field.onChange} />
        )}
      />

      <AppText variant="subtitle">{t('auth.hours')}</AppText>
      <View style={styles.row}>
        <View style={styles.grow}>
          <Controller
            control={control}
            name="opensAt"
            render={({ field, fieldState }) => (
              <TextField
                label={t('auth.opensAt')}
                value={field.value}
                onChangeText={field.onChange}
                placeholder="HH:MM"
                error={fieldState.error ? t('errors.generic') : undefined}
              />
            )}
          />
        </View>
        <View style={styles.grow}>
          <Controller
            control={control}
            name="closesAt"
            render={({ field, fieldState }) => (
              <TextField
                label={t('auth.closesAt')}
                value={field.value}
                onChangeText={field.onChange}
                placeholder="HH:MM"
                error={fieldState.error ? t('errors.generic') : undefined}
              />
            )}
          />
        </View>
      </View>
      <Controller
        control={control}
        name="weekDays"
        render={({ field }) => (
          <View style={styles.row}>
            {WEEK_DAYS.map((day) => (
              <Pressable
                key={day}
                onPress={() => field.onChange({ ...field.value, [day]: !field.value?.[day] })}
                style={[styles.chip, field.value?.[day] ? styles.chipOn : null]}
              >
                <AppText color={field.value?.[day] ? tokens.color.brand.primary : tokens.color.text.muted}>
                  {DAY_LABELS[day]}
                </AppText>
              </Pressable>
            ))}
          </View>
        )}
      />

      <AppText variant="subtitle">{t('auth.services')}</AppText>
      <View style={styles.row}>
        <Toggle control={control} name="dineIn" label={t('auth.dineIn')} />
        <Toggle control={control} name="takeaway" label={t('auth.takeaway')} />
      </View>
      <AppText variant="subtitle">{t('manage.amenities')}</AppText>
      <View style={styles.row}>
        <Toggle control={control} name="hasTerrace" label={t('manage.terrace')} />
        <Toggle control={control} name="hasAirConditioning" label={t('manage.ac')} />
        <Toggle control={control} name="accessible" label={t('manage.accessible')} />
      </View>

      <AppText variant="subtitle">{t('auth.modules')}</AppText>
      {catalog.data?.notice ? <AppText variant="muted">{catalog.data.notice}</AppText> : null}
      <View style={styles.quote}>
        <AppText variant="caption" color={tokens.color.brand.accent}>
          {t('auth.quoteLabel')}
        </AppText>
        <AppText variant="subtitle" color={tokens.color.text.onBrand}>
          {quoteModules(catalog.data, selected)}
        </AppText>
      </View>
      {(catalog.data?.modules ?? []).map((item) => {
        const copy = MODULE_COPY[item.code];
        const enabled = Boolean(modules?.[item.code]);
        const locked = item.code === MODULE_CODES.STOREFRONT_BASIC;
        return (
          <Controller
            key={item.code}
            control={control}
            name={`modules.${item.code}` as const}
            render={({ field }) => (
              <Pressable
                disabled={locked}
                onPress={() => field.onChange(!field.value)}
                style={[styles.module, enabled ? styles.moduleOn : null]}
              >
                <View style={styles.grow}>
                  <AppText variant="subtitle">{copy?.title ?? item.label}</AppText>
                  <AppText variant="muted">{copy?.detail ?? item.label}</AppText>
                  <AppText variant="caption">
                    {item.included ? t('plan.included') : `${item.monthlyPrice.formatted} / mois`}
                  </AppText>
                </View>
              </Pressable>
            )}
          />
        );
      })}
    </>
  );
}

function Toggle({
  control,
  name,
  label,
}: {
  control: Control<RestaurantPlaceValues>;
  name: keyof Pick<
    RestaurantPlaceValues,
    'dineIn' | 'takeaway' | 'hasTerrace' | 'hasAirConditioning' | 'accessible'
  >;
  label: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Pressable
          onPress={() => field.onChange(!field.value)}
          style={[styles.chip, field.value ? styles.chipOn : null]}
        >
          <AppText color={field.value ? tokens.color.brand.primary : tokens.color.text.muted}>{label}</AppText>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  grow: { flex: 1, minWidth: 120, gap: 4 },
  chip: {
    minHeight: 36,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: tokens.color.surface.mint,
    borderColor: tokens.color.brand.primary,
  },
  quote: {
    gap: 2,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.brand.deep,
  },
  module: {
    gap: 4,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    backgroundColor: tokens.color.surface.white,
  },
  moduleOn: {
    borderColor: tokens.color.brand.primary,
    backgroundColor: tokens.color.surface.mint,
  },
});
