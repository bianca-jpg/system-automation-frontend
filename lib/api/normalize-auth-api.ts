import type {
  AuthApiResponse,
  AuthenticatedAuthApiResponse,
  NormalizedAuthSession,
  AuthUserApiResponse,
} from "@/lib/api/types/auth";

function isTokenBlock(v: unknown): v is AuthenticatedAuthApiResponse["token"] {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.access_token === "string" &&
    (o.refresh_token === undefined ||
      o.refresh_token === null ||
      typeof o.refresh_token === "string") &&
    typeof o.expires_in === "number"
  );
}

function isAuthUserApiResponse(v: unknown): v is AuthUserApiResponse {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "number";
}

function isChallenge(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.challenge_name === "string" &&
    typeof o.session === "string" &&
    typeof o.email === "string"
  );
}

export function isAuthApiResponse(v: unknown): v is AuthApiResponse {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    isAuthUserApiResponse(o.user) &&
    ((isTokenBlock(o.token) && (o.challenge === null || o.challenge === undefined)) ||
      ((o.token === null || o.token === undefined) && isChallenge(o.challenge)))
  );
}

export function hasAuthenticatedToken(auth: AuthApiResponse): auth is AuthenticatedAuthApiResponse {
  return isTokenBlock(auth.token);
}

export function normalizeAuthApiResponse(auth: AuthenticatedAuthApiResponse): NormalizedAuthSession {
  const t = auth.token;
  const u = auth.user;
  const roles = u.roles?.length ? u.roles : (u.groups ?? []);
  const displayName = u.display_name?.trim();
  const email = u.email?.trim() ?? "";
  const name =
    displayName && displayName.length > 0 ? displayName : email.length > 0 ? email : "Usuário";

  return {
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? undefined,
    expires_in: t.expires_in,
    user: {
      id: String(u.id),
      name,
      email,
      roles,
      roleTitle: u.role_title?.trim() || undefined,
      // O Entra ID não manda foto no ID token (não existe claim de imagem), e
      // o backend ainda não busca a do Graph. Até lá o avatar cai nas iniciais
      // do nome — mesmo fallback que o Teams usa para quem não tem foto.
      image: undefined,
    },
  };
}
