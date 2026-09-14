// Rede de segurança (Fase 2, Etapa 0) — caracteriza o comportamento ATUAL de
// usePermissions/Can antes da consolidação de RBAC (Etapa 1).
import { render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { useSessionMock } = vi.hoisted(() => ({ useSessionMock: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: useSessionMock }));

import { ROLE_LEVEL } from "./automation-roles";
import { Can, usePermissions } from "./permissions";

function mockSessionWithRoles(roles: string[] | undefined) {
  useSessionMock.mockReturnValue({ data: roles ? { user: { roles } } : null });
}

describe("ROLE_LEVEL", () => {
  it("mapeia os 5 papéis para níveis crescentes de 10 em 10", () => {
    expect(ROLE_LEVEL).toEqual({
      basico: 10,
      operacional: 20,
      gestor: 30,
      administrador: 40,
      admin_tecnico: 50,
    });
  });
});

describe("usePermissions", () => {
  it("sem sessão/roles -> currentRole basico, currentLevel 10", () => {
    mockSessionWithRoles(undefined);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.currentRole).toBe("basico");
    expect(result.current.currentLevel).toBe(10);
    expect(result.current.hasMinLevel(10)).toBe(true);
    expect(result.current.hasMinLevel(20)).toBe(false);
    expect(result.current.hasMinLevel(50)).toBe(false);
  });

  it.each([
    ["gestor", 30],
    ["administrador", 40],
    ["admin_tecnico", 50],
  ])("papel %s resolve para currentLevel %i", (role, level) => {
    mockSessionWithRoles([role]);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.currentRole).toBe(role);
    expect(result.current.currentLevel).toBe(level);
  });

  it("hasMinLevel é inclusivo (>=) e reflete o nível atual", () => {
    mockSessionWithRoles(["gestor"]); // nível 30
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasMinLevel(30)).toBe(true);
    expect(result.current.hasMinLevel(29)).toBe(true);
    expect(result.current.hasMinLevel(31)).toBe(false);
    expect(result.current.hasMinLevel(40)).toBe(false);
  });

  it("hasExactRole verifica se o papel atual está na lista informada", () => {
    mockSessionWithRoles(["administrador"]);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasExactRole(["gestor", "administrador"])).toBe(true);
    expect(result.current.hasExactRole(["gestor", "admin_tecnico"])).toBe(false);
  });

  it("múltiplos papéis: usa o de maior nível (via resolveautomationRole)", () => {
    mockSessionWithRoles(["basico", "admin_tecnico"]);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.currentRole).toBe("admin_tecnico");
  });
});

describe("Can", () => {
  it("minLevel: renderiza children quando o nível é suficiente", () => {
    mockSessionWithRoles(["gestor"]); // nível 30
    render(
      <Can minLevel={30}>
        <span>permitido</span>
      </Can>
    );
    expect(screen.getByText("permitido")).toBeInTheDocument();
  });

  it("minLevel: renderiza fallback (null por padrão) quando o nível é insuficiente", () => {
    mockSessionWithRoles(["basico"]); // nível 10
    const { container } = render(
      <Can minLevel={30}>
        <span>permitido</span>
      </Can>
    );
    expect(screen.queryByText("permitido")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("minLevel: renderiza fallback customizado quando informado", () => {
    mockSessionWithRoles(["basico"]);
    render(
      <Can minLevel={30} fallback={<span>bloqueado</span>}>
        <span>permitido</span>
      </Can>
    );
    expect(screen.getByText("bloqueado")).toBeInTheDocument();
    expect(screen.queryByText("permitido")).not.toBeInTheDocument();
  });

  it("exactRoles: renderiza children só quando o papel atual está na lista", () => {
    mockSessionWithRoles(["gestor"]);
    render(
      <Can exactRoles={["gestor", "administrador"]}>
        <span>permitido</span>
      </Can>
    );
    expect(screen.getByText("permitido")).toBeInTheDocument();
  });

  it("exactRoles: renderiza fallback quando o papel atual não está na lista", () => {
    mockSessionWithRoles(["basico"]);
    render(
      <Can exactRoles={["gestor", "administrador"]} fallback={<span>bloqueado</span>}>
        <span>permitido</span>
      </Can>
    );
    expect(screen.getByText("bloqueado")).toBeInTheDocument();
  });

  it("sem minLevel nem exactRoles: nunca permite (isAllowed fica false)", () => {
    mockSessionWithRoles(["admin_tecnico"]); // maior nível possível
    render(
      <Can fallback={<span>bloqueado</span>}>
        <span>permitido</span>
      </Can>
    );
    expect(screen.getByText("bloqueado")).toBeInTheDocument();
    expect(screen.queryByText("permitido")).not.toBeInTheDocument();
  });
});
