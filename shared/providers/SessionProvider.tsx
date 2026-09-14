"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { routes } from "@/shared/config/routes";
import { redirectToSessionExpiredLogin } from "./session-expiry-navigation";

function SessionExpiryRedirect() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const signOutStartedRef = useRef(false);

  useEffect(() => {
    if (status === "loading") return;
    if (pathname.startsWith(routes.login)) return;
    if (session?.error !== "RefreshAccessTokenError") return;
    if (signOutStartedRef.current) return;

    signOutStartedRef.current = true;
    void fetch("/api/auth/force-api-signout", {
      method: "POST",
      cache: "no-store",
      credentials: "include",
    }).finally(() => {
      router.refresh();
      redirectToSessionExpiredLogin();
    });
  }, [pathname, router, session?.error, status]);

  return null;
}

export function SessionProvider({
  children,
  session,
}: {
  children: ReactNode;
  session?: Session | null;
}) {
  return (
    <NextAuthSessionProvider session={session}>
      <SessionExpiryRedirect />
      {children}
    </NextAuthSessionProvider>
  );
}
