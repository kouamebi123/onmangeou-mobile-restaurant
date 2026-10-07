import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, TextInput, View } from "react-native";

import { ApiError } from "@/api/envelope";
import { fetchHours, saveHours } from "@/api/merchant";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { ErrorState } from "@/components/error-state";
import { Appear, Expandable } from "@/components/motion";
import { Skeleton } from "@/components/skeleton";
import { WEEK_DAYS, type WeekDay } from "@/features/onboarding/restaurant-place";
import { hapticSuccess } from "@/feedback/haptics";
import { t } from "@/i18n";
import { tokens } from "@/theme";

import {
  addRange,
  copyToOpenDays,
  editorFromSlots,
  emptyWeekEditor,
  MAX_RANGES_PER_DAY,
  removeRange,
  setDayOpen,
  slotsFromEditor,
  updateRange,
  type HoursEditorError,
  type WeekEditor,
} from "./hours-editor";

function editorErrorMessage(error: HoursEditorError): string {
  if (error.code === "needDay") return t("manage.hoursNeedDay");
  const day = t(`weekdays.${error.weekDay}`);
  return t(error.code === "overlap" ? "manage.hoursOverlap" : "manage.hoursInvalid", { day });
}

export function HoursPanel({ establishmentId }: { establishmentId: string }) {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<WeekEditor>(emptyWeekEditor);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const hours = useQuery({
    queryKey: ["merchant", "hours", establishmentId],
    queryFn: () => fetchHours(establishmentId),
  });

  useEffect(() => {
    // Ne pas écraser une saisie en cours lorsqu'un rechargement en arrière-plan aboutit.
    if (hours.data && !dirty) {
      setEditor(editorFromSlots(hours.data));
    }
  }, [dirty, hours.data]);

  const change = (next: WeekEditor) => {
    setEditor(next);
    setDirty(true);
    setMessage(null);
    save.reset();
  };

  const save = useMutation({
    mutationFn: async () => {
      const result = slotsFromEditor(editor);
      if (!result.ok) {
        throw new Error(editorErrorMessage(result.error));
      }
      await saveHours(establishmentId, result.slots);
    },
    onSuccess: () => {
      hapticSuccess();
      setDirty(false);
      setMessage(t("manage.hoursSaved"));
      void queryClient.invalidateQueries({ queryKey: ["merchant", "hours"] });
    },
  });

  const firstOpenDay = WEEK_DAYS.find((weekDay) => editor[weekDay].length > 0);
  const openDays = WEEK_DAYS.filter((weekDay) => editor[weekDay].length > 0).length;
  const errorMessage = save.error
    ? save.error instanceof ApiError
      ? save.error.problem.detail
      : save.error.message
    : null;

  return (
    <View style={styles.card}>
      <AppText variant="subtitle">{t("manage.hours")}</AppText>
      <AppText variant="caption">{t("manage.hoursHint")}</AppText>

      {hours.isLoading ? <Skeleton height={220} /> : null}
      {hours.isError ? <ErrorState onRetry={() => void hours.refetch()} /> : null}

      {hours.data
        ? WEEK_DAYS.map((weekDay: WeekDay, dayIndex) => {
            const ranges = editor[weekDay];
            const open = ranges.length > 0;
            const dayLabel = t(`weekdays.${weekDay}`);
            return (
              <Appear key={weekDay} index={dayIndex}>
                <View style={styles.day}>
                  <View style={styles.dayHead}>
                    <AppText style={open ? styles.dayName : styles.dayNameOff}>
                      {dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}
                    </AppText>
                    {open ? null : (
                      <Appear>
                        <AppText variant="caption">{t("manage.hoursClosed")}</AppText>
                      </Appear>
                    )}
                    <Switch
                      accessibilityLabel={t("manage.hoursOpenDay", { day: dayLabel })}
                      value={open}
                      onValueChange={(value) => change(setDayOpen(editor, weekDay, value))}
                      trackColor={{ false: tokens.color.border.default, true: tokens.color.brand.primary }}
                      thumbColor={tokens.color.surface.white}
                    />
                  </View>
                  <Expandable open={open} gap={tokens.spacing.xs} style={styles.ranges}>
                    {/* Les plages glissent à l'ouverture de la journée. */}
                    {ranges.map((range, index) => (
                      <View key={index} style={styles.range}>
                        <TextInput
                          accessibilityLabel={`${t("manage.opensAt")} · ${dayLabel}`}
                          value={range.opensAt}
                          onChangeText={(value) => change(updateRange(editor, weekDay, index, { opensAt: value }))}
                          placeholder={t("manage.hoursPlaceholder")}
                          placeholderTextColor={tokens.color.text.muted}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                          style={styles.input}
                        />
                        <AppText variant="muted">–</AppText>
                        <TextInput
                          accessibilityLabel={`${t("manage.closesAt")} · ${dayLabel}`}
                          value={range.closesAt}
                          onChangeText={(value) => change(updateRange(editor, weekDay, index, { closesAt: value }))}
                          placeholder={t("manage.hoursPlaceholder")}
                          placeholderTextColor={tokens.color.text.muted}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                          style={styles.input}
                        />
                        {index > 0 ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("manage.hoursRemoveRange", { day: dayLabel })}
                            onPress={() => change(removeRange(editor, weekDay, index))}
                            style={styles.iconButton}
                          >
                            <Ionicons name="close" size={18} color={tokens.color.text.muted} />
                          </Pressable>
                        ) : ranges.length < MAX_RANGES_PER_DAY ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`${t("manage.hoursAddRange")} · ${dayLabel}`}
                            onPress={() => change(addRange(editor, weekDay))}
                            style={styles.iconButton}
                          >
                            <Ionicons name="add" size={20} color={tokens.color.brand.primary} />
                          </Pressable>
                        ) : (
                          <View style={styles.iconButton} />
                        )}
                      </View>
                    ))}
                  </Expandable>
                  {weekDay === firstOpenDay && openDays > 1 ? (
                    <Appear>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => change(copyToOpenDays(editor, weekDay))}
                        style={styles.link}
                      >
                        <AppText variant="caption" color={tokens.color.brand.primary} style={styles.linkLabel}>
                          {t("manage.hoursCopy")}
                        </AppText>
                      </Pressable>
                    </Appear>
                  ) : null}
                </View>
              </Appear>
            );
          })
        : null}

      {errorMessage ? (
        <Appear>
          <AppText color={tokens.color.feedback.error}>{errorMessage}</AppText>
        </Appear>
      ) : null}
      {message ? (
        <Appear key="saved">
          <AppText accessibilityLiveRegion="polite" color={tokens.color.feedback.success}>
            {message}
          </AppText>
        </Appear>
      ) : dirty ? (
        <Appear key="unsaved">
          <AppText variant="caption">{t("manage.hoursUnsaved")}</AppText>
        </Appear>
      ) : null}
      {hours.data ? (
        <Appear index={WEEK_DAYS.length}>
          <Button
            label={t("manage.saveHours")}
            variant={dirty ? "primary" : "outline"}
            loading={save.isPending}
            disabled={!dirty}
            onPress={() => save.mutate()}
          />
        </Appear>
      ) : null}
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
  day: {
    gap: tokens.spacing.xs,
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.color.border.default,
  },
  dayHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    minHeight: tokens.layout.minTouchTarget,
  },
  dayName: { flex: 1, fontFamily: tokens.typography.family.semibold, color: tokens.color.brand.deep },
  dayNameOff: { flex: 1, color: tokens.color.text.muted },
  ranges: { gap: tokens.spacing.xs },
  range: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm },
  input: {
    flex: 1,
    // Sur le web, un champ garde sinon sa largeur intrinsèque et pousse la ligne hors de l'écran.
    minWidth: 0,
    minHeight: tokens.layout.minTouchTarget,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    fontFamily: tokens.typography.family.regular,
    fontSize: tokens.typography.size.md,
    color: tokens.color.text.primary,
    backgroundColor: tokens.color.surface.white,
    textAlign: "center",
  },
  iconButton: {
    width: tokens.layout.minTouchTarget,
    height: tokens.layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  link: { minHeight: 32, justifyContent: "center" },
  linkLabel: { fontFamily: tokens.typography.family.semibold },
});
