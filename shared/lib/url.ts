export function getSafeInternalHref(value?: string | null) {
  if (!value) return null;

  const normalized = value.trim();

  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return null;
  }

  return normalized;
}
