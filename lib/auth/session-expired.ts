import { routes } from "@/shared/config/routes";

export const SESSION_EXPIRED_LOGIN_URL = `${routes.login}?error=session_expired`;
export const SESSION_EXPIRED_FORCE_SIGNOUT_URL =
  `${routes.login}?error=session_expired&forceSignOut=api`;

export function isSessionExpiredError(error: unknown): boolean {
  return error === "RefreshAccessTokenError";
}
