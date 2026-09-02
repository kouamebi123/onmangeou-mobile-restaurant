export function wallDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function reservationInstant(day: string, time: string, timeZone: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const target = Date.parse(`${day}T${time}:00Z`);
  if (!Number.isFinite(target)) return null;
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  let guess = target;
  for (let i = 0; i < 3; i += 1) {
    const parts = formatter.formatToParts(new Date(guess));
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    const represented = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:00Z`;
    if (represented === `${day}T${time}:00Z`) return new Date(guess);
    guess += target - Date.parse(represented);
  }
  return null;
}
