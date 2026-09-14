function readFromProcessEnv(name: "AUTH_SECRET" | "NEXTAUTH_SECRET") {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function getAuthSecret() {
  const secret =
    readFromProcessEnv("AUTH_SECRET") ?? readFromProcessEnv("NEXTAUTH_SECRET");

  if (secret) return secret;

  if (process.env.NODE_ENV !== "production") {
    return "dev-only-system-automation-auth-secret";
  }

  return undefined;
}
