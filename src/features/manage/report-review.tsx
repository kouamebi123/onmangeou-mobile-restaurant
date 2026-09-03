import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { View } from "react-native";
import { apiRequest } from "@/api/client";
import { ApiError } from "@/api/envelope";
import { useAuthStore } from "@/store/auth-store";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { tokens } from "@/theme";
import { t } from "@/i18n";
export function ReportReview({ id }: { id: string }) {
  const signedIn = useAuthStore((s) => Boolean(s.accessToken));
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const report = useMutation({
    mutationFn: () =>
      apiRequest(`/reviews/${id}/report`, {
        method: "POST",
        body: { reason, detail: detail.trim() || undefined },
      }),
  });
  if (!signedIn) return null;
  if (report.isSuccess)
    return (
      <AppText accessibilityLiveRegion="polite">
        {t("reviewReport.sent")}
      </AppText>
    );
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <Button
        variant="ghost"
        label={t("reviewReport.open")}
        onPress={() => setOpen(!open)}
        disabled={report.isPending}
      />
      {open ? (
        <>
          <AppText variant="caption">{t("reviewReport.hint")}</AppText>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: tokens.spacing.xs,
            }}
          >
            {["SPAM", "ABUSE", "PRIVACY", "MISLEADING", "OTHER"].map(
              (value) => (
                <Button
                  key={value}
                  label={t(`reviewReport.${value}`)}
                  variant={reason === value ? "primary" : "outline"}
                  disabled={report.isPending}
                  onPress={() => setReason(value)}
                />
              ),
            )}
          </View>
          <TextField
            label={t("reviewReport.detail")}
            value={detail}
            onChangeText={setDetail}
            multiline
            maxLength={1000}
            editable={!report.isPending}
          />
          <Button
            label={t("reviewReport.send")}
            loading={report.isPending}
            disabled={!reason}
            onPress={() => report.mutate()}
          />
        </>
      ) : null}
      {report.error ? (
        <AppText selectable color={tokens.color.feedback.error}>
          {report.error instanceof ApiError
            ? report.error.problem.detail
            : t("errors.generic")}
        </AppText>
      ) : null}
    </View>
  );
}
