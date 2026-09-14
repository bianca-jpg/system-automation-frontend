/**
 * Shared pt-BR number formatters
 *
 * Centralizes numeric formatting so analytics dashboards render consistent
 * pt-BR numbers (e.g. 1.234) instead of mixing locales across tabs.
 */

const PT_BR_NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR");

const PT_BR_COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

function safeNumber(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return value;
}

/**
 * Format an integer count using the pt-BR locale (e.g. 1234 -> "1.234").
 */
export function formatNumberPtBR(value: number | null | undefined): string {
  return PT_BR_NUMBER_FORMATTER.format(Math.round(safeNumber(value)));
}

/**
 * Format a number in compact pt-BR notation (e.g. 12345 -> "12,3 mil").
 */
export function formatCompactNumberPtBR(
  value: number | null | undefined,
): string {
  return PT_BR_COMPACT_NUMBER_FORMATTER.format(safeNumber(value));
}
