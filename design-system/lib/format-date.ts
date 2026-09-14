/**
 * Date formatting utilities
 * Shared across candidate and manager apps
 */

/**
 * Format a date string to Brazilian format (DD/MM/YYYY às HH:MM)
 */
export const formatDateBR = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} às ${hours}:${minutes}`;
};

/**
 * Format a date string to short Brazilian format (DD/MM/YYYY)
 */
export const formatDateBRShort = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Format a date-only value (e.g. "2026-07-01" or an ISO datetime) to the
 * Brazilian short format DD/MM/YYYY WITHOUT applying any timezone shift.
 *
 * `new Date("2026-07-01")` is parsed as UTC midnight, which renders as the
 * previous day in negative-offset zones (e.g. America/Sao_Paulo, UTC-3).
 * Parsing the calendar parts directly avoids that off-by-one. Returns an
 * empty string for nullish/malformed input.
 */
export const formatDateOnlyBR = (
  dateString: string | null | undefined,
): string => {
  if (!dateString) return "";
  const datePart = dateString.split("T")[0] ?? "";
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
};

/**
 * Calculate age based on the given birth date.
 *
 * @param birthDate - The birth date in the format 'YYYY-MM-DD'.
 * @returns The age in years.
 */
export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();

  const birthMonth = birth.getMonth();
  const currentMonth = today.getMonth();
  const birthDay = birth.getDate();
  const currentDay = today.getDate();

  if (
    currentMonth < birthMonth ||
    (currentMonth === birthMonth && currentDay < birthDay)
  ) {
    age--;
  }

  return age;
}

export function formatExperience(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years > 0 && remainingMonths > 0) {
    return `${years} ano${years > 1 ? "s" : ""} e ${remainingMonths} ${remainingMonths > 1 ? "meses" : "mês"}`;
  } else if (years > 0) {
    return `${years} ano${years > 1 ? "s" : ""}`;
  } else if (remainingMonths > 0) {
    return `${remainingMonths} ${remainingMonths > 1 ? "meses" : "mês"}`;
  } else {
    return "0 meses";
  }
}
