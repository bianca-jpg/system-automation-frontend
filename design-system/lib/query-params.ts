/**
 * URL query parameter utilities
 * Shared across candidate and manager apps
 */

/**
 * Build URLSearchParams from an object, filtering out null/undefined/empty values
 */
export function buildQueryParams(
  params?: Record<string, unknown>,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (!params) return searchParams;

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  return searchParams;
}
