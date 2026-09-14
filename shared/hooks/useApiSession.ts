"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { setAuthToken, setOnUnauthorized } from "@/lib/api/http-client";
import { routes } from "@/shared/config/routes";

export function useApiSession() {
  const { data: session } = useSession();

  useEffect(() => {
    setAuthToken(session?.user?.accessToken ?? null);
  }, [session?.user?.accessToken]);

  useEffect(() => {
    setOnUnauthorized(() => {
      void signOut({ callbackUrl: `${routes.login}?error=session_expired` });
    });
  }, []);
}
