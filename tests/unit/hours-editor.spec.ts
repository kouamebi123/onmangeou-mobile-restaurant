import { describe, expect, it } from 'vitest';
import {
  addRange,
  copyToOpenDays,
  editorFromSlots,
  parseClock,
  removeRange,
  setDayOpen,
  slotsFromEditor,
  updateRange,
} from '../../src/features/manage/hours-editor';

// Grille réelle du jeu de démonstration : semaine jusqu'à 23:00, week-end jusqu'à 02:00, dimanche fermé.
const tanteMarie = [
  { weekDay: 'MONDAY', opensAtMinutes: 660, closesAtMinutes: 1380 },
  { weekDay: 'TUESDAY', opensAtMinutes: 660, closesAtMinutes: 1380 },
  { weekDay: 'WEDNESDAY', opensAtMinutes: 660, closesAtMinutes: 1380 },
  { weekDay: 'THURSDAY', opensAtMinutes: 660, closesAtMinutes: 1380 },
  { weekDay: 'FRIDAY', opensAtMinutes: 660, closesAtMinutes: 1560 },
  { weekDay: 'SATURDAY', opensAtMinutes: 720, closesAtMinutes: 1560 },
];

describe('Opening hours editor', () => {
  it('saves back exactly what was loaded when nothing is edited', () => {
    const result = slotsFromEditor(editorFromSlots(tanteMarie));
    expect(result).toEqual({ ok: true, slots: tanteMarie });
  });

  it('keeps the late closing of other days when one day is edited', () => {
    const editor = updateRange(editorFromSlots(tanteMarie), 'MONDAY', 0, { opensAt: '10:00' });
    const result = slotsFromEditor(editor);
    expect(result.ok && result.slots.find((slot) => slot.weekDay === 'MONDAY')).toEqual({
      weekDay: 'MONDAY',
      opensAtMinutes: 600,
      closesAtMinutes: 1380,
    });
    expect(result.ok && result.slots.find((slot) => slot.weekDay === 'FRIDAY')?.closesAtMinutes).toBe(1560);
    expect(result.ok && result.slots.some((slot) => slot.weekDay === 'SUNDAY')).toBe(false);
  });

  it('opens a closed day with the hours of an open day and closes it again', () => {
    const opened = setDayOpen(editorFromSlots(tanteMarie), 'SUNDAY', true);
    expect(opened.SUNDAY).toEqual([{ opensAt: '11:00', closesAt: '23:00' }]);
    expect(setDayOpen(opened, 'SUNDAY', false).SUNDAY).toEqual([]);
    expect(setDayOpen(editorFromSlots([]), 'MONDAY', true).MONDAY).toEqual([{ opensAt: '11:00', closesAt: '23:00' }]);
  });

  it('supports two services in a day and orders them', () => {
    let editor = editorFromSlots([{ weekDay: 'TUESDAY', opensAtMinutes: 1140, closesAtMinutes: 1380 }]);
    editor = updateRange(addRange(editor, 'TUESDAY'), 'TUESDAY', 1, { opensAt: '11h30', closesAt: '14:30' });
    expect(slotsFromEditor(editor)).toEqual({
      ok: true,
      slots: [
        { weekDay: 'TUESDAY', opensAtMinutes: 690, closesAtMinutes: 870 },
        { weekDay: 'TUESDAY', opensAtMinutes: 1140, closesAtMinutes: 1380 },
      ],
    });
    expect(addRange(editor, 'TUESDAY').TUESDAY).toHaveLength(2);
    expect(removeRange(editor, 'TUESDAY', 1).TUESDAY).toEqual([{ opensAt: '19:00', closesAt: '23:00' }]);
  });

  it('reads a closing before the opening as the next day', () => {
    const editor = updateRange(setDayOpen(editorFromSlots([]), 'FRIDAY', true), 'FRIDAY', 0, {
      opensAt: '18:00',
      closesAt: '2:00',
    });
    expect(slotsFromEditor(editor)).toEqual({
      ok: true,
      slots: [{ weekDay: 'FRIDAY', opensAtMinutes: 1080, closesAtMinutes: 1560 }],
    });
  });

  it('refuses an unreadable time, overlapping services and an empty week', () => {
    const base = setDayOpen(editorFromSlots([]), 'MONDAY', true);
    expect(slotsFromEditor(updateRange(base, 'MONDAY', 0, { closesAt: '25:00' }))).toEqual({
      ok: false,
      error: { code: 'invalidTime', weekDay: 'MONDAY' },
    });
    expect(slotsFromEditor(updateRange(base, 'MONDAY', 0, { opensAt: 'midi' }))).toMatchObject({ ok: false });
    const overlapping = updateRange(addRange(base, 'MONDAY'), 'MONDAY', 1, { opensAt: '22:00', closesAt: '23:30' });
    expect(slotsFromEditor(overlapping)).toEqual({ ok: false, error: { code: 'overlap', weekDay: 'MONDAY' } });
    expect(slotsFromEditor(editorFromSlots([]))).toEqual({ ok: false, error: { code: 'needDay' } });
  });

  it('copies a day onto the other open days without reopening closed ones', () => {
    const editor = copyToOpenDays(editorFromSlots(tanteMarie), 'FRIDAY');
    expect(editor.MONDAY).toEqual([{ opensAt: '11:00', closesAt: '02:00' }]);
    expect(editor.SATURDAY).toEqual([{ opensAt: '11:00', closesAt: '02:00' }]);
    expect(editor.SUNDAY).toEqual([]);
  });

  it('parses clock values strictly', () => {
    expect(parseClock('9:05')).toBe(545);
    expect(parseClock(' 23h59 ')).toBe(1439);
    expect(parseClock('24:00')).toBeNull();
    expect(parseClock('12')).toBeNull();
    expect(parseClock('12:5')).toBeNull();
  });
});
