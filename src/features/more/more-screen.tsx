import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { fetchMe, logout, updateMe } from '@/api/auth';
import { fetchEntitlements } from '@/api/merchant';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { PageHero } from '@/components/page-hero';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { t } from '@/i18n';
import { useAuthStore } from '@/store/auth-store';
import { tokens } from '@/theme';
import { Image } from 'expo-image';
import { ImagePickerField } from '@/components/image-picker-field';
import type { UploadAsset } from '@/api/client';
import { uploadAvatar } from '@/api/merchant';

export function MoreScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clear = useAuthStore((state) => state.clear);
  const me = useQuery({ queryKey: ['me'], queryFn: fetchMe });
  const entitlements = useQuery({ queryKey: ['merchant', 'entitlements'], queryFn: () => fetchEntitlements() });
  const [fullName, setFullName] = useState('');
  const [avatar, setAvatar] = useState<UploadAsset>();

  useEffect(() => {
    if (me.data?.fullName) {
      setFullName(me.data.fullName);
    }
  }, [me.data?.fullName]);

  const displayName = me.data?.fullName?.trim() || t('more.title');
  const phone = me.data?.phoneE164 ?? '—';
  const initial = (me.data?.fullName?.trim() || phone.replace(/\D/g, '').slice(-1) || 'R').slice(0, 1).toUpperCase();
  const activeCount = entitlements.data?.enabledModules.length ?? 0;

  const saveProfile = useMutation({
    mutationFn: async () => {
      await updateMe({ fullName: fullName.trim() });
      if (avatar) await uploadAvatar(avatar);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  return (
    <Screen>
      <PageHero
        icon="person"
        hideIcon
        kicker={t('app.name')}
        title={displayName}
        subtitle={phone === '—' ? t('more.hero') : phone}
      >
        <View style={styles.avatar}>
          {me.data?.avatarUrl ? <Image source={{ uri: me.data.avatarUrl }} contentFit="cover" style={styles.avatarImage} /> : <AppText color={tokens.color.brand.deep} style={styles.avatarLetter}>{initial}</AppText>}
        </View>
      </PageHero>

      <View style={styles.card}>
        <InfoLine icon="call-outline" label={t('more.phone')} value={phone} />
        <View style={styles.divider} />
        <TextField label={t('more.editProfile')} value={fullName} onChangeText={setFullName} />
        <ImagePickerField label={t('more.profilePhoto')} currentUrl={me.data?.avatarUrl} value={avatar} onChange={setAvatar} />
        {saveProfile.isError ? (
          <AppText color={tokens.color.feedback.error}>
            {saveProfile.error instanceof ApiError ? saveProfile.error.problem.detail : t('errors.generic')}
          </AppText>
        ) : null}
        <Button
          label={t('more.saveProfile')}
          variant="outline"
          loading={saveProfile.isPending}
          onPress={() => saveProfile.mutate()}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('more.editPlan')}
        onPress={() => router.push('/(merchant)/plan')}
        style={styles.plan}
      >
        <View style={styles.mark}>
          <Ionicons name="diamond-outline" size={18} color={tokens.color.brand.accent} />
        </View>
        <View style={styles.planBody}>
          <AppText variant="caption" color={tokens.color.brand.accent}>
            {entitlements.data?.planCode ?? t('plan.custom')}
          </AppText>
          <AppText variant="subtitle" color={tokens.color.text.onBrand}>
            {t('more.editPlan')}
          </AppText>
          <AppText variant="muted" color={tokens.color.surface.mint}>
            {entitlements.data?.monthlyQuote
              ? `${entitlements.data.monthlyQuote.formatted} / mois · ${t('more.planDetail', { count: String(activeCount) })}`
              : t('more.planDetail', { count: String(activeCount) })}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={tokens.color.surface.mint} />
      </Pressable>

      <Button
        label={t('common.signOut')}
        variant="outline"
        onPress={async () => {
          try {
            await logout();
          } finally {
            await clear();
            router.replace('/');
          }
        }}
      />
    </Screen>
  );
}

function InfoLine({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.info}>
      <View style={styles.mark}>
        <Ionicons name={icon} size={16} color={tokens.color.brand.primary} />
      </View>
      <View style={styles.infoBody}>
        <AppText variant="caption">{label}</AppText>
        <AppText>{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.color.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.xxs,
  },
  avatarLetter: { fontFamily: tokens.typography.family.bold, fontSize: 22 },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  card: {
    backgroundColor: tokens.color.surface.white,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    shadowColor: tokens.color.brand.deep,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    backgroundColor: tokens.color.brand.deep,
    borderRadius: tokens.radius.card,
  },
  planBody: { flex: 1, gap: 2 },
  info: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  infoBody: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: tokens.color.border.default },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.color.surface.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
