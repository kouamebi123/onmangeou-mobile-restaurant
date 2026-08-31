import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { StyleSheet, View } from 'react-native';

import type { UploadAsset } from '@/api/client';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { tokens } from '@/theme';

export function ImagePickerField({ label, value, currentUrl, onChange }: {
  label: string;
  value?: UploadAsset;
  currentUrl?: string | null;
  onChange: (asset: UploadAsset | undefined) => void;
}) {
  const source = value?.uri ?? currentUrl;
  async function choose() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.82,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) onChange({ uri: asset.uri, name: asset.fileName ?? undefined, mimeType: asset.mimeType ?? undefined });
  }
  return (
    <View style={styles.wrap}>
      <AppText variant="subtitle">{label}</AppText>
      {source ? <Image source={{ uri: source }} contentFit="cover" style={styles.preview} /> : <View style={styles.empty}><AppText variant="muted">Aucune image</AppText></View>}
      <View style={styles.actions}>
        <Button label={source ? "Changer l’image" : 'Choisir une image'} variant="outline" onPress={() => void choose()} />
        {value ? <Button label="Annuler" variant="ghost" onPress={() => onChange(undefined)} /> : null}
      </View>
      <AppText variant="caption">JPEG, PNG ou WebP · 8 Mo maximum</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.xs },
  preview: { width: '100%', height: 190, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surface.mint },
  empty: { height: 120, borderRadius: tokens.radius.card, borderWidth: 1, borderStyle: 'dashed', borderColor: tokens.color.border.default, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs },
});
