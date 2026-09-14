import { ROLE_LEVEL } from "./automation-roles";
import type { automationRole } from "./automation-roles";
import { APP_BRAND } from "../app-brand";

const automation_ROLES = new Set<automationRole>([
  "basico",
  "operacional",
  "gestor",
  "administrador",
  "admin_tecnico",
]);

/**
 * Papéis do backend que têm acesso ao painel System Automation — só a presença
 * importa. Quem resolve o papel efetivo é `resolveautomationRole`, via
 * `normalizeRoles` + `LEGACY_ROLE_MAP`. Inclui o papel legado "operador"
 * (normalizado para "operacional" no backend).
 */
const BACKEND_ROLE_KEYS = new Set<string>([
  "basico",
  "operacional",
  "operador",
  "gestor",
  "administrador",
  "admin_tecnico",
]);

/** Papéis legados (Collab/Hype) → System Automation — só para normalização de respostas antigas. */
const LEGACY_ROLE_MAP: Record<string, automationRole> = {
  operador: "operacional",
  hype_user: "operacional",
  hype_manager: "gestor",
  hype_admin: "administrador",
  admin: "administrador",
};

export function normalizeRoles(roles: string[] | undefined | null): automationRole[] {
  if (!roles?.length) return ["basico"];
  const normalized: automationRole[] = [];
  for (const role of roles) {
    const mapped = LEGACY_ROLE_MAP[role] || (role as automationRole);
    if (automation_ROLES.has(mapped) && !normalized.includes(mapped)) {
      normalized.push(mapped);
    }
  }
  return normalized.length > 0 ? normalized : ["basico"];
}

export function resolveautomationRole(roles: string[] | undefined | null): automationRole {
  const normalized = normalizeRoles(roles);
  let maxRole: automationRole = "basico";
  let maxLevel = 0;
  for (const r of normalized) {
    const level = ROLE_LEVEL[r] ?? 0;
    if (level > maxLevel) {
      maxLevel = level;
      maxRole = r;
    }
  }
  return maxRole;
}

export function canAccessautomationPanel(roles: string[] | undefined | null): boolean {
  if (!roles?.length) return false;
  return roles.some(
    (role) => BACKEND_ROLE_KEYS.has(role) || role in LEGACY_ROLE_MAP,
  );
}

export const automation_PANEL_ACCESS_DENIED_MESSAGE =
  `Sua conta não tem permissão para acessar o ${APP_BRAND.productName}.`;
