import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isBackendApiConfigured } from "@/lib/api/config";
import {
  isSessionExpiredError,
  SESSION_EXPIRED_FORCE_SIGNOUT_URL,
} from "@/lib/auth/session-expired";
import {
  canAccessPath,
  defaultPathForRole,
} from "@/shared/config/auth/automation-roles";
import { routes } from "@/shared/config/routes";
import type { AuthUser } from "@/lib/api/types";

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;
  const session = req.auth;
  const isLogin = pathname === routes.login;
  const isForcedLogoutRequest =
    searchParams.get("error") === "session_expired" || searchParams.get("forceSignOut") === "api";
  const sessionError = session && "error" in session ? session.error : undefined;

  if (!isLogin && isSessionExpiredError(sessionError)) {
    return NextResponse.redirect(new URL(SESSION_EXPIRED_FORCE_SIGNOUT_URL, req.url));
  }

  if (isLogin) {
    if (session?.user?.role && !isForcedLogoutRequest) {
      return NextResponse.redirect(
        new URL(defaultPathForRole(session.user.role as AuthUser["role"]), req.url),
      );
    }
    return NextResponse.next();
  }

  if (!session?.user?.role) {
    const loginUrl = new URL(routes.login, req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Sessão com papel mas SEM accessToken do backend (ex.: cookie antigo de mock
  // auth, criado antes de o backend estar configurado). Entrar no painel nesse
  // estado faz toda chamada a /api/v1/* tomar 401. Quando o backend está
  // configurado, tratamos como sessão inválida e forçamos novo login (limpando
  // o cookie via /api/auth/force-api-signout na tela de login).
  if (isBackendApiConfigured() && !session.user.accessToken) {
    return NextResponse.redirect(new URL(SESSION_EXPIRED_FORCE_SIGNOUT_URL, req.url));
  }

  const role = session.user.role as AuthUser["role"];
  if (!canAccessPath(pathname, role)) {
    return NextResponse.redirect(new URL(defaultPathForRole(role), req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
