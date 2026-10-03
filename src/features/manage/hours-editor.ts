import type { WeekDay } from "@/features/onboarding/restaurant-place";

// Logique pure : aucune dépendance à React Native, pour rester testable seule.
const WEEK_DAYS: readonly WeekDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function minutesToClock(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

/** Une plage de service saisie par le restaurateur, au format HH:MM. */
export interface HoursRange {
  opensAt: string;
  closesAt: string;
}

/** Une liste vide signifie « fermé ce jour-là ». */
export type WeekEditor = Record<WeekDay, HoursRange[]>;

export interface HoursSlot {
  weekDay: string;
  opensAtMinutes: number;
  closesAtMinutes: number;
}

export const MAX_RANGES_PER_DAY = 2;
export const DEFAULT_RANGE: HoursRange = { opensAt: "11:00", closesAt: "23:00" };

export type HoursEditorError =
  | { code: "needDay" }
  | { code: "invalidTime"; weekDay: WeekDay }
  | { code: "overlap"; weekDay: WeekDay };

export function emptyWeekEditor(): WeekEditor {
  return {
    MONDAY: [],
    TUESDAY: [],
    WEDNESDAY: [],
    THURSDAY: [],
    FRIDAY: [],
    SATURDAY: [],
    SUNDAY: [],
  };
}

function isWeekDay(value: string): value is WeekDay {
  return (WEEK_DAYS as readonly string[]).includes(value);
}

/**
 * Chaque jour garde ses propres plages : un restaurant ouvert jusqu'à 02:00 le
 * vendredi et fermé le dimanche ne doit pas se retrouver avec la même plage
 * recopiée sur toute la semaine.
 */
export function editorFromSlots(slots: readonly HoursSlot[]): WeekEditor {
  const editor = emptyWeekEditor();
  const ordered = [...slots].sort((left, right) => left.opensAtMinutes - right.opensAtMinutes);
  for (const slot of ordered) {
    if (!isWeekDay(slot.weekDay)) continue;
    editor[slot.weekDay].push({
      opensAt: minutesToClock(slot.opensAtMinutes),
      closesAt: minutesToClock(slot.closesAtMinutes),
    });
  }
  return editor;
}

/** Accepte « 9:30 », « 09:30 » et « 9h30 » ; refuse tout le reste. */
export function parseClock(value: string): number | null {
  const match = /^(\d{1,2})\s*[:hH]\s*(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function slotsFromEditor(
  editor: WeekEditor,
): { ok: true; slots: HoursSlot[] } | { ok: false; error: HoursEditorError } {
  const slots: HoursSlot[] = [];

  for (const weekDay of WEEK_DAYS) {
    const day: HoursSlot[] = [];
    for (const range of editor[weekDay]) {
      const opensAtMinutes = parseClock(range.opensAt);
      const closing = parseClock(range.closesAt);
      if (opensAtMinutes === null || closing === null) {
        return { ok: false, error: { code: "invalidTime", weekDay } };
      }
      // Une fermeture avant l'ouverture désigne le lendemain : 18:00 – 02:00.
      const closesAtMinutes = closing <= opensAtMinutes ? closing + 1440 : closing;
      day.push({ weekDay, opensAtMinutes, closesAtMinutes });
    }
    day.sort((left, right) => left.opensAtMinutes - right.opensAtMinutes);
    for (let index = 1; index < day.length; index += 1) {
      const previous = day[index - 1];
      const current = day[index];
      if (previous && current && current.opensAtMinutes < previous.closesAtMinutes) {
        return { ok: false, error: { code: "overlap", weekDay } };
      }
    }
    slots.push(...day);
  }

  if (slots.length === 0) {
    return { ok: false, error: { code: "needDay" } };
  }
  return { ok: true, slots };
}

export function setDayOpen(editor: WeekEditor, weekDay: WeekDay, open: boolean): WeekEditor {
  if (!open) return { ...editor, [weekDay]: [] };
  if (editor[weekDay].length > 0) return editor;
  // Un jour qu'on rouvre reprend la plage d'un jour déjà ouvert, plus proche de la réalité.
  const template = WEEK_DAYS.map((day) => editor[day][0]).find((range) => range !== undefined);
  return { ...editor, [weekDay]: [{ ...(template ?? DEFAULT_RANGE) }] };
}

export function updateRange(
  editor: WeekEditor,
  weekDay: WeekDay,
  index: number,
  patch: Partial<HoursRange>,
): WeekEditor {
  return {
    ...editor,
    [weekDay]: editor[weekDay].map((range, position) => (position === index ? { ...range, ...patch } : range)),
  };
}

export function addRange(editor: WeekEditor, weekDay: WeekDay): WeekEditor {
  if (editor[weekDay].length === 0 || editor[weekDay].length >= MAX_RANGES_PER_DAY) return editor;
  return { ...editor, [weekDay]: [...editor[weekDay], { opensAt: "", closesAt: "" }] };
}

export function removeRange(editor: WeekEditor, weekDay: WeekDay, index: number): WeekEditor {
  return { ...editor, [weekDay]: editor[weekDay].filter((_, position) => position !== index) };
}

/** Recopie les plages d'un jour sur les autres jours ouverts, sans rouvrir les jours fermés. */
export function copyToOpenDays(editor: WeekEditor, source: WeekDay): WeekEditor {
  const next = { ...editor };
  for (const weekDay of WEEK_DAYS) {
    if (weekDay !== source && editor[weekDay].length > 0) {
      next[weekDay] = editor[source].map((range) => ({ ...range }));
    }
  }
  return next;
}
