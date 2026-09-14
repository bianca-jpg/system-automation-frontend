function isLocalHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    normalized.startsWith("127.") ||
    normalized.endsWith(".local")
  );
}

function parseOrigin(value: string | undefined | null, options: { production?: boolean } = {}) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    if (options.production && url.protocol !== "https:") return null;
    if (options.production && isLocalHostname(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getCanonicalAuthOrigin(
  requestOrigin: string,
  authUrl: string | undefined = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL,
  options: { nodeEnv?: string } = {},
) {
  const production = (options.nodeEnv ?? process.env.NODE_ENV) === "production";
  const configuredOrigin = parseOrigin(authUrl, { production });
  if (configuredOrigin) return configuredOrigin;

  if (production) {
    throw new Error("AUTH_URL must be configured with a public HTTPS origin.");
  }

  return parseOrigin(requestOrigin) ?? requestOrigin;
}
