"use client";

import { useSession } from "next-auth/react";
import React from "react";
import { resolveautomationRole } from "./automation-panel-roles";
import { ROLE_LEVEL } from "./automation-roles";
import type { automationRole } from "./automation-roles";

export function usePermissions() {
  const { data: session } = useSession();
  
  const currentRole = resolveautomationRole(session?.user?.roles);
  const currentLevel = ROLE_LEVEL[currentRole] ?? 0;

  const hasMinLevel = (minLevel: number) => currentLevel >= minLevel;
  const hasExactRole = (roles: automationRole[]) => roles.includes(currentRole);

  return {
    currentRole,
    currentLevel,
    hasMinLevel,
    hasExactRole,
  };
}

interface CanProps {
  minLevel?: number;
  exactRoles?: automationRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Componente para renderização condicional baseada em permissões.
 * 
 * Exemplo:
 * <Can minLevel={30}>
 *   <button>Aprovar Adequação</button>
 * </Can>
 */
export function Can({ minLevel, exactRoles, children, fallback = null }: CanProps) {
  const { hasMinLevel, hasExactRole } = usePermissions();

  let isAllowed = false;

  if (minLevel !== undefined) {
    isAllowed = hasMinLevel(minLevel);
  } else if (exactRoles !== undefined) {
    isAllowed = hasExactRole(exactRoles);
  }

  return <>{isAllowed ? children : fallback}</>;
}
