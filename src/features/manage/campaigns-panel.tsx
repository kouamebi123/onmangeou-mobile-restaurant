import { useRef, useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { createIdempotencyKey } from "@/api/device";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { t } from "@/i18n";
import { tokens } from "@/theme";
interface Campaign {
  id: string;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  impressions: string;
  clicks: string;
}
export function CampaignsPanel({
  establishmentId,
}: {
  establishmentId: string;
}) {
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const [days, setDays] = useState("7");
  const pending = useRef<{
    signature: string;
    key: string;
    body: object;
  } | null>(null);
  const list = useQuery({
    queryKey: ["merchant", "campaigns", establishmentId],
    queryFn: async () =>
      (
        await apiRequest<Campaign[]>("/merchant/ad-campaigns", {
          query: { establishmentId },
        })
      ).data,
  });
  const create = useMutation({
    mutationFn: async () => {
      const duration = Number(days);
      if (
        !Number.isInteger(duration) ||
        duration < 1 ||
        duration > 90 ||
        title.trim().length < 3
      )
        throw new Error(t("ads.validation"));
      const signature = JSON.stringify([
        establishmentId,
        title.trim(),
        duration,
      ]);
      if (pending.current?.signature !== signature)
        pending.current = {
          signature,
          key: createIdempotencyKey(),
          body: {
            establishmentId,
            title: title.trim(),
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + duration * 86400_000).toISOString(),
          },
        };
      await apiRequest("/merchant/ad-campaigns", {
        method: "POST",
        idempotent: true,
        idempotencyKey: pending.current.key,
        body: pending.current.body,
      });
    },
    onSuccess: () => {
      pending.current = null;
      setTitle("");
      void client.invalidateQueries({
        queryKey: ["merchant", "campaigns", establishmentId],
      });
    },
  });
  const pause = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/merchant/ad-campaigns/${id}/pause`, { method: "POST" }),
    onSuccess: () => {
      void list.refetch();
    },
  });
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <AppText variant="subtitle">{t("ads.title")}</AppText>
      <AppText variant="muted">{t("ads.hint")}</AppText>
      <TextField
        label={t("ads.headline")}
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        editable={!create.isPending}
      />
      <TextField
        label={t("ads.days")}
        value={days}
        onChangeText={setDays}
        keyboardType="number-pad"
        editable={!create.isPending}
      />
      <Button
        label={t("ads.submit")}
        loading={create.isPending}
        onPress={() => create.mutate()}
      />
      {create.isSuccess ? <AppText>{t("ads.submitted")}</AppText> : null}
      {create.error || pause.error || list.error ? (
        <AppText>
          {(create.error ?? pause.error ?? list.error)?.message}
        </AppText>
      ) : null}
      {list.data?.map((c) => (
        <View key={c.id} style={{ gap: tokens.spacing.xs }}>
          <AppText>
            {c.title} · {t(`ads.${c.status}`)}
          </AppText>
          <AppText variant="caption">
            {t("ads.metrics", { impressions: c.impressions, clicks: c.clicks })}
          </AppText>
          {c.status === "APPROVED" || c.status === "PENDING" ? (
            <Button
              label={t("ads.pause")}
              variant="outline"
              loading={pause.isPending}
              onPress={() => pause.mutate(c.id)}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}
