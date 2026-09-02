import { apiRequest, apiUpload, type UploadAsset } from '@/api/client';
import { createIdempotencyKey } from '@/api/device';
import type { MoneyView } from '@/api/types';

export const MODULE_CODES = {
  STOREFRONT_BASIC: 'storefront.basic',
  CATALOG_ADVANCED: 'catalog.advanced',
  ORDERS_MARKETPLACE: 'orders.marketplace',
  ORDERS_MANUAL: 'orders.manual',
  RESERVATIONS_TABLES: 'reservations.tables',
  PAYMENTS_ONLINE: 'payments.online',
  CASH_REGISTER: 'cash.register',
  FINANCE_EXPENSES: 'finance.expenses',
  FINANCE_CREDITS: 'finance.credits',
  INVENTORY_SIMPLE: 'inventory.simple',
  INVENTORY_INGREDIENTS: 'inventory.ingredients',
  DELIVERY_INTERNAL: 'delivery.internal',
  MARKETING_PROMOTIONS: 'marketing.promotions',
  ANALYTICS_ADVANCED: 'analytics.advanced',
  ORGANIZATION_MULTISITE: 'organization.multisite',
} as const;

export type ModuleCode = (typeof MODULE_CODES)[keyof typeof MODULE_CODES];

export interface Entitlements {
  organizationId: string;
  establishmentId: string | null;
  subscriptionStatus: string | null;
  planCode: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  enabledModules: string[];
  modules: Array<{ code: string; label: string; enabled: boolean; source: string }>;
  monthlyQuote?: MoneyView;
  catalog?: ModuleCatalog;
}

export interface ModuleCatalog {
  currency: string;
  published?: boolean;
  notice: string;
  modules: Array<{
    code: string;
    label: string;
    included: boolean;
    monthlyPrice: MoneyView;
  }>;
}

export interface Establishment {
  id: string;
  name: string;
  slug: string;
  status: string;
  description: string | null;
  phoneE164: string | null;
  city: string;
  district: string | null;
  addressLine: string | null;
  landmarkText: string | null;
  stockMode: string;
  averagePreparationMinutes: number | null;
  publishedAt: string | null;
  verifiedAt: string | null;
  hasTerrace?: boolean;
  hasAirConditioning?: boolean;
  accessible?: boolean;
  coverImageUrl: string | null;
}

export interface MerchantProduct {
  id: string;
  name: string;
  description: string | null;
  price: MoneyView;
  status: string;
  categoryId: string | null;
  availability: string;
  preparationMinutes: number | null;
  vegetarian: boolean;
  halal: boolean;
  spicyLevel: number | null;
  imageUrl: string | null;
}

export async function fetchModuleCatalog(): Promise<ModuleCatalog> {
  const envelope = await apiRequest<ModuleCatalog>('/merchant/module-catalog', { auth: false });
  return envelope.data;
}

export async function fetchEntitlements(establishmentId?: string): Promise<Entitlements> {
  const envelope = await apiRequest<Entitlements>('/merchant/entitlements', {
    query: { establishmentId },
  });
  return envelope.data;
}

export async function fetchEstablishments(): Promise<Establishment[]> {
  const envelope = await apiRequest<Establishment[]>('/merchant/establishments');
  return envelope.data;
}

export async function fetchProducts(establishmentId: string): Promise<MerchantProduct[]> {
  const envelope = await apiRequest<MerchantProduct[]>('/merchant/products', {
    query: { establishmentId },
  });
  return envelope.data;
}

export async function createProduct(input: {
  establishmentId: string;
  name: string;
  description?: string;
  basePriceAmount: string;
}): Promise<{ productId: string }> {
  const envelope = await apiRequest<{ productId: string }>('/merchant/products', {
    method: 'POST',
    idempotent: true,
    idempotencyKey: createIdempotencyKey(),
    body: input,
  });
  return envelope.data;
}

export async function updateProduct(productId: string, input: { name?: string; description?: string }): Promise<void> {
  await apiRequest(`/merchant/products/${productId}`, { method: 'PATCH', body: input });
}

export async function changeProductPrice(productId: string, newAmount: string): Promise<void> {
  await apiRequest(`/merchant/products/${productId}/price`, { method: 'PATCH', body: { newAmount } });
}

export async function uploadProductImage(productId: string, image: UploadAsset): Promise<{ url: string }> {
  return (await apiUpload<{ url: string }>(`/media/products/${productId}/image`, image)).data;
}

export async function uploadEstablishmentCover(establishmentId: string, image: UploadAsset): Promise<{ url: string }> {
  return (await apiUpload<{ url: string }>(`/media/establishments/${establishmentId}/cover`, image)).data;
}

export async function uploadAvatar(image: UploadAsset): Promise<{ url: string }> {
  return (await apiUpload<{ url: string }>('/media/avatar', image)).data;
}

export async function setProductAvailability(
  productId: string,
  status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'HIDDEN',
): Promise<{ applied: boolean; status: string }> {
  const envelope = await apiRequest<{ applied: boolean; status: string }>(
    `/merchant/products/${productId}/availability`,
    {
      method: 'PATCH',
      body: { status, clientChangedAt: new Date().toISOString() },
    },
  );
  return envelope.data;
}

export type MerchantOrderStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_RESTAURANT'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface MerchantOrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: MoneyView;
  linePrice: MoneyView;
}

export interface MerchantOrder {
  id: string;
  publicRef: string;
  establishmentId: string;
  establishmentName: string;
  establishmentSlug: string;
  status: MerchantOrderStatus;
  service: string;
  customerName: string;
  customerPhone: string;
  notes: string | null;
  items: MerchantOrderItem[];
  total: MoneyView;
  placedAt: string;
}

export async function fetchMerchantOrders(establishmentId?: string): Promise<MerchantOrder[]> {
  const envelope = await apiRequest<MerchantOrder[]>('/merchant/orders', {
    query: { establishmentId },
  });
  return envelope.data;
}

export async function changeMerchantOrderStatus(
  orderId: string,
  status: Exclude<MerchantOrderStatus, 'PENDING_PAYMENT' | 'PENDING_RESTAURANT' | 'CANCELLED'>,
): Promise<MerchantOrder> {
  const envelope = await apiRequest<MerchantOrder>(`/merchant/orders/${orderId}/status`, {
    method: 'POST',
    body: { status },
  });
  return envelope.data;
}

export async function setMerchantModules(modules: Array<{ code: string; enabled: boolean }>): Promise<Entitlements> {
  const envelope = await apiRequest<Entitlements>('/merchant/modules', {
    method: 'PUT',
    body: { modules },
  });
  return envelope.data;
}

export async function updateEstablishment(
  establishmentId: string,
  input: {
    name?: string;
    description?: string;
    phone?: string;
    city?: string;
    district?: string;
    addressLine?: string;
    landmarkText?: string;
    hasTerrace?: boolean;
    hasAirConditioning?: boolean;
    accessible?: boolean;
  },
): Promise<void> {
  await apiRequest(`/merchant/establishments/${establishmentId}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function createEstablishment(input: {
  name: string;
  city: string;
  phone?: string;
  latitude: number;
  longitude: number;
  district?: string;
  description?: string;
  addressLine?: string;
  landmarkText?: string;
}): Promise<{ establishmentId: string; slug: string }> {
  const envelope = await apiRequest<{ establishmentId: string; slug: string }>('/merchant/establishments', {
    method: 'POST',
    idempotent: true,
    idempotencyKey: createIdempotencyKey(),
    body: input,
  });
  return envelope.data;
}

export async function createOrganization(input: {
  name: string;
  contactPhone: string;
}): Promise<{ organizationId: string; slug: string }> {
  const envelope = await apiRequest<{ organizationId: string; slug: string }>('/merchant/organizations', {
    method: 'POST',
    idempotent: true,
    idempotencyKey: createIdempotencyKey(),
    body: input,
  });
  return envelope.data;
}

export async function fetchMerchantReservations(establishmentId?: string) {
  const envelope = await apiRequest<Array<{ id: string; public_ref: string; status: string; customer_name: string; customer_phone: string; party_size: number; starts_at: string; timezone?: string; table_name?: string | null; notes: string | null }>>(
    '/merchant/reservations',
    { query: { establishmentId } },
  );
  return envelope.data;
}

export async function changeReservationStatus(id: string, status: string) {
  await apiRequest(`/merchant/reservations/${id}/status`, { method: 'POST', body: { status } });
}

export async function fetchCashSession(establishmentId: string) {
  const envelope = await apiRequest<{
    id: string;
    status: string;
    expected: { formatted: string };
    openingAmount: { formatted: string };
    movements: Array<{ kind: string; label: string; amount: { formatted: string } }>;
  } | null>('/merchant/cash-sessions/current', { query: { establishmentId } });
  return envelope.data;
}

export async function openCashSession(establishmentId: string, openingAmount: string) {
  const envelope = await apiRequest('/merchant/cash-sessions', {
    method: 'POST',
    body: { establishmentId, openingAmount },
  });
  return envelope.data;
}

export async function addCashMovement(sessionId: string, kind: 'IN' | 'OUT', amount: string, label: string) {
  await apiRequest('/merchant/cash-movements', { method: 'POST', body: { sessionId, kind, amount, label } });
}

export async function closeCashSession(sessionId: string) {
  await apiRequest(`/merchant/cash-sessions/${sessionId}/close`, { method: 'POST' });
}

export async function createCredit(establishmentId: string, customerName: string, amount: string) {
  await apiRequest('/merchant/credits', { method: 'POST', body: { establishmentId, customerName, amount } });
}

export async function createDebt(establishmentId: string, supplierName: string, amount: string) {
  await apiRequest('/merchant/debts', { method: 'POST', body: { establishmentId, supplierName, amount } });
}

export async function fetchDeliveries(establishmentId: string) {
  const envelope = await apiRequest<Array<{ id: string; public_ref: string; status: string; customer_name: string; address_text: string | null; allowedActions: string[] }>>(
    '/merchant/deliveries',
    { query: { establishmentId } },
  );
  return envelope.data;
}

export async function changeDeliveryStatus(id: string, status: string) {
  await apiRequest(`/merchant/deliveries/${id}/status`, { method: 'POST', body: { status, courierName: 'Livreur interne' } });
}

export async function createManualOrder(input: {
  establishmentId: string;
  customerName: string;
  items: Array<{ productId: string; quantity: number }>;
  service?: 'TAKEAWAY' | 'DINE_IN';
}) {
  const envelope = await apiRequest('/merchant/orders', {
    method: 'POST',
    idempotent: true,
    idempotencyKey: createIdempotencyKey(),
    body: { ...input, paymentMethod: 'CASH' },
  });
  return envelope.data;
}

export async function createExpense(establishmentId: string, amount: string, label: string, category?: string) {
  await apiRequest('/merchant/expenses', { method: 'POST', body: { establishmentId, amount, label, category } });
}

export async function fetchExpenses(establishmentId: string) {
  const envelope = await apiRequest<Array<{ id: string; label: string; category: string; amount: { formatted: string } }>>(
    '/merchant/expenses',
    { query: { establishmentId } },
  );
  return envelope.data;
}

export async function fetchCredits(establishmentId: string) {
  const envelope = await apiRequest<Array<{ id: string; customerName: string; amount: { formatted: string } }>>(
    '/merchant/credits',
    { query: { establishmentId } },
  );
  return envelope.data;
}

export async function fetchDebts(establishmentId: string) {
  const envelope = await apiRequest<Array<{ id: string; supplierName: string; amount: { formatted: string } }>>(
    '/merchant/debts',
    { query: { establishmentId } },
  );
  return envelope.data;
}

export async function fetchDailyReport(establishmentId: string) {
  const envelope = await apiRequest<{ ordersCount: number; ordersTotal: { formatted: string }; expensesTotal: { formatted: string } }>(
    '/merchant/reports/daily',
    { query: { establishmentId } },
  );
  return envelope.data;
}

export async function fetchInventory(establishmentId: string) {
  const envelope = await apiRequest<Array<{ id: string; name: string; quantity: number; unit: string }>>('/merchant/inventory', {
    query: { establishmentId },
  });
  return envelope.data;
}

export async function createInventoryItem(establishmentId: string, name: string, quantity: number, unit?: string) {
  await apiRequest('/merchant/inventory', { method: 'POST', body: { establishmentId, name, quantity, unit } });
}

export async function moveStock(itemId: string, delta: number, reason: string) {
  await apiRequest(`/merchant/inventory/${itemId}/move`, { method: 'POST', body: { delta, reason } });
}

export async function createEvent(establishmentId: string, title: string, startsAt: string) {
  await apiRequest('/merchant/events', { method: 'POST', body: { establishmentId, title, startsAt } });
}

export async function fetchMerchantReviews(establishmentId: string) {
  const envelope = await apiRequest<Array<{ id: string; score: number; body: string | null; response: string | null }>>(`/restaurants/${establishmentId}/reviews`);
  return envelope.data;
}

export async function respondReview(id: string, body: string) {
  await apiRequest(`/merchant/reviews/${id}/response`, { method: 'POST', body: { body } });
}

export async function fetchHours(establishmentId: string) {
  const envelope = await apiRequest<Array<{ weekDay: string; opensAtMinutes: number; closesAtMinutes: number }>>(
    `/merchant/establishments/${establishmentId}/hours`,
  );
  return envelope.data;
}

export async function replaceServices(
  establishmentId: string,
  services: Array<{ type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'RESERVATION'; enabled: boolean }>,
) {
  await apiRequest(`/merchant/establishments/${establishmentId}/services`, {
    method: 'PUT',
    body: { services },
  });
}

export async function saveHours(
  establishmentId: string,
  slots: Array<{ weekDay: string; opensAtMinutes: number; closesAtMinutes: number }>,
) {
  await apiRequest(`/merchant/establishments/${establishmentId}/hours`, { method: 'PUT', body: { slots } });
}

export async function fetchTables(establishmentId: string) {
  const envelope = await apiRequest<Array<{ id: string; name: string; seats: number }>>('/merchant/tables', {
    query: { establishmentId },
  });
  return envelope.data;
}

export async function createTable(establishmentId: string, name: string, seats: number) {
  await apiRequest('/merchant/tables', { method: 'POST', body: { establishmentId, name, seats } });
}

export async function fetchCoupons(establishmentId: string) {
  const envelope = await apiRequest<Array<{ id: string; code: string; discount_bps: number }>>('/merchant/coupons', {
    query: { establishmentId },
  });
  return envelope.data;
}

export async function createCoupon(establishmentId: string, code: string, discountBps: number) {
  await apiRequest('/merchant/coupons', { method: 'POST', body: { establishmentId, code, discountBps } });
}

export async function submitVerification(establishmentId: string) {
  const envelope = await apiRequest<{ caseId: string; status: string }>(
    `/merchant/establishments/${establishmentId}/verification`,
    { method: 'POST', idempotent: true, idempotencyKey: createIdempotencyKey() },
  );
  return envelope.data;
}

export async function publishEstablishment(establishmentId: string) {
  await apiRequest(`/merchant/establishments/${establishmentId}/publish`, {
    method: 'POST',
    idempotent: true,
    idempotencyKey: createIdempotencyKey(),
  });
}

export async function fetchMembers() {
  const envelope = await apiRequest<
    Array<{ id: string; status: string; roleCode: string; displayName: string | null; phoneE164: string }>
  >('/merchant/members');
  return envelope.data;
}

export async function inviteMember(input: {
  phone: string;
  roleCode: string;
  displayName?: string;
  establishmentId?: string;
}) {
  const envelope = await apiRequest<{ memberId: string; status: string }>('/merchant/members', {
    method: 'POST',
    idempotent: true,
    idempotencyKey: createIdempotencyKey(),
    body: input,
  });
  return envelope.data;
}

export function hasModule(enabled: string[] | undefined, code: string): boolean {
  return Boolean(enabled?.includes(code));
}

export type MerchantTab = 'activity' | 'orders' | 'catalog' | 'manage' | 'more';

export function isMerchantTabEnabled(tab: MerchantTab, enabledModules: string[]): boolean {
  switch (tab) {
    case 'activity':
    case 'manage':
    case 'more':
      return true;
    case 'orders':
      return (
        enabledModules.includes(MODULE_CODES.ORDERS_MARKETPLACE) ||
        enabledModules.includes(MODULE_CODES.ORDERS_MANUAL)
      );
    case 'catalog':
      return (
        enabledModules.includes(MODULE_CODES.STOREFRONT_BASIC) ||
        enabledModules.includes(MODULE_CODES.CATALOG_ADVANCED)
      );
  }
}
