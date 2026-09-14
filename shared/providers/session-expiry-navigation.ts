import { SESSION_EXPIRED_LOGIN_URL } from "@/lib/auth/session-expired";

export function redirectToSessionExpiredLogin() {
  window.location.replace(SESSION_EXPIRED_LOGIN_URL);
}
