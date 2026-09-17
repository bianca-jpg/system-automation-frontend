// Rede de segurança (Fase 2, Etapa 0) — caracteriza o comportamento ATUAL de
// canAccessPath/defaultPathForRole antes da consolidação de RBAC (Etapa 1).
// Nota: dado como proxy.ts chama canAccessPath hoje (só depois de tratar
// isLogin e a ausência de role separadamente), os ramos "!role" e
// "pathname === routes.login" nunca são alcançados em produção — mas são
// testados aqui mesmo assim, como comportamento real da função pura.
import { describe, expect, it } from "vitest";
import { canAccessPath, defaultPathForRole } from "./automation-roles";
import { routes } from "@/shared/config/routes";
import type { automationRole } from "./automation-roles";

const ALL_ROLES: automationRole[] = ["basico", "operacional", "gestor", "administrador", "admin_tecnico"];

describe("canAccessPath", () => {
  it("nega acesso a qualquer caminho quando role é undefined", () => {
    for (const path of [routes.login, routes.visaoGeral, routes.usuarios, "/qualquer"]) {
      expect(canAccessPath(path, undefined)).toBe(false);
    }
  });

  it("permite /login quando há role (ramo hoje inalcançável via proxy, mas existe na função)", () => {
    expect(canAccessPath(routes.login, "basico")).toBe(true);
  });

  it("/usuarios e subcaminhos exigem nível >= administrador (administrador e admin_tecnico)", () => {
    for (const role of ALL_ROLES) {
      const esperado = role === "administrador" || role === "admin_tecnico";
      expect(canAccessPath(routes.usuarios, role)).toBe(esperado);
      expect(canAccessPath(`${routes.usuarios}/qualquer`, role)).toBe(esperado);
    }
  });

  it("/configuracoes-parametros e subcaminhos exigem nível >= administrador", () => {
    for (const role of ALL_ROLES) {
      const esperado = role === "administrador" || role === "admin_tecnico";
      expect(canAccessPath(routes.configuracoesParametros, role)).toBe(esperado);
      expect(canAccessPath(`${routes.configuracoesParametros}/qualquer`, role)).toBe(esperado);
    }
  });

  it("/configuracoes-parametros não herda o acesso livre de /parametros", () => {
    // As duas rotas terminam na mesma palavra. Se o gate passasse a casar por
    // substring, gestor (30) entraria numa tela de decisão administrativa.
    expect(canAccessPath(routes.parametros, "gestor")).toBe(true);
    expect(canAccessPath(routes.configuracoesParametros, "gestor")).toBe(false);
  });

  it.each([routes.visaoGeral, routes.pedidos, routes.historico, routes.alertas, routes.parametros])(
    "%s (prefixo protegido) é acessível para QUALQUER role definida",
    (path) => {
      for (const role of ALL_ROLES) {
        expect(canAccessPath(path, role)).toBe(true);
        expect(canAccessPath(`${path}/subpagina`, role)).toBe(true);
      }
    }
  );

  it("nega acesso a um caminho fora de login/usuarios/prefixos protegidos", () => {
    expect(canAccessPath("/rota-inexistente", "admin_tecnico")).toBe(false);
  });
});

describe("defaultPathForRole", () => {
  it("sempre retorna visaoGeral, independente da role", () => {
    for (const role of ALL_ROLES) {
      expect(defaultPathForRole(role)).toBe(routes.visaoGeral);
    }
  });
});
