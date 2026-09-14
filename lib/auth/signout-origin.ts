import { getCanonicalAuthOrigin } from "@/lib/auth/canonical-origin";

function parseHeaderOrigin(value: string | null | undefined) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isTrustedSignOutOrigin(options: {
  authUrl?: string;
  nodeEnv?: string;
  originHeader?: string | null;
  refererHeader?: string | null;
  requestOrigin: string;
}) {
  const suppliedOrigin =
    parseHeaderOrigin(options.originHeader) ?? parseHeaderOrigin(options.refererHeader);
  if (!suppliedOrigin) return false;

  const canonicalOrigin = getCanonicalAuthOrigin(options.requestOrigin, options.authUrl, {
    nodeEnv: options.nodeEnv,
  });

  return suppliedOrigin === canonicalOrigin;
}
