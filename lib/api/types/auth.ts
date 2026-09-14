/**
 * Contratos JSON da API System Automation — auth em `/api/auth/*`.
 */

/** Bloco aninhado retornado em login, renovacao e confirmacoes com login automatico. */
type TokenBlock = {
  access_token: string;
  refresh_token?: string | null;
  expires_in: number;
  token_type?: string;
};

type AuthChallenge = {
  challenge_name: "NEW_PASSWORD_REQUIRED" | string;
  session: string;
  email: string;
};

type CollaboratorApiSnapshot = {
  org_id?: number | null;
  hierarchy_rank?: number | null;
  job_title?: string | null;
  employment_start_date?: string | null;
  city?: string | null;
  state?: string | null;
  work_model?: string | null;
};

/** Usuário serializado (auth + user/me + profile). */
type UserApiResponse = {
  id: number;
  email?: string | null;
  cpf?: string | null;
  phone?: string | null;
  display_name?: string | null;
  role_title?: string | null;
  hired_at?: string | null;
  hired_at_label?: string | null;
  roles?: string[];
  groups?: string[];
  streak_days?: number;
  collaborator?: CollaboratorApiSnapshot | null;
};

/** Usuário serializado nas respostas de autenticação (`/api/auth/*`). */
export type AuthUserApiResponse = UserApiResponse;

/**
 * Resposta de POST /api/auth/sso/microsoft, /api/auth/token/refresh, etc.
 * (não confundir com sessão NextAuth.)
 */
export type AuthApiResponse = {
  token: TokenBlock | null;
  user: AuthUserApiResponse;
  challenge: AuthChallenge | null;
};

export type AuthenticatedAuthApiResponse = AuthApiResponse & {
  token: TokenBlock;
  challenge: null;
};

/** Formato já achatado para montar o `User` do NextAuth a partir do SSO. */
export type NormalizedAuthSession = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  user: {
    id: string;
    name: string;
    email: string;
    roles: string[];
    /**
     * Rótulo legível do papel de maior nível ("Admin Técnico"), serializado
     * pelo backend a partir de `ROLE_TITLE`. A UI exibe e não traduz: papel
     * virando texto tem um só dono, no domínio do backend.
     */
    roleTitle?: string | null;
    image?: string | null;
  };
};
