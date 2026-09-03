import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Picker from "expo-image-picker";
import { View } from "react-native";
import {
  apiRequest,
  apiUpload,
  getApiBaseUrl,
  type UploadAsset,
} from "@/api/client";
import { createRequestId } from "@/api/device";
import { ApiError } from "@/api/envelope";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { tokens } from "@/theme";
import { t } from "@/i18n";

export function ReviewPhotos({
  reviewId,
  photos = [],
  editable = false,
}: {
  reviewId: string;
  photos?: string[];
  editable?: boolean;
}) {
  const client = useQueryClient();
  const [selection, setSelection] = useState<UploadAsset>();
  const [pickerError, setPickerError] = useState("");
  const [picking, setPicking] = useState(false);
  const photoId = useRef("");
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["my-review"] }),
      client.invalidateQueries({ queryKey: ["reviews"] }),
    ]);
  };
  const upload = useMutation({
    mutationFn: async () => {
      if (selection)
        await apiUpload(
          `/reviews/${reviewId}/photos/${photoId.current}`,
          selection,
        );
    },
    onSuccess: async () => {
      setSelection(undefined);
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/reviews/${reviewId}/photos/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });
  const busy = upload.isPending || remove.isPending || picking;
  async function choose() {
    setPicking(true);
    setPickerError("");
    try {
      const result = await Picker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });
      const asset = result.canceled ? undefined : result.assets[0];
      if (asset) {
        photoId.current = createRequestId();
        setSelection({
          uri: asset.uri,
          name: asset.fileName ?? "review.jpg",
          mimeType: asset.mimeType ?? "image/jpeg",
        });
        upload.reset();
      }
    } catch {
      setPickerError(t("reviewPhotos.pickError"));
    } finally {
      setPicking(false);
    }
  }
  const error = upload.error ?? remove.error;
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: tokens.spacing.sm,
        }}
      >
        {photos.map((id) => (
          <View key={id} style={{ gap: tokens.spacing.xs }}>
            <Image
              source={{
                uri: `${getApiBaseUrl()}/reviews/${reviewId}/photos/${id}/file`,
              }}
              accessibilityLabel={t("reviewPhotos.alt")}
              style={{ width: 96, height: 96, borderRadius: tokens.radius.md }}
              contentFit="cover"
              cachePolicy="none"
            />
            {editable ? (
              <Button
                label={t("reviewPhotos.remove")}
                variant="ghost"
                disabled={busy}
                onPress={() => remove.mutate(id)}
              />
            ) : null}
          </View>
        ))}
      </View>
      {editable && photos.length < 3 ? (
        <>
          <AppText variant="caption">{t("reviewPhotos.hint")}</AppText>
          <Button
            label={t("reviewPhotos.choose")}
            variant="outline"
            disabled={busy}
            onPress={() => void choose()}
          />
          {selection ? (
            <>
              <Image
                source={{ uri: selection.uri }}
                style={{
                  width: 160,
                  height: 120,
                  borderRadius: tokens.radius.md,
                }}
              />
              <Button
                label={t("reviewPhotos.send")}
                loading={upload.isPending}
                disabled={remove.isPending || picking}
                onPress={() => upload.mutate()}
              />
              <Button
                label={t("common.cancel")}
                variant="ghost"
                disabled={busy}
                onPress={() => setSelection(undefined)}
              />
            </>
          ) : null}
        </>
      ) : null}
      {pickerError || error ? (
        <AppText selectable color={tokens.color.feedback.error}>
          {pickerError ||
            (error instanceof ApiError
              ? error.problem.detail
              : t("errors.generic"))}
        </AppText>
      ) : null}
    </View>
  );
}
