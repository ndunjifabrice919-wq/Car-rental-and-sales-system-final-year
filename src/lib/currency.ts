/**
 * Format a number as Cameroonian FCFA currency
 * Example: formatFCFA(25000) → "25 000 FCFA"
 */
export function formatFCFA(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return (
    new Intl.NumberFormat("fr-CM", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " FCFA"
  );
}

/**
 * Currency symbol for inline use
 */
export const CURRENCY = "FCFA";
export const CURRENCY_LOCALE = "fr-CM";
