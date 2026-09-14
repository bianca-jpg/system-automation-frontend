"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginCopy } from "@/features/auth/config/login-copy";
import { routes } from "@/shared/config/routes";
import { getSafeInternalHref } from "@/shared/lib/url";
import { Button, Card, LogoWithTitle } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

// Mensagem de erro de campo/formulário: `text-destructive` (token cromático) e
// NÃO `-text`. O cartão de auth é `Panel tone="default"` = `bg-card`, superfície
// NEUTRA — e no tema claro `--destructive-text` é `#000000`, o que apagaria o
// sinal de cor de todas as mensagens de erro do fluxo. `-text` só vale sobre
// fundo tinto do mesmo status (`bg-destructive/10`).
const authErrorClassName = "text-xs text-destructive";

// Largura do cartão de login: 410px, medida de design fechada com o time (não
// há degrau equivalente na escala nomeada do Tailwind).
const authPanelWidthClassName = "w-full max-w-102.5";

/**
 * Mensagem exibida a partir de `?error=` na URL.
 * `session_expired` vem do próprio app (ver `lib/auth/session-expired.ts`,
 * `shared/hooks/useApiSession.ts`, `proxy.ts`). Qualquer outro valor vem do
 * NextAuth ao rejeitar o callback `signIn` do provider Microsoft (ver
 * `auth.ts`) — `AccessDenied` é o código que ele usa quando o callback
 * retorna `false` (papel sem acesso ao painel ou backend recusou o login).
 */
function getErrorMessage(error: string | null): string {
  if (!error) return "";
  if (error === "session_expired") return loginCopy.sessionExpired;
  if (error === "AccessDenied") return loginCopy.automationPanelOnly;
  return loginCopy.ssoGenericError;
}

/** `/login` só com query permitida (ex.: `callbackUrl`), sem `error` / `forceSignOut`. */
function buildCleanLoginPath(searchParams: { get: (key: string) => string | null }): string {
  const callback = getSafeInternalHref(searchParams.get("callbackUrl"));
  const next = new URLSearchParams();
  if (callback) {
    next.set("callbackUrl", callback);
  }
  const qs = next.toString();
  return qs ? `${routes.login}?${qs}` : routes.login;
}

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const [isSsoBusy, setIsSsoBusy] = useState(false);
  const forceSignOutStartedRef = useRef(false);
  const sessionExpiredSignOutStartedRef = useRef(false);
  const stripHandledErrorRef = useRef(false);

  const callbackUrl = getSafeInternalHref(searchParams.get("callbackUrl")) ?? routes.visaoGeral;
  const errorParam = searchParams.get("error");
  const forceSignOutParam = searchParams.get("forceSignOut");
  const errorMessage = getErrorMessage(errorParam);

  /** Remove `error=session_expired` da barra de endereço depois de refletir a mensagem no estado (mantém `callbackUrl`). */
  useEffect(() => {
    if (errorParam !== "session_expired") {
      stripHandledErrorRef.current = false;
      return;
    }
    if (sessionStatus === "loading") return;
    if (session?.user) return;
    if (stripHandledErrorRef.current) return;
    stripHandledErrorRef.current = true;
    router.replace(buildCleanLoginPath(searchParams));
  }, [errorParam, router, searchParams, session?.user, sessionStatus]);

  /** `error=session_expired` com sessão NextAuth ainda ativa: força o signout na API antes de limpar a URL. */
  useEffect(() => {
    if (errorParam !== "session_expired") {
      sessionExpiredSignOutStartedRef.current = false;
      return;
    }
    if (sessionStatus === "loading") return;
    if (!session?.user) return;
    if (sessionExpiredSignOutStartedRef.current) return;

    sessionExpiredSignOutStartedRef.current = true;
    void fetch("/api/auth/force-api-signout", {
      method: "POST",
      cache: "no-store",
      credentials: "include",
    }).finally(() => {
      router.replace(buildCleanLoginPath(searchParams));
      router.refresh();
    });
  }, [errorParam, router, searchParams, session?.user, sessionStatus]);

  /** `forceSignOut=api`: força o signout na API e limpa a URL, preservando `callbackUrl`. */
  useEffect(() => {
    if (forceSignOutStartedRef.current) return;
    if (forceSignOutParam !== "api") return;

    forceSignOutStartedRef.current = true;
    void fetch("/api/auth/force-api-signout", {
      method: "POST",
      cache: "no-store",
      credentials: "include",
    }).finally(() => {
      router.replace(buildCleanLoginPath(searchParams));
      router.refresh();
    });
  }, [forceSignOutParam, router, searchParams]);

  function handleSsoSignIn() {
    setIsSsoBusy(true);
    void signIn("microsoft-entra-id", { callbackUrl });
  }

  return (
    <div className={authPanelWidthClassName}>
      <Card variant="elevated" className="w-full rounded-3xl px-4 py-6 md:px-7 md:py-11">
        <div className="mb-8 flex w-full justify-center">
          <LogoWithTitle />
        </div>

        {/* Único ramo desta tela — o h1 é `sr-only` porque quem identifica o
            cartão visualmente é a `LogoWithTitle` acima; um h1 pintado
            duplicaria o rótulo do botão de SSO. */}
        <h1 className="sr-only">Entrar</h1>

        <Button
          className="w-full"
          type="button"
          variant="outline"
          loading={isSsoBusy}
          onClick={handleSsoSignIn}
        >
          Entrar com Microsoft
        </Button>

        {errorMessage ? (
          <p role="alert" className={cn("mt-3 text-center", authErrorClassName)}>
            {errorMessage}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
