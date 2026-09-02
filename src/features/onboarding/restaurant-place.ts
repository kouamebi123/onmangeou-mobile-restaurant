import { z } from 'zod';
import type { UploadAsset } from '@/api/client';

import type { ModuleCatalog } from '@/api/merchant';
import { t } from '@/i18n';
import {
  MODULE_CODES,
  createEstablishment,
  replaceServices,
  saveHours,
  setMerchantModules,
  updateEstablishment,
  uploadEstablishmentCover,
} from '@/api/merchant';

export const WEEK_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

const timeSchema = z.string().regex(/^\d{1,2}:\d{2}$/, 'Horaire invalide');

export const restaurantPlaceFields = z.object({
  fullName: z.string().min(2).max(160),
  name: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  phone: z.string().min(8).max(24),
  city: z.string().min(2).max(120),
  district: z.string().min(2).max(120),
  addressLine: z.string().min(3).max(300),
  landmarkText: z.string().max(300).optional(),
  dineIn: z.boolean(),
  takeaway: z.boolean(),
  delivery: z.boolean(),
  reservation: z.boolean(),
  hasTerrace: z.boolean(),
  hasAirConditioning: z.boolean(),
  accessible: z.boolean(),
  opensAt: timeSchema,
  closesAt: timeSchema,
  weekDays: z.object({
    MONDAY: z.boolean(),
    TUESDAY: z.boolean(),
    WEDNESDAY: z.boolean(),
    THURSDAY: z.boolean(),
    FRIDAY: z.boolean(),
    SATURDAY: z.boolean(),
    SUNDAY: z.boolean(),
  }),
  modules: z.record(z.string(), z.boolean()),
  image: z.custom<UploadAsset>().optional(),
});

export const restaurantPlaceSchema = restaurantPlaceFields
  .refine((values) => Object.values(values.weekDays).some(Boolean), {
    message: 'Au moins un jour d’ouverture',
    path: ['weekDays'],
  })
  .refine((values) => values.dineIn || values.takeaway, {
    message: 'Choisissez au moins un mode de service',
    path: ['dineIn'],
  });

export type RestaurantPlaceValues = z.infer<typeof restaurantPlaceFields>;

export const EMPTY_RESTAURANT_PLACE: RestaurantPlaceValues = {
  fullName: '',
  name: '',
  description: '',
  phone: '',
  city: '',
  district: '',
  addressLine: '',
  landmarkText: '',
  dineIn: false,
  takeaway: false,
  delivery: false,
  reservation: false,
  hasTerrace: false,
  hasAirConditioning: false,
  accessible: false,
  opensAt: '',
  closesAt: '',
  weekDays: {
    MONDAY: false,
    TUESDAY: false,
    WEDNESDAY: false,
    THURSDAY: false,
    FRIDAY: false,
    SATURDAY: false,
    SUNDAY: false,
  },
  modules: {},
  image: undefined,
};

export function minutesToClock(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

const DISTRICT_COORDS: Array<{ match: string; latitude: number; longitude: number }> = [
  { match: 'angre', latitude: 5.39, longitude: -3.98 },
  { match: 'cocody', latitude: 5.348, longitude: -3.988 },
  { match: 'plateau', latitude: 5.32, longitude: -4.02 },
  { match: 'yopougon', latitude: 5.336, longitude: -4.074 },
  { match: 'marcory', latitude: 5.301, longitude: -3.993 },
  { match: 'treichville', latitude: 5.302, longitude: -4.013 },
  { match: 'adjame', latitude: 5.353, longitude: -4.026 },
  { match: 'abobo', latitude: 5.42, longitude: -4.02 },
  { match: 'koumassi', latitude: 5.297, longitude: -3.955 },
  { match: 'port-bouet', latitude: 5.256, longitude: -3.926 },
  { match: 'port bouet', latitude: 5.256, longitude: -3.926 },
  { match: 'attecoube', latitude: 5.333, longitude: -4.041 },
];

function normalizePlace(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function resolvePlaceCoords(city: string, district: string): { latitude: number; longitude: number } {
  const haystack = `${normalizePlace(district)} ${normalizePlace(city)}`;
  const found = DISTRICT_COORDS.find((entry) => haystack.includes(entry.match));
  return found ?? { latitude: 5.3599517, longitude: -4.0082563 };
}

export function parseClockMinutes(value: string): number {
  const [hoursText = '0', minutesText = '0'] = value.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  return hours * 60 + minutes;
}

export function quoteModules(catalog: ModuleCatalog | undefined, enabled: readonly string[]): string {
  if (!catalog) {
    return '—';
  }
  const selected = new Set(enabled);
  const total = catalog.modules.reduce((sum, item) => {
    if (!selected.has(item.code)) {
      return sum;
    }
    return sum + Number(item.monthlyPrice.amount);
  }, 0);
  return t('plan.perMonth', { price: `${new Intl.NumberFormat('fr-CI').format(total)}\u202fFCFA` });
}

export async function provisionEstablishment(values: RestaurantPlaceValues): Promise<{ establishmentId: string }> {
  const coords = resolvePlaceCoords(values.city, values.district);
  const created = await createEstablishment({
    name: values.name.trim(),
    description: values.description?.trim() || undefined,
    phone: values.phone.trim(),
    city: values.city.trim(),
    district: values.district.trim(),
    addressLine: values.addressLine.trim(),
    landmarkText: values.landmarkText?.trim() || undefined,
    latitude: coords.latitude,
    longitude: coords.longitude,
  });

  if (values.image) {
    await uploadEstablishmentCover(created.establishmentId, values.image);
  }

  await updateEstablishment(created.establishmentId, {
    hasTerrace: values.hasTerrace,
    hasAirConditioning: values.hasAirConditioning,
    accessible: values.accessible,
  });

  const delivery = Boolean(values.modules[MODULE_CODES.DELIVERY_INTERNAL]);
  const reservation = Boolean(values.modules[MODULE_CODES.RESERVATIONS_TABLES]);

  await replaceServices(created.establishmentId, [
    { type: 'DINE_IN', enabled: values.dineIn },
    { type: 'TAKEAWAY', enabled: values.takeaway },
    { type: 'DELIVERY', enabled: delivery },
    { type: 'RESERVATION', enabled: reservation },
  ]);

  const opensAtMinutes = parseClockMinutes(values.opensAt);
  let closesAtMinutes = parseClockMinutes(values.closesAt);
  if (closesAtMinutes <= opensAtMinutes) {
    closesAtMinutes += 1440;
  }

  await saveHours(
    created.establishmentId,
    WEEK_DAYS.filter((weekDay) => values.weekDays[weekDay]).map((weekDay) => ({
      weekDay,
      opensAtMinutes,
      closesAtMinutes,
    })),
  );

  await setMerchantModules(
    Object.entries(values.modules).map(([code, enabled]) => ({
      code,
      enabled: code === MODULE_CODES.STOREFRONT_BASIC ? true : enabled,
    })),
  );

  return { establishmentId: created.establishmentId };
}
