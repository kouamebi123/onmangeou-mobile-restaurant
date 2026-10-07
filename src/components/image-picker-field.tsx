import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { StyleSheet, View } from 'react-native';
import { useState } from 'react';

import type { UploadAsset } from '@/api/client';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Appear } from '@/components/motion';
import { t } from '@/i18n';
import { tokens } from '@/theme';
import { motion } from '@/theme/motion';

export function ImagePickerField({ label, value, currentUrl, onChange, shape = 'wide', fadeMs = motion.imageMs }: {
  label: string;
  /** `avatar` : aperçu rond et compact, pour une photo de profil. */
  shape?: 'wide' | 'avatar';
  /** Fondu de l'aperçu. À 0 dans une section repliable : elle remonte son contenu en fin d'ouverture, le fondu serait rejoué. */
  fadeMs?: number;
  value?: UploadAsset;
  currentUrl?: string | null;
  onChange: (asset: UploadAsset | undefined) => void;
}) {
  const source = value?.uri ?? currentUrl;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function choose() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError(t('imagePicker.denied')); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: shape === 'avatar' ? [1, 1] : [4, 3], quality: 0.82,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) onChange({ uri: asset.uri, name: asset.fileName ?? undefined, mimeType: asset.mimeType ?? undefined });
    } catch {
      setError(t('imagePicker.failed'));
    } finally {
      setBusy(false);
    }
  }
  const actions = (
    <View style={styles.actions}>
      <Button label={source ? t('imagePicker.change') : t('imagePicker.choose')} variant="outline" loading={busy} onPress={() => void choose()} />
      {value ? <Appear><Button label={t('common.cancel')} variant="ghost" onPress={() => onChange(undefined)} /></Appear> : null}
    </View>
  );
  if (shape === 'avatar') {
    return (
      <View style={styles.wrap}>
        <AppText variant="caption">{label}</AppText>
        <View style={styles.avatarRow}>
          {source ? (
            <Image source={{ uri: source }} contentFit="cover" transition={fadeMs} style={styles.avatar} accessibilityLabel={label} />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Ionicons name="person-outline" size={26} color={tokens.color.brand.primary} />
            </View>
          )}
          <View style={styles.avatarBody}>
            {actions}
            <AppText variant="caption">{t('imagePicker.hint')}</AppText>
          </View>
        </View>
        {error ? <Appear><AppText accessibilityLiveRegion="polite" color={tokens.color.feedback.error}>{error}</AppText></Appear> : null}
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <AppText variant="subtitle">{label}</AppText>
      {source ? (
        <Image source={{ uri: source }} contentFit="cover" transition={fadeMs} style={styles.preview} accessibilityLabel={label} />
      ) : (
        <View style={styles.empty}><AppText variant="muted">{t('imagePicker.empty')}</AppText></View>
      )}
      {actions}
      {error ? <Appear><AppText accessibilityLiveRegion="polite" color={tokens.color.feedback.error}>{error}</AppText></Appear> : null}
      <AppText variant="caption">{t('imagePicker.hint')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.xs },
  preview: { width: '100%', height: 190, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surface.mint },
  empty: { height: 120, borderRadius: tokens.radius.card, borderWidth: 1, borderStyle: 'dashed', borderColor: tokens.color.border.default, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: tokens.color.surface.mint },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  avatarBody: { flex: 1, gap: tokens.spacing.xs },
});
