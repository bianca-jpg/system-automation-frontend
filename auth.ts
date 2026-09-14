import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { isBackendApiConfigured } from "@/lib/api/config";
import { hasAuthenticatedToken, normalizeAuthApiResponse } from "@/lib/api/normalize-auth-api";
import { postRefresh, postSignInMicrosoft, postSignOut } from "@/lib/api/auth-backend";
import type { AuthenticatedAuthApiResponse, NormalizedAuthSession } from "@/lib/api/types/auth";
import { getAuthSecret } from "@/lib/auth/auth-secret";
import { AUTH_SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session-policy";
import {
  canAccessautomationPanel,
  resolveautomationRole,
} from "@/shared/config/auth/automation-panel-roles";
import { routes } from "@/shared/config/routes";

function buildUserFromNormalizedAuth(n: NormalizedAuthSession) {
  const u = n.user;
  const roles = u.roles ?? [];
  const automationRole = resolveautomationRole(roles);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image ?? undefined,
    role: automationRole,
    roleTitle: u.roleTitle ?? undefined,
    roles,
    accessToken: n.access_token,
    refreshToken: n.refresh_token,
    accessTokenExpires: Date.now() + (n.expires_in ?? 3600) * 1000,
  };
}

function buildUserFromAuthApiResponse(auth: AuthenticatedAuthApiResponse) {
  return buildUserFromNormalizedAuth(normalizeAuthApiResponse(auth));
}

export const { handlers, auth, signOut } = NextAuth({
  secret: getAuthSecret(),
  trustHost: true,
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      // Sem isso, o Azure AD reaproveita o cookie de sessão SSO do navegador
      // e reloga em silêncio após um logout — `prompt: "login"` força a tela
      // de credenciais da Microsoft em toda autenticação, mesmo com sessão
      // ativa no `login.microsoftonline.com`.
      authorization: { params: { prompt: "login" } },
    }),
  ],
  session: { strategy: "jwt", maxAge: AUTH_SESSION_MAX_AGE_SECONDS },
  pages: {
    signIn: routes.login,
  },
  events: {
    async signOut(message) {
      if ("token" in message && message.token) {
        const t = message.token as { accessToken?: string };
        if (t.accessToken) {
          try {
            await postSignOut(t.accessToken);
          } catch (error) {
            console.warn("[auth] sign-out no backend falhou; limpando sessão local mesmo assim", error);
          }
        }
      }
    },
  },
  callbacks: {
    async signIn({ account }) {
      if (account?.provider !== "microsoft-entra-id") return true;
      if (!account.id_token) return false;

      // Backend rejeita (401/403) ou papel sem acesso ao painel: `false` aqui
      // faz o NextAuth voltar para a tela de login com `?error=AccessDenied`
      // (mecanismo genérico de OAuth — `CredentialsSignin`/`code` só existe
      // no fluxo do provider Credentials, que este app não usa mais).
      let authResponse: AuthenticatedAuthApiResponse;
      try {
        authResponse = await postSignInMicrosoft(account.id_token);
      } catch {
        return false;
      }
      if (!hasAuthenticatedToken(authResponse)) return false;

      const roles = authResponse.user.roles?.length
        ? authResponse.user.roles
        : (authResponse.user.groups ?? []);
      if (!canAccessautomationPanel(roles)) return false;

      // Único jeito de levar o resultado do backend do `signIn` até o `jwt`
      // callback: anotar no próprio `account`, que o NextAuth repassa
      // intacto para a chamada seguinte do `jwt` nesta mesma autenticação.
      (account as { automationAuth?: AuthenticatedAuthApiResponse }).automationAuth = authResponse;
      return true;
    },
    async jwt({ token, account }) {
      const ssoAuth = (account as { automationAuth?: AuthenticatedAuthApiResponse } | null)
        ?.automationAuth;
      if (ssoAuth) {
        const u = buildUserFromAuthApiResponse(ssoAuth);
        token.id = u.id;
        token.role = u.role;
        token.roleTitle = u.roleTitle;
        token.roles = u.roles;
        token.name = u.name;
        token.email = u.email;
        token.picture = u.image;
        token.accessToken = u.accessToken;
        token.refreshToken = u.refreshToken;
        token.accessTokenExpires = u.accessTokenExpires;
        delete token.error;
        return token;
      }

      const expiresMs = token.accessTokenExpires as number | undefined;
      const refreshToken = token.refreshToken as string | undefined;

      if (
        expiresMs &&
        refreshToken &&
        isBackendApiConfigured() &&
        Date.now() > expiresMs - 60_000
      ) {
        try {
          const refreshed = await postRefresh(refreshToken);
          token.accessToken = refreshed.token.access_token;
          token.refreshToken = refreshed.token.refresh_token ?? refreshToken;
          token.accessTokenExpires = Date.now() + refreshed.token.expires_in * 1000;
          const n = normalizeAuthApiResponse(refreshed);
          token.roles = n.user.roles;
          token.role = resolveautomationRole(n.user.roles);
          // Papel pode ter mudado entre a emissão e a renovação (promoção por
          // um admin): o rótulo segue o papel, senão a tela mostraria um
          // enquanto o guard aplicaria o outro.
          token.roleTitle = n.user.roleTitle ?? token.roleTitle;
          token.error = undefined;
        } catch {
          token.error = "RefreshAccessTokenError";
          token.accessToken = undefined;
          token.refreshToken = undefined;
          token.accessTokenExpires = undefined;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? "";
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.image = token.picture ?? undefined;
        session.user.role = (token.role as typeof session.user.role) ?? "basico";
        session.user.roleTitle = token.roleTitle as string | undefined;
        session.user.roles = token.roles as string[] | undefined;
        session.user.accessToken = token.accessToken as string | undefined;
      }
      session.error = token.error as string | undefined;
      return session;
    },
  },
});
