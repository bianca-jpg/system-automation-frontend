import type { AuthUser } from "@/lib/api/types";
import { routes } from "@/shared/config/routes";

export type automationRole = AuthUser["role"];

/** Única fonte de verdade para o nível de privilégio de cada papel do automation OR. */
export const ROLE_LEVEL: Record<automationRole, number> = {
  basico: 10,
  operacional: 20,
  gestor: 30,
  administrador: 40,
  admin_tecnico: 50,
};

/** Papéis atribuíveis, em ordem crescente de privilégio (deriva de ROLE_LEVEL). */
export const automation_ROLES: automationRole[] = ["basico", "operacional", "gestor", "administrador", "admin_tecnico"];

const PROTECTED_PREFIXES = [
  routes.visaoGeral,
  routes.pedidos,
  routes.historico,
  routes.alertas,
  routes.parametros,
];

export function canAccessPath(pathname: string, role: automationRole | undefined): boolean {
  if (!role) return false;
  if (pathname === routes.login) return true;
  if (pathname === routes.usuarios || pathname.startsWith(`${routes.usuarios}/`)) {
    return ROLE_LEVEL[role] >= ROLE_LEVEL.administrador;
  }
  // Decidir solicitação de parâmetro é ato administrativo: mesmo nível de
  // /usuarios, de onde estes quadros vieram. O gate do sidebar apenas esconde o
  // link — sem esta trava a rota abriria para quem digitasse a URL.
  if (
    pathname === routes.configuracoesParametros ||
    pathname.startsWith(`${routes.configuracoesParametros}/`)
  ) {
    return ROLE_LEVEL[role] >= ROLE_LEVEL.administrador;
  }
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function defaultPathForRole(role: automationRole): string {
  // Costura declarada: hoje todos os papéis caem na Visão Geral.
  void role;
  return routes.visaoGeral;
}
