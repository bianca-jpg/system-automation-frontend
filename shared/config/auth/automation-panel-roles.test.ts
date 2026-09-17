// Rede de segurança (Fase 2, Etapa 0) — caracteriza o comportamento ATUAL de
// normalizeRoles/resolveautomationRole/canAccessautomationPanel antes da consolidação
// de RBAC (Etapa 1).
import { describe, expect, it } from "vitest";
import {
  automation_PANEL_ACCESS_DENIED_MESSAGE,
  canAccessautomationPanel,
  normalizeRoles,
  resolveautomationRole,
} from "./automation-panel-roles";

describe("normalizeRoles", () => {
  it("retorna ['basico'] para undefined, null ou array vazio", () => {
    expect(normalizeRoles(undefined)).toEqual(["basico"]);
    expect(normalizeRoles(null)).toEqual(["basico"]);
    expect(normalizeRoles([])).toEqual(["basico"]);
  });

  it("mantém papéis já válidos do automation OR sem alteração", () => {
    expect(normalizeRoles(["gestor"])).toEqual(["gestor"]);
    expect(normalizeRoles(["basico", "operacional"])).toEqual(["basico", "operacional"]);
  });

  it.each([
    ["operador", "operacional"],
    ["hype_user", "operacional"],
    ["hype_manager", "gestor"],
    ["hype_admin", "administrador"],
    ["admin", "administrador"],
  ])("mapeia papel legado %s -> %s", (legacy, expected) => {
    expect(normalizeRoles([legacy])).toEqual([expected]);
  });

  it("descarta papéis desconhecidos (nem válidos nem legados)", () => {
    expect(normalizeRoles(["papel_inexistente"])).toEqual(["basico"]);
  });

  it("dedup: o mesmo papel normalizado não se repete", () => {
    expect(normalizeRoles(["gestor", "gestor"])).toEqual(["gestor"]);
    expect(normalizeRoles(["operador", "operacional"])).toEqual(["operacional"]);
  });

  it("mistura papel válido + desconhecido: mantém só o válido normalizado", () => {
    expect(normalizeRoles(["papel_inexistente", "administrador"])).toEqual(["administrador"]);
  });
});

describe("resolveautomationRole", () => {
  it("sem papéis -> basico", () => {
    expect(resolveautomationRole(undefined)).toBe("basico");
  });

  it("um único papel -> o próprio papel", () => {
    expect(resolveautomationRole(["gestor"])).toBe("gestor");
  });

  it("múltiplos papéis -> o de maior nível", () => {
    expect(resolveautomationRole(["basico", "administrador", "operacional"])).toBe("administrador");
    expect(resolveautomationRole(["admin_tecnico", "gestor"])).toBe("admin_tecnico");
  });

  it("papéis legados são resolvidos após a normalização", () => {
    expect(resolveautomationRole(["operador", "hype_admin"])).toBe("administrador");
  });
});

describe("canAccessautomationPanel", () => {
  it("nega acesso sem papéis", () => {
    expect(canAccessautomationPanel(undefined)).toBe(false);
    expect(canAccessautomationPanel(null)).toBe(false);
    expect(canAccessautomationPanel([])).toBe(false);
  });

  it.each(["basico", "operacional", "operador", "gestor", "administrador", "admin_tecnico"])(
    "permite acesso quando o papel %s está no mapa do backend",
    (role) => {
      expect(canAccessautomationPanel([role])).toBe(true);
    }
  );

  it.each(["hype_user", "hype_manager", "hype_admin", "admin"])(
    "permite acesso quando o papel %s é um legado reconhecido (Collab/Hype)",
    (role) => {
      expect(canAccessautomationPanel([role])).toBe(true);
    }
  );

  it("nega acesso quando nenhum papel é reconhecido", () => {
    expect(canAccessautomationPanel(["papel_totalmente_desconhecido"])).toBe(false);
  });

  it("permite acesso se PELO MENOS UM papel da lista for reconhecido", () => {
    expect(canAccessautomationPanel(["papel_desconhecido", "gestor"])).toBe(true);
  });
});

describe("automation_PANEL_ACCESS_DENIED_MESSAGE", () => {
  it("é a mensagem fixa exibida quando o acesso é negado", () => {
    expect(automation_PANEL_ACCESS_DENIED_MESSAGE).toBe(
      "Sua conta não tem permissão para acessar o Planejamento.",
    );
  });
});
