import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  addCashMovement,
  closeCashSession,
  createCredit,
  createDebt,
  createExpense,
  createInventoryItem,
  fetchCashSession,
  fetchCredits,
  fetchDailyReport,
  fetchDebts,
  fetchEntitlements,
  fetchExpenses,
  fetchInventory,
  hasModule,
  MODULE_CODES,
  moveStock,
  openCashSession,
} from '@/api/merchant';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { SectionHeading } from '@/components/section-heading';
import { TextField } from '@/components/text-field';
import { hapticSuccess } from '@/feedback/haptics';
import { t } from '@/i18n';
import { tokens } from '@/theme';

function digits(value: string): string {
  return value.replace(/\D/g, '');
}

export function FinancePanel({ establishmentId }: { establishmentId: string }) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['merchant'] });
  };

  const entitlements = useQuery({
    queryKey: ['merchant', 'entitlements'],
    queryFn: () => fetchEntitlements(),
  });
  const enabled = entitlements.data?.enabledModules ?? [];
  const ready = entitlements.isSuccess;
  const hasCash = hasModule(enabled, MODULE_CODES.CASH_REGISTER);
  const hasExpenses = hasModule(enabled, MODULE_CODES.FINANCE_EXPENSES);
  const hasCredits = hasModule(enabled, MODULE_CODES.FINANCE_CREDITS);
  const hasStock =
    hasModule(enabled, MODULE_CODES.INVENTORY_SIMPLE) ||
    hasModule(enabled, MODULE_CODES.INVENTORY_INGREDIENTS);
  const hasReport =
    hasCash ||
    hasExpenses ||
    hasModule(enabled, MODULE_CODES.ANALYTICS_ADVANCED) ||
    hasModule(enabled, MODULE_CODES.ORDERS_MARKETPLACE) ||
    hasModule(enabled, MODULE_CODES.ORDERS_MANUAL);

  const report = useQuery({
    queryKey: ['merchant', 'report', establishmentId],
    queryFn: () => fetchDailyReport(establishmentId),
    enabled: ready && hasReport,
  });
  const cash = useQuery({
    queryKey: ['merchant', 'cash', establishmentId],
    queryFn: () => fetchCashSession(establishmentId),
    enabled: ready && hasCash,
  });
  const expenses = useQuery({
    queryKey: ['merchant', 'expenses', establishmentId],
    queryFn: () => fetchExpenses(establishmentId),
    enabled: ready && hasExpenses,
  });
  const credits = useQuery({
    queryKey: ['merchant', 'credits', establishmentId],
    queryFn: () => fetchCredits(establishmentId),
    enabled: ready && hasCredits,
  });
  const debts = useQuery({
    queryKey: ['merchant', 'debts', establishmentId],
    queryFn: () => fetchDebts(establishmentId),
    enabled: ready && hasCredits,
  });
  const inventory = useQuery({
    queryKey: ['merchant', 'inventory', establishmentId],
    queryFn: () => fetchInventory(establishmentId),
    enabled: ready && hasStock,
  });

  if (!ready || (!hasReport && !hasCash && !hasExpenses && !hasCredits && !hasStock)) {
    return null;
  }

  return (
    <>
      {hasReport ? (
        <>
          <SectionHeading title={t('finance.today')} />
          <View style={styles.card}>
            <AppText variant="subtitle">{t('finance.dailyTitle')}</AppText>
            <AppText>
              {t('finance.ordersLine', {
                count: String(report.data?.ordersCount ?? 0),
                total: report.data?.ordersTotal.formatted ?? '—',
              })}
            </AppText>
            {hasExpenses ? (
              <AppText variant="muted">
                {t('finance.expensesLine', { total: report.data?.expensesTotal.formatted ?? '—' })}
              </AppText>
            ) : null}
          </View>
        </>
      ) : null}

      {hasCash ? (
        <CashCard establishmentId={establishmentId} session={cash.data ?? null} onDone={refresh} />
      ) : null}
      {hasExpenses ? (
        <LedgerCard
          title={t('finance.expenses')}
          hint={t('finance.expensesHint')}
          rows={expenses.data?.map((item) => `${item.label} · ${item.amount.formatted}`) ?? []}
          fields={[
            { key: 'label', label: t('finance.expenseLabel') },
            { key: 'category', label: t('finance.category') },
            { key: 'amount', label: t('finance.amount'), numeric: true },
          ]}
          submitLabel={t('finance.recordExpense')}
          onSubmit={async (values) => {
            await createExpense(
              establishmentId,
              digits(values.amount ?? ''),
              values.label?.trim() ?? '',
              values.category?.trim() || undefined,
            );
            refresh();
          }}
        />
      ) : null}
      {hasCredits ? (
        <LedgerCard
          title={t('finance.credits')}
          hint={t('finance.creditsHint')}
          rows={credits.data?.map((item) => `${item.customerName} · ${item.amount.formatted}`) ?? []}
          fields={[
            { key: 'name', label: t('finance.customer') },
            { key: 'amount', label: t('finance.amount'), numeric: true },
          ]}
          submitLabel={t('finance.recordCredit')}
          onSubmit={async (values) => {
            await createCredit(establishmentId, values.name?.trim() ?? '', digits(values.amount ?? ''));
            refresh();
          }}
        />
      ) : null}
      {hasCredits ? (
        <LedgerCard
          title={t('finance.debts')}
          hint={t('finance.debtsHint')}
          rows={debts.data?.map((item) => `${item.supplierName} · ${item.amount.formatted}`) ?? []}
          fields={[
            { key: 'name', label: t('finance.supplier') },
            { key: 'amount', label: t('finance.amount'), numeric: true },
          ]}
          submitLabel={t('finance.recordDebt')}
          onSubmit={async (values) => {
            await createDebt(establishmentId, values.name?.trim() ?? '', digits(values.amount ?? ''));
            refresh();
          }}
        />
      ) : null}
      {hasStock ? (
        <StockCard establishmentId={establishmentId} items={inventory.data ?? []} onDone={refresh} />
      ) : null}
    </>
  );
}

function CashCard({
  establishmentId,
  session,
  onDone,
}: {
  establishmentId: string;
  session: Awaited<ReturnType<typeof fetchCashSession>>;
  onDone: () => void;
}) {
  const [opening, setOpening] = useState('');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<'IN' | 'OUT'>('IN');
  const [confirmClose, setConfirmClose] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const run = async (action: () => Promise<unknown>) => {
    setError(undefined);
    try {
      await action();
      setOpening('');
      setAmount('');
      setLabel('');
      setConfirmClose(false);
      onDone();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.problem.detail : t('errors.generic'));
    }
  };

  return (
    <View style={styles.card}>
      <AppText variant="subtitle">{t('finance.cash')}</AppText>
      <AppText variant="muted">{t('finance.cashHint')}</AppText>
      {session ? (
        <>
          <AppText>
            {t('finance.cashOpen', { expected: session.expected.formatted, opening: session.openingAmount.formatted })}
          </AppText>
          {session.movements.map((movement, index) => (
            <AppText key={`${movement.label}-${index}`} variant="muted">
              {movement.kind === 'IN' ? '+' : '−'} {movement.amount.formatted} · {movement.label}
            </AppText>
          ))}
          <View style={styles.row}>
            {(['IN', 'OUT'] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => setKind(option)}
                style={[styles.chip, kind === option ? styles.chipOn : null]}
              >
                <AppText color={kind === option ? tokens.color.text.onBrand : tokens.color.text.primary}>
                  {option === 'IN' ? t('finance.cashIn') : t('finance.cashOut')}
                </AppText>
              </Pressable>
            ))}
          </View>
          <TextField
            label={t('finance.amount')}
            keyboardType="number-pad"
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
          />
          <TextField label={t('finance.movementLabel')} value={label} onChangeText={setLabel} />
          <Button
            label={t('finance.recordMovement')}
            disabled={digits(amount).length === 0 || label.trim().length < 2}
            onPress={() => run(() => addCashMovement(session.id, kind, digits(amount), label.trim()))}
          />
          {confirmClose ? (
            <Button
              label={t('finance.confirmClose', { expected: session.expected.formatted })}
              variant="destructive"
              onPress={() => run(() => closeCashSession(session.id))}
            />
          ) : (
            <Button label={t('finance.closeCash')} variant="outline" onPress={() => setConfirmClose(true)} />
          )}
        </>
      ) : (
        <>
          <TextField
            label={t('finance.openingAmount')}
            keyboardType="number-pad"
            value={opening}
            onChangeText={setOpening}
            placeholder="0"
          />
          <Button
            label={t('finance.openCash')}
            disabled={digits(opening).length === 0}
            onPress={() => run(() => openCashSession(establishmentId, digits(opening)))}
          />
        </>
      )}
      {error ? <AppText color={tokens.color.feedback.error}>{error}</AppText> : null}
    </View>
  );
}

function LedgerCard({
  title,
  hint,
  rows,
  fields,
  submitLabel,
  onSubmit,
}: {
  title: string;
  hint: string;
  rows: string[];
  fields: Array<{ key: string; label: string; numeric?: boolean }>;
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  return (
    <View style={styles.card}>
      <AppText variant="subtitle">{title}</AppText>
      <AppText variant="muted">{hint}</AppText>
      {rows.length === 0 ? <AppText variant="muted">{t('finance.emptyLedger')}</AppText> : null}
      {rows.slice(0, 6).map((row, index) => (
        <AppText key={`${index}-${row}`}>{row}</AppText>
      ))}
      {fields.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          keyboardType={field.numeric ? 'number-pad' : 'default'}
          value={values[field.key] ?? ''}
          onChangeText={(text) => setValues((current) => ({ ...current, [field.key]: text }))}
        />
      ))}
      {error ? <AppText color={tokens.color.feedback.error}>{error}</AppText> : null}
      <Button
        label={submitLabel}
        loading={busy}
        onPress={async () => {
          setBusy(true);
          setError(undefined);
          try {
            await onSubmit(values);
            setValues({});
          } catch (caught) {
            setError(caught instanceof ApiError ? caught.problem.detail : t('errors.generic'));
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}

function StockCard({
  establishmentId,
  items,
  onDone,
}: {
  establishmentId: string;
  items: Array<{ id: string; name: string; quantity: number; unit: string }>;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();

  const selected = items.find((item) => item.id === selectedId);
  const create = useMutation({
    mutationFn: () => createInventoryItem(establishmentId, name.trim(), Number(digits(quantity)), unit.trim() || 'u'),
    onSuccess: () => {
      hapticSuccess();
      setName('');
      setQuantity('');
      onDone();
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.problem.detail : t('errors.generic'));
    },
  });
  const move = useMutation({
    mutationFn: () => moveStock(selectedId ?? '', Number(delta.replace(/[^\d-]/g, '')), reason.trim()),
    onSuccess: () => {
      hapticSuccess();
      setDelta('');
      setReason('');
      onDone();
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.problem.detail : t('errors.generic'));
    },
  });

  return (
    <View style={styles.card}>
      <AppText variant="subtitle">{t('finance.stock')}</AppText>
      <AppText variant="muted">{t('finance.stockHint')}</AppText>
      {items.length === 0 ? <AppText variant="muted">{t('finance.emptyStock')}</AppText> : null}
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => setSelectedId(item.id)}
          style={[styles.stockRow, selectedId === item.id ? styles.chipOn : null]}
        >
          <AppText color={selectedId === item.id ? tokens.color.text.onBrand : tokens.color.text.primary}>
            {item.name} · {item.quantity} {item.unit}
          </AppText>
        </Pressable>
      ))}
      <AppText variant="caption">{t('finance.newArticle')}</AppText>
      <TextField label={t('finance.article')} value={name} onChangeText={setName} />
      <TextField
        label={t('finance.initialQty')}
        keyboardType="number-pad"
        value={quantity}
        onChangeText={setQuantity}
      />
      <TextField label={t('finance.unit')} value={unit} onChangeText={setUnit} />
      <Button
        label={t('finance.addArticle')}
        variant="outline"
        loading={create.isPending}
        disabled={name.trim().length < 2 || digits(quantity).length === 0}
        onPress={() => {
          setError(undefined);
          create.mutate();
        }}
      />
      {selected ? (
        <>
          <AppText variant="caption">{t('finance.moveStock', { name: selected.name })}</AppText>
          <TextField
            label={t('finance.delta')}
            keyboardType="numbers-and-punctuation"
            value={delta}
            onChangeText={setDelta}
            placeholder={t('finance.deltaHint')}
          />
          <TextField label={t('finance.reason')} value={reason} onChangeText={setReason} />
          <Button
            label={t('finance.recordMove')}
            loading={move.isPending}
            disabled={delta.trim().length === 0 || reason.trim().length < 2}
            onPress={() => {
              setError(undefined);
              move.mutate();
            }}
          />
        </>
      ) : null}
      {error ? <AppText color={tokens.color.feedback.error}>{error}</AppText> : null}
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs },
  chip: {
    minHeight: tokens.layout.minTouchTarget,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    paddingHorizontal: tokens.spacing.sm,
    justifyContent: 'center',
    backgroundColor: tokens.color.surface.white,
  },
  chipOn: { backgroundColor: tokens.color.brand.primary, borderColor: tokens.color.brand.primary },
  stockRow: {
    minHeight: tokens.layout.minTouchTarget,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border.default,
    paddingHorizontal: tokens.spacing.sm,
    justifyContent: 'center',
  },
});
