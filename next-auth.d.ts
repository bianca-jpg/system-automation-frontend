import type { DefaultSession } from "next-auth";
import type { AuthUser } from "@/lib/api/types";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: AuthUser["role"];
    roles?: string[];
    roleTitle?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
  }

  interface Session {
    error?: string;
    user: DefaultSession["user"] & {
      id?: string;
      role: AuthUser["role"];
      roles?: string[];
      /** Rótulo legível do papel, serializado pelo backend (ROLE_TITLE). */
      roleTitle?: string;
      accessToken?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AuthUser["role"];
    roles?: string[];
    roleTitle?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    email?: string | null;
    name?: string | null;
    picture?: string | null;
  }
}
