/**
 * String formatting utilities
 * Shared across candidate and manager apps
 */

/**
 * Format a numeric ID to a friendly 9-digit padded string
 */
export const formatFriendlyId = (
  id: number | string | null | undefined,
): string => {
  if (!id) return "";
  return String(id).padStart(9, "0");
};

/**
 * Convert a string to Capital Case (first letter of each word uppercase)
 */
export function toCapitalCase(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
