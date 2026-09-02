import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  createProduct,
  fetchEstablishments,
  fetchProducts,
  setProductAvailability,
  updateProduct,
  changeProductPrice,
  uploadProductImage,
  type MerchantProduct,
} from '@/api/merchant';
import type { UploadAsset } from '@/api/client';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHero } from '@/components/page-hero';
import { Price } from '@/components/price';
import { Screen } from '@/components/screen';
import { SectionHeading } from '@/components/section-heading';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ImagePickerField } from '@/components/image-picker-field';
import { hapticLight, hapticSuccess } from '@/feedback/haptics';
import { t } from '@/i18n';
import { useMerchantStore } from '@/store/merchant-store';
import { tokens } from '@/theme';

const productSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(1000).optional(),
  basePriceAmount: z.string().regex(/^\d{1,15}$/),
});

type ProductValues = z.infer<typeof productSchema>;

export function CatalogScreen() {
  const queryClient = useQueryClient();
  const selectedId = useMerchantStore((state) => state.selectedEstablishmentId);
  const setSelectedId = useMerchantStore((state) => state.setSelectedEstablishmentId);

  const establishments = useQuery({
    queryKey: ['merchant', 'establishments'],
    queryFn: fetchEstablishments,
  });

  useEffect(() => {
    const first = establishments.data?.[0];
    if (!selectedId && first) {
      setSelectedId(first.id);
    }
  }, [establishments.data, selectedId, setSelectedId]);

  const products = useQuery({
    queryKey: ['merchant', 'products', selectedId],
    queryFn: () => fetchProducts(selectedId ?? ''),
    enabled: Boolean(selectedId),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MerchantProduct>();
  const [image, setImage] = useState<UploadAsset>();

  const form = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', description: '', basePriceAmount: '' },
  });

  const create = useMutation({
    mutationFn: async (values: ProductValues) => {
      const result = await createProduct({
        establishmentId: selectedId ?? '',
        name: values.name,
        description: values.description,
        basePriceAmount: values.basePriceAmount,
      });
      if (image) await uploadProductImage(result.productId, image);
    },
    onSuccess: () => {
      hapticSuccess();
      void queryClient.invalidateQueries({ queryKey: ['merchant', 'products', selectedId] });
      form.reset();
      setImage(undefined);
      setFormOpen(false);
    },
  });

  const saveEdit = useMutation({
    mutationFn: async (values: ProductValues) => {
      if (!editing) return;
      await updateProduct(editing.id, { name: values.name, description: values.description });
      if (values.basePriceAmount !== editing.price.amount) await changeProductPrice(editing.id, values.basePriceAmount);
      if (image) await uploadProductImage(editing.id, image);
    },
    onSuccess: () => {
      hapticSuccess();
      void queryClient.invalidateQueries({ queryKey: ['merchant', 'products', selectedId] });
      setEditing(undefined); setImage(undefined); setFormOpen(false); form.reset();
    },
  });

  function openEditor(product: MerchantProduct) {
    setEditing(product); setImage(undefined); setFormOpen(true);
    form.reset({ name: product.name, description: product.description ?? '', basePriceAmount: product.price.amount });
  }

  const availability = useMutation({
    mutationFn: (input: { productId: string; status: 'AVAILABLE' | 'OUT_OF_STOCK' }) =>
      setProductAvailability(input.productId, input.status),
    onSuccess: () => {
      hapticSuccess();
      void queryClient.invalidateQueries({ queryKey: ['merchant', 'products', selectedId] });
    },
  });

  const selected = establishments.data?.find((item) => item.id === selectedId);

  return (
    <Screen>
      <PageHero
        icon="restaurant-outline"
        kicker={t('app.name')}
        title={t('catalog.title')}
        subtitle={selected?.name ?? t('catalog.hero')}
      />

      {establishments.isLoading ? <Skeleton height={48} /> : null}
      {establishments.isError ? (
        <ErrorState onRetry={() => void establishments.refetch()} />
      ) : null}

      {establishments.data && establishments.data.length > 0 ? (
        <View style={styles.chips}>
          {establishments.data.map((establishment) => {
            const active = selectedId === establishment.id;
            return (
              <Pressable
                key={establishment.id}
                onPress={() => setSelectedId(establishment.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.chip, active ? styles.chipOn : null]}
              >
                <AppText color={active ? tokens.color.text.onBrand : tokens.color.text.primary}>
                  {establishment.name}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {!establishments.data?.length && establishments.isSuccess ? (
        <EmptyState title={t('empty.establishments')} detail={t('empty.establishmentsDetail')} />
      ) : null}

      {selectedId ? (
        <>
          <View style={styles.card}>
            <Button
              label={formOpen ? t('catalog.hideForm') : t('catalog.showForm')}
              variant={formOpen ? 'outline' : 'primary'}
              onPress={() => setFormOpen((open) => !open)}
            />
          </View>
          {formOpen ? (
            <View style={styles.card}>
              <SectionHeading title={editing ? t('catalog.editDish') : t('catalog.newDish')} />
              <ImagePickerField label={t('catalog.dishPhoto')} currentUrl={editing?.imageUrl} value={image} onChange={setImage} />
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <TextField
                    label={t('catalog.name')}
                    value={field.value}
                    onChangeText={field.onChange}
                    error={fieldState.error ? t('catalog.nameError') : undefined}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="description"
                render={({ field }) => (
                  <TextField
                    label={t('catalog.description')}
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="basePriceAmount"
                render={({ field, fieldState }) => (
                  <TextField
                    label={t('catalog.price')}
                    keyboardType="number-pad"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={fieldState.error ? t('catalog.priceError') : undefined}
                  />
                )}
              />
              {create.isError || saveEdit.isError ? (
                <AppText color={tokens.color.feedback.error}>
                  {create.error instanceof ApiError
                    ? create.error.problem.detail
                    : saveEdit.error instanceof ApiError
                      ? saveEdit.error.problem.detail
                      : t('errors.generic')}
                </AppText>
              ) : null}
              <Button
                label={editing ? t('common.save') : t('common.create')}
                loading={create.isPending || saveEdit.isPending}
                disabled={!selectedId}
                onPress={form.handleSubmit((values) => editing ? saveEdit.mutate(values) : create.mutate(values))}
              />
            </View>
          ) : null}

          <SectionHeading title={t('catalog.listTitle')} />
          {products.isLoading ? <Skeleton height={80} /> : null}
          {products.isError ? <ErrorState onRetry={() => void products.refetch()} /> : null}
          {products.data && products.data.length === 0 ? (
            <EmptyState title={t('empty.products')} detail={t('empty.productsDetail')} />
          ) : null}
          {products.data?.map((product) => {
            const available = product.availability === 'AVAILABLE';
            return (
              <View key={product.id} style={styles.card}>
                {product.imageUrl ? (
                  <Image
                    source={{ uri: product.imageUrl }}
                    contentFit="cover"
                    style={styles.productImage}
                    accessibilityLabel={product.name}
                  />
                ) : null}
                <View style={styles.productHead}>
                  <View style={styles.productBody}>
                    <AppText variant="subtitle">{product.name}</AppText>
                    <Price value={product.price} />
                  </View>
                  <View style={[styles.badge, available ? styles.badgeOn : styles.badgeOff]}>
                    <AppText
                      variant="caption"
                      color={available ? tokens.color.brand.primary : tokens.color.feedback.warning}
                    >
                      {available ? t('common.available') : t('common.unavailable')}
                    </AppText>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('catalog.toggleAvailability')}
                  disabled={availability.isPending}
                  onPress={() => {
                    hapticLight();
                    availability.mutate({
                      productId: product.id,
                      status: available ? 'OUT_OF_STOCK' : 'AVAILABLE',
                    });
                  }}
                  style={[styles.toggle, available ? styles.toggleOn : styles.toggleOff]}
                >
                  <AppText
                    variant="subtitle"
                    color={available ? tokens.color.brand.primary : tokens.color.feedback.warning}
                  >
                    {available ? t('common.available') : t('common.unavailable')}
                  </AppText>
                </Pressable>
                <Button label={t('catalog.editThisDish')} variant="outline" onPress={() => openEditor(product)} />
              </View>
            );
          })}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs },
  chip: {
    minHeight: tokens.layout.minTouchTarget,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    paddingHorizontal: tokens.spacing.md,
    justifyContent: 'center',
    backgroundColor: tokens.color.surface.white,
  },
  chipOn: {
    backgroundColor: tokens.color.brand.primary,
    borderColor: tokens.color.brand.primary,
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
  productImage: { width: '100%', height: 170, borderRadius: tokens.radius.card },
  productHead: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.spacing.sm },
  productBody: { flex: 1, gap: 2 },
  badge: {
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
  },
  badgeOn: { backgroundColor: tokens.color.surface.mint },
  badgeOff: { backgroundColor: tokens.color.brand.cream },
  toggle: {
    minHeight: 56,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  toggleOn: {
    backgroundColor: tokens.color.surface.mint,
    borderColor: tokens.color.brand.primary,
  },
  toggleOff: {
    backgroundColor: tokens.color.brand.cream,
    borderColor: tokens.color.feedback.warning,
  },
});
