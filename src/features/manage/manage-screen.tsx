import { CampaignsPanel } from "./campaigns-panel";
import { DeliveryPanel, ReviewPanel } from "./service-panels";
import { ReservationPanel } from "./reservation-panel";
import { EventsPanel } from "./events-panel";
import { CompletionCard } from "./completion-ui";
import { CouponsPanel } from "./coupons-panel";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";

import { fetchMe, refreshTokens } from "@/api/auth";
import {
  createOrganization,
  createTable,
  fetchEntitlements,
  fetchEstablishments,
  fetchMembers,
  fetchTables,
  hasModule,
  inviteMember,
  MODULE_CODES,
  publishEstablishment,
  submitVerification,
  updateEstablishment,
  type Establishment,
} from "@/api/merchant";
import { FinancePanel } from "@/features/manage/finance-panel";
import { HoursPanel } from "@/features/manage/hours-panel";
import { RestaurantPlaceForm } from "@/features/onboarding/restaurant-place-form";
import {
  EMPTY_RESTAURANT_PLACE,
  provisionEstablishment,
  restaurantPlaceSchema,
  type RestaurantPlaceValues,
} from "@/features/onboarding/restaurant-place";
import { ApiError } from "@/api/envelope";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Appear } from "@/components/motion";
import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { SectionHeading } from "@/components/section-heading";
import { Skeleton } from "@/components/skeleton";
import { TextField } from "@/components/text-field";
import { hapticSuccess } from "@/feedback/haptics";
import { t } from "@/i18n";
import { useAuthStore } from "@/store/auth-store";
import { tokens } from "@/theme";
import { ImagePickerField } from "@/components/image-picker-field";
import type { UploadAsset } from "@/api/client";
import { uploadEstablishmentCover } from "@/api/merchant";

function roleLabel(code: string): string {
  const label = t(`manage.roles.${code}`);
  return label === `manage.roles.${code}` ? code : label;
}

const MANAGE_SECTIONS = ["storefront", "service", "finance", "team"] as const;
type ManageSection = (typeof MANAGE_SECTIONS)[number];

function toManageSection(value: unknown): ManageSection {
  return MANAGE_SECTIONS.includes(value as ManageSection)
    ? (value as ManageSection)
    : "storefront";
}

export function ManageScreen() {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ section?: string }>();
  const [section, setSection] = useState<ManageSection>(() =>
    toManageSection(params.section),
  );
  // A section stays mounted once opened, so a form being filled in is not lost
  // when the restaurateur looks at another section and comes back.
  const [opened, setOpened] = useState<ManageSection[]>(() => [
    toManageSection(params.section),
  ]);
  const openSection = (next: ManageSection) => {
    setSection(next);
    setOpened((current) => (current.includes(next) ? current : [...current, next]));
  };

  useEffect(() => {
    // Another screen can ask for a section: « Voir les réservations » on Activité.
    if (params.section) {
      const next = toManageSection(params.section);
      setSection(next);
      setOpened((current) => (current.includes(next) ? current : [...current, next]));
    }
  }, [params.section]);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setSession = useAuthStore((state) => state.setSession);

  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const hasMembership = (me.data?.memberships.length ?? 0) > 0;

  const establishments = useQuery({
    queryKey: ["merchant", "establishments"],
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
          const refreshed = await refreshTokens(
            refreshToken,
            organization.organizationId,
          );
          await setSession(refreshed, organization.organizationId);
        }
      }
      await provisionEstablishment(values);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["merchant"] });
    },
  });

  return (
    <Screen>
      <PageHero
        icon="settings-outline"
        kicker={t("app.name")}
        title={t("manage.title")}
        subtitle={t("manage.hero")}
      />
      {me.isError ? <ErrorState onRetry={() => void me.refetch()} /> : null}

      {me.isLoading ? (
        <>
          <Skeleton height={120} />
          <Skeleton height={220} />
        </>
      ) : !hasMembership ? (
        <>
          <EmptyState
            title={t("empty.organization")}
            detail={t("empty.organizationDetail")}
          />
          <Appear index={1}>
            <CreateRestaurantCard form={form} creating={create} />
          </Appear>
        </>
      ) : (
        <>
          <Appear>
            <SectionHeading title={t("manage.establishments")} />
          </Appear>
          {establishments.isLoading ? (
            <AppText variant="muted">{t("common.loading")}</AppText>
          ) : null}
          {establishments.isError ? (
            <ErrorState onRetry={() => void establishments.refetch()} />
          ) : null}
          {establishments.data && establishments.data.length === 0 ? (
            <>
              <EmptyState
                title={t("empty.establishments")}
                detail={t("empty.establishmentsDetail")}
              />
              <Appear index={1}>
                <CreateRestaurantCard form={form} creating={create} />
              </Appear>
            </>
          ) : null}
          {establishments.data?.map((establishment, index) => (
            <Appear key={establishment.id} index={index}>
              <View style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.mark}>
                    <Ionicons
                      name="storefront-outline"
                      size={18}
                      color={tokens.color.brand.primary}
                    />
                  </View>
                  <View style={styles.body}>
                    <AppText variant="subtitle">{establishment.name}</AppText>
                    <AppText variant="muted">
                      {[establishment.district, establishment.city]
                        .filter(Boolean)
                        .join(" · ") || establishment.city}
                    </AppText>
                  </View>
                </View>
              </View>
            </Appear>
          ))}
          {establishments.data?.[0] ? (
            <>
              <Appear>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.sectionTabsScroll}
                  contentContainerStyle={styles.sectionTabs}
                >
                  {MANAGE_SECTIONS.map((item) => (
                    <Pressable
                      key={item}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: section === item }}
                      onPress={() => openSection(item)}
                      style={[
                        styles.sectionTab,
                        section === item ? styles.sectionTabOn : null,
                      ]}
                    >
                      <AppText
                        color={
                          section === item
                            ? tokens.color.text.onBrand
                            : tokens.color.brand.deep
                        }
                        style={styles.sectionTabLabel}
                      >
                        {t(`manage.sections.${item}`)}
                      </AppText>
                    </Pressable>
                  ))}
                </ScrollView>
              </Appear>
              {/* Une section reste montée après sa première ouverture (saisie
                  conservée) ; son apparition en fondu se rejoue à chaque retour. */}
              {opened.includes("storefront") ? (
                <Appear
                  visible={section === "storefront"}
                  style={section === "storefront" ? styles.section : styles.hidden}
                >
                  <EstablishmentEditor establishment={establishments.data[0]} />
                  <HoursPanel establishmentId={establishments.data[0].id} />
                </Appear>
              ) : null}
              {opened.includes("service") ? (
                <Appear
                  visible={section === "service"}
                  style={section === "service" ? styles.section : styles.hidden}
                >
                  <ServicePanel establishmentId={establishments.data[0].id} />
                  <TablesPanel establishmentId={establishments.data[0].id} />
                </Appear>
              ) : null}
              {opened.includes("finance") ? (
                <Appear
                  visible={section === "finance"}
                  style={section === "finance" ? styles.section : styles.hidden}
                >
                  <FinancePanel establishmentId={establishments.data[0].id} />
                </Appear>
              ) : null}
              {opened.includes("team") ? (
                <Appear
                  visible={section === "team"}
                  style={section === "team" ? styles.section : styles.hidden}
                >
                  <CouponsPanel establishmentId={establishments.data[0].id} />
                  <TeamPanel establishmentId={establishments.data[0].id} />
                </Appear>
              ) : null}
            </>
          ) : null}
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
      <AppText variant="muted">{t("manage.createLead")}</AppText>
      <RestaurantPlaceForm control={form.control} setValue={form.setValue} />
      {creating.isError ? (
        <Appear>
          <AppText color={tokens.color.feedback.error}>
            {creating.error instanceof ApiError
              ? creating.error.problem.detail
              : t("errors.generic")}
          </AppText>
        </Appear>
      ) : null}
      <Button
        label={t("manage.createRestaurant")}
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

function EstablishmentEditor({
  establishment,
}: {
  establishment: Establishment;
}) {
  const queryClient = useQueryClient();
  const [cover, setCover] = useState<UploadAsset>();
  const form = useForm<PlaceValues>({
    resolver: zodResolver(placeSchema),
    defaultValues: {
      name: establishment.name,
      description: establishment.description ?? "",
      phone: establishment.phoneE164 ?? "",
      city: establishment.city,
      district: establishment.district ?? "",
      addressLine: establishment.addressLine ?? "",
      landmarkText: establishment.landmarkText ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      name: establishment.name,
      description: establishment.description ?? "",
      phone: establishment.phoneE164 ?? "",
      city: establishment.city,
      district: establishment.district ?? "",
      addressLine: establishment.addressLine ?? "",
      landmarkText: establishment.landmarkText ?? "",
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
      void queryClient.invalidateQueries({
        queryKey: ["merchant", "establishments"],
      });
    },
  });

  const quickAction = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["merchant", "establishments"],
      }),
  });
  return (
    <View style={styles.card}>
      <AppText variant="subtitle">{t("manage.editPlace")}</AppText>
      <ImagePickerField
        label={t("manage.mainPhoto")}
        currentUrl={establishment.coverImageUrl}
        value={cover}
        onChange={setCover}
      />
      <Controller
        control={form.control}
        name="name"
        render={({ field }) => (
          <TextField
            label={t("manage.placeName")}
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="description"
        render={({ field }) => (
          <TextField
            label={t("manage.description")}
            value={field.value ?? ""}
            onChangeText={field.onChange}
            multiline
          />
        )}
      />
      <Controller
        control={form.control}
        name="phone"
        render={({ field }) => (
          <TextField
            label={t("manage.phone")}
            keyboardType="phone-pad"
            value={field.value ?? ""}
            onChangeText={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="city"
        render={({ field }) => (
          <TextField
            label={t("manage.city")}
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="district"
        render={({ field }) => (
          <TextField
            label={t("manage.district")}
            value={field.value ?? ""}
            onChangeText={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="addressLine"
        render={({ field }) => (
          <TextField
            label={t("manage.address")}
            value={field.value ?? ""}
            onChangeText={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="landmarkText"
        render={({ field }) => (
          <TextField
            label={t("manage.landmark")}
            value={field.value ?? ""}
            onChangeText={field.onChange}
          />
        )}
      />
      {save.isError ? (
        <Appear>
          <AppText color={tokens.color.feedback.error}>
            {save.error instanceof ApiError
              ? save.error.problem.detail
              : t("errors.generic")}
          </AppText>
        </Appear>
      ) : null}
      {save.isSuccess ? (
        <Appear>
          <AppText color={tokens.color.brand.primary}>
            {t("manage.saved")}
          </AppText>
        </Appear>
      ) : null}
      <Button
        label={t("common.save")}
        loading={save.isPending}
        onPress={form.handleSubmit((values) => save.mutate(values))}
      />
      <AppText variant="subtitle">{t("manage.amenities")}</AppText>
      {quickAction.error ? (
        <Appear>
          <AppText
            accessibilityLiveRegion="polite"
            color={tokens.color.feedback.error}
          >
            {quickAction.error instanceof ApiError
              ? quickAction.error.problem.detail
              : t("errors.generic")}
          </AppText>
        </Appear>
      ) : null}
      <View style={styles.row}>
        <AmenityToggle
          label={t("manage.terrace")}
          value={Boolean(establishment.hasTerrace)}
          disabled={quickAction.isPending}
          onToggle={() =>
            quickAction.mutate(() =>
              updateEstablishment(establishment.id, {
                hasTerrace: !establishment.hasTerrace,
              }),
            )
          }
        />
        <AmenityToggle
          label={t("manage.ac")}
          value={Boolean(establishment.hasAirConditioning)}
          disabled={quickAction.isPending}
          onToggle={() =>
            quickAction.mutate(() =>
              updateEstablishment(establishment.id, {
                hasAirConditioning: !establishment.hasAirConditioning,
              }),
            )
          }
        />
        <AmenityToggle
          label={t("manage.accessible")}
          value={Boolean(establishment.accessible)}
          disabled={quickAction.isPending}
          onToggle={() =>
            quickAction.mutate(() =>
              updateEstablishment(establishment.id, {
                accessible: !establishment.accessible,
              }),
            )
          }
        />
      </View>
      {establishment.verifiedAt ? (
        <Appear>
          <AppText variant="muted">{t("manage.verified")}</AppText>
        </Appear>
      ) : (
        <Button
          label={t("manage.requestVerification")}
          disabled={quickAction.isPending}
          variant="outline"
          onPress={() =>
            quickAction.mutate(() => submitVerification(establishment.id))
          }
        />
      )}
      {establishment.status === "PUBLISHED" ? (
        <Appear>
          <AppText variant="muted">{t("manage.published")}</AppText>
        </Appear>
      ) : (
        <Button
          label={t("manage.publish")}
          disabled={quickAction.isPending}
          variant="ghost"
          onPress={() =>
            quickAction.mutate(() => publishEstablishment(establishment.id))
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
  disabled = false,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={[styles.chip, value ? styles.chipOn : null]}
    >
      <AppText
        color={value ? tokens.color.brand.primary : tokens.color.text.muted}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function ServicePanel({ establishmentId }: { establishmentId: string }) {
  const entitlements = useQuery({
    queryKey: ["merchant", "entitlements"],
    queryFn: () => fetchEntitlements(),
  });
  const enabled = entitlements.data?.enabledModules ?? [];
  const ready = entitlements.isSuccess;
  const hasReservations = hasModule(enabled, MODULE_CODES.RESERVATIONS_TABLES);
  const hasDelivery = hasModule(enabled, MODULE_CODES.DELIVERY_INTERNAL);
  const hasReviews = hasModule(enabled, MODULE_CODES.STOREFRONT_BASIC);
  const hasMarketing = hasModule(enabled, MODULE_CODES.MARKETING_PROMOTIONS);

  if (
    !ready ||
    (!hasReservations && !hasDelivery && !hasReviews && !hasMarketing)
  ) {
    return null;
  }

  return (
    <Appear>
      <CompletionCard>
        <SectionHeading title={t("service.title")} />
        {hasReservations ? (
          <View style={styles.serviceSection}>
            <ReservationPanel establishmentId={establishmentId} />
          </View>
        ) : null}
        {hasDelivery ? (
          <View style={styles.serviceSection}>
            <DeliveryPanel establishmentId={establishmentId} />
          </View>
        ) : null}
        {hasReviews ? (
          <View style={styles.serviceSection}>
            <ReviewPanel establishmentId={establishmentId} />
          </View>
        ) : null}
        {hasMarketing ? (
          <View style={styles.serviceSection}>
            <EventsPanel establishmentId={establishmentId} />
            <CampaignsPanel establishmentId={establishmentId} />
          </View>
        ) : null}
      </CompletionCard>
    </Appear>
  );
}

function TablesPanel({ establishmentId }: { establishmentId: string }) {
  const entitlements = useQuery({
    queryKey: ["merchant", "entitlements"],
    queryFn: () => fetchEntitlements(),
  });
  const enabled = hasModule(
    entitlements.data?.enabledModules,
    MODULE_CODES.RESERVATIONS_TABLES,
  );
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [seats, setSeats] = useState("");
  const create = useMutation({
    mutationFn: () => createTable(establishmentId, name.trim(), Number(seats)),
    onSuccess: async () => {
      setName("");
      setSeats("");
      hapticSuccess();
      await queryClient.invalidateQueries({ queryKey: ["merchant", "tables"] });
    },
  });
  const tables = useQuery({
    queryKey: ["merchant", "tables", establishmentId],
    queryFn: () => fetchTables(establishmentId),
    enabled,
  });
  if (!enabled) {
    return null;
  }
  return (
    <Appear>
      <View style={styles.card}>
        <AppText variant="subtitle">{t("manage.floorPlan")}</AppText>
        {tables.error ? (
          <ErrorState onRetry={() => void tables.refetch()} />
        ) : null}
        {tables.data?.map((table, index) => (
          <Appear key={table.id} index={index}>
            <AppText>
              {table.name} · {table.seats} {t("manage.seats")}
            </AppText>
          </Appear>
        ))}
        <TextField
          label={t("manage.tableName")}
          value={name}
          onChangeText={setName}
          editable={!create.isPending}
          maxLength={80}
        />
        <TextField
          label={t("manage.covers")}
          keyboardType="number-pad"
          value={seats}
          onChangeText={setSeats}
          editable={!create.isPending}
          maxLength={3}
        />
        {create.error ? (
          <Appear>
            <AppText
              accessibilityLiveRegion="polite"
              color={tokens.color.feedback.error}
            >
              {create.error instanceof ApiError
                ? create.error.problem.detail
                : t("errors.generic")}
            </AppText>
          </Appear>
        ) : null}
        <Button
          label={t("manage.addTable")}
          variant="outline"
          disabled={
            name.trim().length === 0 ||
            !/^\d{1,3}$/.test(seats) ||
            Number(seats) < 1 ||
            Number(seats) > 100
          }
          loading={create.isPending}
          onPress={() => create.mutate()}
        />
      </View>
    </Appear>
  );
}

function TeamPanel({ establishmentId }: { establishmentId: string }) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("KITCHEN");
  const [error, setError] = useState<string | null>(null);
  const members = useQuery({
    queryKey: ["merchant", "members"],
    queryFn: fetchMembers,
  });
  const invite = useMutation({
    mutationFn: () =>
      inviteMember({
        phone,
        roleCode: role,
        displayName: name.trim() || undefined,
        establishmentId,
      }),
    onSuccess: () => {
      setPhone("");
      setName("");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["merchant", "members"] });
    },
    onError: (err) => {
      setError(
        err instanceof ApiError ? err.problem.detail : t("errors.generic"),
      );
    },
  });

  return (
    <View style={styles.card}>
      <AppText variant="subtitle">{t("manage.team")}</AppText>
      {members.data?.map((member, index) => (
        <Appear key={member.id} index={index}>
          <AppText>
            {member.displayName ?? member.phoneE164} · {roleLabel(member.roleCode)}
          </AppText>
        </Appear>
      ))}
      <TextField
        label={t("manage.memberName")}
        value={name}
        onChangeText={setName}
      />
      <TextField
        label={t("manage.memberPhone")}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <View style={styles.row}>
        {(["KITCHEN", "CASHIER", "WAITER"] as const).map((code) => (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityLabel={roleLabel(code)}
            accessibilityState={{ selected: role === code }}
            onPress={() => setRole(code)}
            style={[styles.chip, role === code ? styles.chipOn : null]}
          >
            <AppText
              color={
                role === code
                  ? tokens.color.brand.primary
                  : tokens.color.text.muted
              }
            >
              {roleLabel(code)}
            </AppText>
          </Pressable>
        ))}
      </View>
      {error ? (
        <Appear>
          <AppText color={tokens.color.feedback.error}>{error}</AppText>
        </Appear>
      ) : null}
      <Button
        label={t("manage.inviteMember")}
        variant="outline"
        loading={invite.isPending}
        disabled={phone.trim().length < 8}
        onPress={() => invite.mutate()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView grows vertically when the section below is short.
  sectionTabsScroll: { flexGrow: 0 },
  sectionTabs: { gap: tokens.spacing.xs, paddingVertical: tokens.spacing.xxs },
  sectionTab: {
    minHeight: tokens.layout.minTouchTarget,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    backgroundColor: tokens.color.surface.white,
    justifyContent: "center",
  },
  sectionTabOn: {
    backgroundColor: tokens.color.brand.primary,
    borderColor: tokens.color.brand.primary,
  },
  sectionTabLabel: { fontFamily: tokens.typography.family.semibold },
  section: { gap: tokens.spacing.md },
  hidden: { display: "none" },
  serviceSection: {
    borderTopWidth: 1,
    borderTopColor: tokens.color.border.default,
    paddingTop: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    flexWrap: "wrap",
  },
  chip: {
    minHeight: tokens.layout.minTouchTarget,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    justifyContent: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  grow: { flex: 1, minWidth: 120 },
});
