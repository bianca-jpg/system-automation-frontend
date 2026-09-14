// Tradução da resposta de auth do backend para o formato da sessão NextAuth.
// O foco aqui é a resolução do NOME e do rótulo do papel: a tela do painel
// mostrava e-mail no lugar do nome porque o backend não serializava
// `display_name` (quick 260908-prf), e este é o ponto onde o fallback acontece.
import { describe, expect, it } from "vitest";
import { normalizeAuthApiResponse } from "./normalize-auth-api";
import type { AuthenticatedAuthApiResponse } from "./types/auth";

function resposta(
  user: Partial<AuthenticatedAuthApiResponse["user"]>,
): AuthenticatedAuthApiResponse {
  return {
    token: { access_token: "at", refresh_token: "rt", expires_in: 3600 },
    challenge: null,
    user: { id: 7, ...user },
  };
}

describe("normalizeAuthApiResponse — nome", () => {
  it("usa display_name quando o backend manda", () => {
    const n = normalizeAuthApiResponse(
      resposta({ display_name: "Victoria Mollica", email: "victoria@example.com" }),
    );

    expect(n.user.name).toBe("Victoria Mollica");
  });

  it("cai no e-mail quando display_name vem nulo", () => {
    // Conta que ainda não relogou desde a migration 036: o comportamento
    // antigo continua valendo, sem regredir a tela.
    const n = normalizeAuthApiResponse(
      resposta({ display_name: null, email: "victoria@example.com" }),
    );

    expect(n.user.name).toBe("victoria@example.com");
  });

  it("cai no e-mail quando display_name é só espaço", () => {
    const n = normalizeAuthApiResponse(
      resposta({ display_name: "   ", email: "victoria@example.com" }),
    );

    expect(n.user.name).toBe("victoria@example.com");
  });

  it("cai em 'Usuário' quando não há nome nem e-mail", () => {
    const n = normalizeAuthApiResponse(resposta({}));

    expect(n.user.name).toBe("Usuário");
  });
});

describe("normalizeAuthApiResponse — rótulo do papel", () => {
  it("propaga role_title do backend", () => {
    const n = normalizeAuthApiResponse(resposta({ role_title: "Admin Técnico" }));

    expect(n.user.roleTitle).toBe("Admin Técnico");
  });

  it("role_title ausente ou vazio vira undefined, não string vazia", () => {
    // A UI esconde a linha do papel quando não há rótulo; string vazia
    // renderizaria uma linha em branco embaixo do nome.
    expect(normalizeAuthApiResponse(resposta({})).user.roleTitle).toBeUndefined();
    expect(
      normalizeAuthApiResponse(resposta({ role_title: null })).user.roleTitle,
    ).toBeUndefined();
    expect(
      normalizeAuthApiResponse(resposta({ role_title: "  " })).user.roleTitle,
    ).toBeUndefined();
  });
});

describe("normalizeAuthApiResponse — papéis e foto", () => {
  it("usa groups quando roles vem vazio", () => {
    const n = normalizeAuthApiResponse(resposta({ roles: [], groups: ["gestor"] }));

    expect(n.user.roles).toEqual(["gestor"]);
  });

  it("image segue undefined: o Entra não manda foto no ID token", () => {
    // Fixa a decisão registrada no código — a foto depende do Microsoft Graph,
    // que ainda não está integrado. Até lá o avatar usa as iniciais.
    const n = normalizeAuthApiResponse(resposta({ display_name: "Ana Souza" }));

    expect(n.user.image).toBeUndefined();
  });
});
