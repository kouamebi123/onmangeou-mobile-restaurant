const NARROW_NO_BREAK_SPACE = '\u202F';
const CURRENCY_LABEL = 'FCFA';

/**
 * Formatage d'affichage uniquement. Les totaux faisant autorite viennent de l'API.
 */
export function formatFcfa(amount: string): string {
  const negative = amount.startsWith('-');
  const digits = amount.replace(/\D/g, '');
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NO_BREAK_SPACE);
  const sign = negative ? '-' : '';
  return `${sign}${grouped}${NARROW_NO_BREAK_SPACE}${CURRENCY_LABEL}`;
}
