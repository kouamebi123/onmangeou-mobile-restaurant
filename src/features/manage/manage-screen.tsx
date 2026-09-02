import { DeliveryPanel, ReviewPanel } from './service-panels';
import { ReservationPanel } from './reservation-panel';
import { EventsPanel } from './events-panel';
import { CouponsPanel } from './coupons-panel';
import { useMutation, useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { Controller, useForm, type UseFormReturn } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';

import { fetchMe, refreshTokens } from '@/api/auth';
import {
  createOrganization,
  createTable,
  fetchEntitlements,
  fetchEstablishments,
  fetchHours,
  fetchMembers,
  fetchTables,
  hasModule,
  inviteMember,
  MODULE_CODES,
  publishEstablishment,
  saveHours,
  submitVerification,
  updateEstablishment,
  type Establishment,
} from '@/api/merchant';
import { FinancePanel } from '@/features/manage/finance-panel';
import { RestaurantPlaceForm } from '@/features/onboarding/restaurant-place-form';
import {
  EMPTY_RESTAURANT_PLACE,
  minutesToClock,
  parseClockMinutes,
  provisionEstablishment,
  restaurantPlaceSchema,
  WEEK_DAYS,
  type RestaurantPlaceValues,
  type WeekDay,
} from '@/features/onboarding/restaurant-place';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHero } from '@/components/page-hero';
import { Screen } from '@/components/screen';
import { SectionHeading } from '@/components/section-heading';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { hapticSuccess } from '@/feedback/haptics';
import { t } from '@/i18n';
import { useAuthStore } from '@/store/auth-store';
import { tokens } from '@/theme';
import { ImagePickerField } from '@/components/image-picker-field';
import type { UploadAsset } from '@/api/client';
import { uploadEstablishmentCover } from '@/api/merchant';

export function ManageScreen() {
  const queryClient = useQueryClient();
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setSession = useAuthStore((state) => state.setSession);

  const me = useQuery({ queryKey: ['me'], queryFn: fetchMe });
  const hasMembership = (me.data?.memberships.length ?? 0) > 0;

  const establishments = useQuery({
    queryKey: ['merchant', 'establishments'],
    queryFn: fetchEstablishments,
    enabled: hasMembership,
  });

  const form = useForm<RestaurantPlaceValues>({
    resolver: zodResolver(restaurantPlaceSchema),
    defaultValues: EMPTY_RESTAURANT_PLACE,
  });

  const create = useMutation({
    mutationFn: async (values: RestaurantPlaceValues) => {
      if (!hasMembership) {
        const organization = await createOrganization({
          name: values.name.trim(),
          contactPhone: values.phone.trim(),
        });
        if (refreshToken) {
          const refreshed = await refreshTokens(refreshToken, organization.organizationId);
          await setSession(refreshed, organization.organizationId);
        }
      }
      await provisionEstablishment(values);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      void queryClient.invalidateQueries({ queryKey: ['merchant'] });
    },
  });

  return (
    <Screen>
      <PageHero
        icon="settings-outline"
        kicker={t('app.name')}
        title={t('manage.title')}
        subtitle={t('manage.hero')}
      />
      {me.isError ? <ErrorState onRetry={() => void me.refetch()} /> : null}

      {me.isLoading ? (
        <>
          <Skeleton height={120} />
          <Skeleton height={220} />
        </>
      ) : !hasMembership ? (
        <>
          <EmptyState title={t('empty.organization')} detail={t('empty.organizationDetail')} />
          <CreateRestaurantCard form={form} creating={create} />
        </>
      ) : (
        <>
          <SectionHeading title={t('manage.establishments')} />
          {establishments.isLoading ? <AppText variant="muted">{t('common.loading')}</AppText> : null}
          {establishments.isError ? (
            <ErrorState onRetry={() => void establishments.refetch()} />
          ) : null}
          {establishments.data && establishments.data.length === 0 ? (
            <>
              <EmptyState title={t('empty.establishments')} detail={t('empty.establishmentsDetail')} />
              <CreateRestaurantCard form={form} creating={create} />
            </>
          ) : null}
          {establishments.data?.map((establishment) => (
            <View key={establishment.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.mark}>
                  <Ionicons name="storefront-outline" size={18} color={tokens.color.brand.primary} />
                </View>
                <View style={styles.body}>
                  <AppText variant="subtitle">{establishment.name}</AppText>
                  <AppText variant="muted">
                    {[establishment.district, establishment.city].filter(Boolean).join(' · ') || establishment.city}
                  </AppText>
                </View>
              </View>
            </View>
          ))}
          {establishments.data?.[0] ? <EstablishmentEditor establishment={establishments.data[0]} /> : null}
          {establishments.data?.[0] ? <HoursPanel establishmentId={establishments.data[0].id} /> : null}
          {establishments.data?.[0] ? <FinancePanel establishmentId={establishments.data[0].id} /> : null}
          {establishments.data?.[0] ? <ServicePanel establishmentId={establishments.data[0].id} /> : null}
          {establishments.data?.[0] ? <TablesPanel establishmentId={establishments.data[0].id} /> : null}
          {establishments.data?.[0] ? <CouponsPanel establishmentId={establishments.data[0].id} /> : null}
          {establishments.data?.[0] ? <TeamPanel establishmentId={establishments.data[0].id} /> : null}
        </>
      )}
    </Screen>
  );
}

function CreateRestaurantCard({
  form,
  creating,
}: {
  form: UseFormReturn<RestaurantPlaceValues>;
  creating: UseMutationResult<void, Error, RestaurantPlaceValues>;
}) {
  return (
    <View style={styles.card}>
      <AppText variant="muted">{t('manage.createLead')}</AppText>
      <RestaurantPlaceForm control={form.control} setValue={form.setValue} />
      {creating.isError ? (
        <AppText color={tokens.color.feedback.error}>
          {creating.error instanceof ApiError ? creating.error.problem.detail : t('errors.generic')}
        </AppText>
      ) : null}
      <Button
        label={t('manage.createRestaurant')}
        loading={creating.isPending}
        onPress={form.handleSubmit((values) => creating.mutate(values))}
      />
    </View>
  );
}

const placeSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  phone: z.string().max(24).optional(),
  city: z.string().min(2).max(120),
  district: z.string().max(120).optional(),
  addressLine: z.string().max(300).optional(),
  landmarkText: z.string().max(300).optional(),
});

type PlaceValues = z.infer<typeof placeSchema>;

function EstablishmentEditor({ establishment }: { establishment: Establishment }) {
  const queryClient = useQueryClient();
  const [cover, setCover] = useState<UploadAsset>();
  const form = useForm<PlaceValues>({
    resolver: zodResolver(placeSchema),
    defaultValues: {
      name: establishment.name,
      description: establishment.description ?? '',
      phone: establishment.phoneE164 ?? '',
      city: establishment.city,
      district: establishment.district ?? '',
      addressLine: establishment.addressLine ?? '',
      landmarkText: establishment.landmarkText ?? '',
    },
  });

  useEffect(() => {
    form.reset({
      name: establishment.name,
      description: establishment.description ?? '',
      phone: establishment.phoneE164 ?? '',
      city: establishment.city,
      district: establishment.district ?? '',
      addressLine: establishment.addressLine ?? '',
      landmarkText: establishment.landmarkText ?? '',
    });
  }, [establishment, form]);

  const save = useMutation({
    mutationFn: async (values: PlaceValues) => {
      await updateEstablishment(establishment.id, {
        name: values.name,
        description: values.description?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        city: values.city,
        district: values.district?.trim() || undefined,
        addressLine: values.addressLine?.trim() || undefined,
        landmarkText: values.landmarkText?.trim() || undefined,
      });
      if (cover) await uploadEstablishmentCover(establishment.id, cover);
    },
    onSuccess: () => {
      hapticSuccess();
      void queryClient.invalidateQueries({ queryKey: ['merchant', 'establishments'] });
    },
  });

  return (
    <View style={styles.card}>
      <AppText variant="subtitle">{t('manage.editPlace')}</AppText>
      <ImagePickerField label={t('manage.mainPhoto')} currentUrl={establishment.coverImageUrl} value={cover} onChange={setCover} />
      <Controller
        control={form.control}
        name="name"
        render={({ field }) => <TextField label={t('manage.placeName')} value={field.value} onChangeText={field.onChange} />}
      />
      <Controller
        control={form.control}
        name="description"
        render={({ field }) => (
          <TextField label={t('manage.description')} value={field.value ?? ''} onChangeText={field.onChange} multiline />
        )}
      />
      <Controller
        control={form.control}
        name="phone"
        render={({ field }) => (
          <TextField
            label={t('manage.phone')}
            keyboardType="phone-pad"
            value={field.value ?? ''}
            onChangeText={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="city"
        render={({ field }) => <TextField label={t('manage.city')} value={field.value} onChangeText={field.onChange} />}
      />
      <Controller
        control={form.control}
        name="district"
        render={({ field }) => (
          <TextField label={t('manage.district')} value={field.value ?? ''} onChangeText={field.onChange} />
        )}
      />
      <Controller
        control={form.control}
        name="addressLine"
        render={({ field }) => (
          <TextField label={t('manage.address')} value={field.value ?? ''} onChangeText={field.onChange} />
        )}
      />
      <Controller
        control={form.control}
        name="landmarkText"
        render={({ field }) => (
          <TextField label={t('manage.landmark')} value={field.value ?? ''} onChangeText={field.onChange} />
        )}
      />
      {save.isError ? (
        <AppText color={tokens.color.feedback.error}>
          {save.error instanceof ApiError ? save.error.problem.detail : t('errors.generic')}
        </AppText>
      ) : null}
      {save.isSuccess ? <AppText color={tokens.color.brand.primary}>{t('manage.saved')}</AppText> : null}
      <Button label={t('common.save')} loading={save.isPending} onPress={form.handleSubmit((values) => save.mutate(values))} />
      <AppText variant="subtitle">{t('manage.amenities')}</AppText>
      <View style={styles.row}>
        <AmenityToggle
          label={t('manage.terrace')}
          value={Boolean(establishment.hasTerrace)}
          onToggle={() =>
            updateEstablishment(establishment.id, { hasTerrace: !establishment.hasTerrace }).then(() =>
              queryClient.invalidateQueries({ queryKey: ['merchant', 'establishments'] }),
            )
          }
        />
        <AmenityToggle
          label={t('manage.ac')}
          value={Boolean(establishment.hasAirConditioning)}
          onToggle={() =>
            updateEstablishment(establishment.id, { hasAirConditioning: !establishment.hasAirConditioning }).then(() =>
              queryClient.invalidateQueries({ queryKey: ['merchant', 'establishments'] }),
            )
          }
        />
        <AmenityToggle
          label={t('manage.accessible')}
          value={Boolean(establishment.accessible)}
          onToggle={() =>
            updateEstablishment(establishment.id, { accessible: !establishment.accessible }).then(() =>
              queryClient.invalidateQueries({ queryKey: ['merchant', 'establishments'] }),
            )
          }
        />
      </View>
      {establishment.verifiedAt ? (
        <AppText variant="muted">{t('manage.verified')}</AppText>
      ) : (
        <Button
          label={t('manage.requestVerification')}
          variant="outline"
          onPress={() =>
            submitVerification(establishment.id).then(() =>
              queryClient.invalidateQueries({ queryKey: ['merchant', 'establishments'] }),
            )
          }
        />
      )}
      {establishment.status === 'PUBLISHED' ? (
        <AppText variant="muted">{t('manage.published')}</AppText>
      ) : (
        <Button
          label={t('manage.publish')}
          variant="ghost"
          onPress={() =>
            publishEstablishment(establishment.id).then(() =>
              queryClient.invalidateQueries({ queryKey: ['merchant', 'establishments'] }),
            )
          }
        />
      )}
    </View>
  );
}

function AmenityToggle({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={onToggle}
      style={[styles.chip, value ? styles.chipOn : null]}
    >
      <AppText color={value ? tokens.color.brand.primary : tokens.color.text.muted}>{label}</AppText>
    </Pressable>
  );
}

function ServicePanel({ establishmentId }: { establishmentId: string }) {
  const entitlements = useQuery({
    queryKey: ['merchant', 'entitlements'],
    queryFn: () => fetchEntitlements(),
  });
  const enabled = entitlements.data?.enabledModules ?? [];
  const ready = entitlements.isSuccess;
  const hasReservations = hasModule(enabled, MODULE_CODES.RESERVATIONS_TABLES);
  const hasDelivery = hasModule(enabled, MODULE_CODES.DELIVERY_INTERNAL);
  const hasReviews = hasModule(enabled, MODULE_CODES.STOREFRONT_BASIC);
  const hasMarketing = hasModule(enabled, MODULE_CODES.MARKETING_PROMOTIONS);


  if (!ready || (!hasReservations && !hasDelivery && !hasReviews && !hasMarketing)) {
    return null;
  }

  return (
    <>
      <SectionHeading title={t('service.title')} />
      {hasReservations ? <ReservationPanel establishmentId={establishmentId} /> : null}
      {hasDelivery ? <DeliveryPanel establishmentId={establishmentId} /> : null}
      {hasReviews || hasMarketing ? (
        <View style={styles.card}>
          {hasReviews ? <ReviewPanel establishmentId={establishmentId} /> : null}
          {hasMarketing ? <EventsPanel establishmentId={establishmentId} /> : null}
        </View>
      ) : null}
    </>
  );
}

const HOUR_DAY_LABELS: Record<WeekDay, string> = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mer',
  THURSDAY: 'Jeu',
  FRIDAY: 'Ven',
  SATURDAY: 'Sam',
  SUNDAY: 'Dim',
};

function emptyWeekDays(): Record<WeekDay, boolean> {
  return {
    MONDAY: false,
    TUESDAY: false,
    WEDNESDAY: false,
    THURSDAY: false,
    FRIDAY: false,
    SATURDAY: false,
    SUNDAY: false,
  };
}

function HoursPanel({ establishmentId }: { establishmentId: string }) {
  const queryClient = useQueryClient();
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [weekDays, setWeekDays] = useState<Record<WeekDay, boolean>>(emptyWeekDays);
  const hours = useQuery({
    queryKey: ['merchant', 'hours', establishmentId],
    queryFn: () => fetchHours(establishmentId),
  });

  useEffect(() => {
    const slots = hours.data ?? [];
    if (slots.length === 0) {
      return;
    }
    const first = slots[0];
    if (first) {
      setOpensAt(minutesToClock(first.opensAtMinutes));
      setClosesAt(minutesToClock(first.closesAtMinutes));
    }
    const next = emptyWeekDays();
    for (const slot of slots) {
      if (slot.weekDay in next) {
        next[slot.weekDay as WeekDay] = true;
      }
    }
    setWeekDays(next);
  }, [hours.data]);

  const save = useMutation({
    mutationFn: () => {
      const selected = WEEK_DAYS.filter((weekDay) => weekDays[weekDay]);
      if (selected.length === 0) {
        throw new Error(t('manage.hoursNeedDay'));
      }
      let opensAtMinutes = parseClockMinutes(opensAt);
      let closesAtMinutes = parseClockMinutes(closesAt);
      if (closesAtMinutes <= opensAtMinutes) {
        closesAtMinutes += 1440;
      }
      return saveHours(
        establishmentId,
        selected.map((weekDay) => ({ weekDay, opensAtMinutes, closesAtMinutes })),
      );
    },
    onSuccess: () => {
      hapticSuccess();
      void queryClient.invalidateQueries({ queryKey: ['merchant', 'hours'] });
    },
  });

  return (
    <View style={styles.card}>
      <AppText variant="subtitle">{t('manage.hours')}</AppText>
      <View style={styles.row}>
        <View style={styles.grow}>
          <TextField label={t('manage.opensAt')} value={opensAt} onChangeText={setOpensAt} placeholder={t('manage.hoursPlaceholder')} />
        </View>
        <View style={styles.grow}>
          <TextField label={t('manage.closesAt')} value={closesAt} onChangeText={setClosesAt} placeholder={t('manage.hoursPlaceholder')} />
        </View>
      </View>
      <View style={styles.row}>
        {WEEK_DAYS.map((weekDay) => (
          <Pressable
            key={weekDay}
            accessibilityRole="button"
            accessibilityLabel={HOUR_DAY_LABELS[weekDay]}
            accessibilityState={{ selected: weekDays[weekDay] }}
            onPress={() => setWeekDays((current) => ({ ...current, [weekDay]: !current[weekDay] }))}
            style={[styles.chip, weekDays[weekDay] ? styles.chipOn : null]}
          >
            <AppText color={weekDays[weekDay] ? tokens.color.brand.primary : tokens.color.text.muted}>
              {HOUR_DAY_LABELS[weekDay]}
            </AppText>
          </Pressable>
        ))}
      </View>
      {save.error ? (
        <AppText color={tokens.color.feedback.error}>{save.error instanceof Error ? save.error.message : t('errors.generic')}</AppText>
      ) : null}
      <Button label={t('manage.saveHours')} variant="outline" loading={save.isPending} onPress={() => save.mutate()} />
    </View>
  );
}

function TablesPanel({ establishmentId }: { establishmentId: string }) {
  const entitlements = useQuery({ queryKey: ['merchant', 'entitlements'], queryFn: () => fetchEntitlements() });
  const enabled = hasModule(entitlements.data?.enabledModules, MODULE_CODES.RESERVATIONS_TABLES);
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [seats, setSeats] = useState('');
  const tables = useQuery({
    queryKey: ['merchant', 'tables', establishmentId],
    queryFn: () => fetchTables(establishmentId),
    enabled,
  });
  if (!enabled) {
    return null;
  }
  return (
    <View style={styles.card}>
      <AppText variant="subtitle">{t('manage.floorPlan')}</AppText>
      {tables.data?.map((table) => (
        <AppText key={table.id}>
          {table.name} · {table.seats} {t('manage.seats')}
        </AppText>
      ))}
      <TextField label={t('manage.tableName')} value={name} onChangeText={setName} />
      <TextField label={t('manage.covers')} keyboardType="number-pad" value={seats} onChangeText={setSeats} />
      <Button
        label={t('manage.addTable')}
        variant="outline"
        disabled={name.trim().length === 0}
        onPress={() =>
          createTable(establishmentId, name.trim(), Number(seats) || 2).then(() => {
            void queryClient.invalidateQueries({ queryKey: ['merchant', 'tables'] });
          })
        }
      />
    </View>
  );
}

function TeamPanel({ establishmentId }: { establishmentId: string }) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('KITCHEN');
  const [error, setError] = useState<string | null>(null);
  const members = useQuery({ queryKey: ['merchant', 'members'], queryFn: fetchMembers });
  const invite = useMutation({
    mutationFn: () => inviteMember({ phone, roleCode: role, displayName: name.trim() || undefined, establishmentId }),
    onSuccess: () => {
      setPhone('');
      setName('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['merchant', 'members'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.problem.detail : t('errors.generic'));
    },
  });

  return (
    <View style={styles.card}>
      <AppText variant="subtitle">{t('manage.team')}</AppText>
      {members.data?.map((member) => (
        <AppText key={member.id}>
          {member.displayName ?? member.phoneE164} · {member.roleCode}
        </AppText>
      ))}
      <TextField label={t('manage.memberName')} value={name} onChangeText={setName} />
      <TextField label={t('manage.memberPhone')} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <View style={styles.row}>
        {(['KITCHEN', 'CASHIER', 'WAITER'] as const).map((code) => (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityLabel={code}
            accessibilityState={{ selected: role === code }}
            onPress={() => setRole(code)}
            style={[styles.chip, role === code ? styles.chipOn : null]}
          >
            <AppText color={role === code ? tokens.color.brand.primary : tokens.color.text.muted}>{code}</AppText>
          </Pressable>
        ))}
      </View>
      {error ? <AppText color={tokens.color.feedback.error}>{error}</AppText> : null}
      <Button
        label={t('manage.inviteMember')}
        variant="outline"
        loading={invite.isPending}
        disabled={phone.trim().length < 8}
        onPress={() => invite.mutate()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, flexWrap: 'wrap' },
  chip: {
    minHeight: tokens.layout.minTouchTarget,
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
  mark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.color.surface.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  grow: { flex: 1, minWidth: 120 },
});
