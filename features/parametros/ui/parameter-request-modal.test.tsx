// Rede de segurança (Fase 1, Etapa 0) — caracteriza ParameterRequestModal como
// está hoje, incluindo sua PRÓPRIA cópia de CHANGE_TYPE_LABEL (duplicada
// verbatim da que existe em usuarios/page.tsx — achado do mapeamento).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ParameterChangeRequest } from "@/entities/parametro/model/types";
import { ParameterRequestModal } from "./parameter-request-modal";

function makeRequest(overrides: Partial<ParameterChangeRequest> = {}): ParameterChangeRequest {
  return {
    id: 55,
    requested_by: 3,
    target_chave: "tolerancia_adequacao",
    change_type: "update",
    proposed_payload: { tipo: "float", valor: "0.05", descricao: "Nova tolerância" },
    justification: "Ajuste de margem",
    status: "pending",
    reviewed_by: null,
    reviewed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("ParameterRequestModal — caracterização", () => {
  it("não renderiza nada quando isOpen=false ou request=null", () => {
    const { container: c1 } = render(
      <ParameterRequestModal isOpen={false} onClose={vi.fn()} request={makeRequest()} onConfirm={vi.fn()} />
    );
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(
      <ParameterRequestModal isOpen={true} onClose={vi.fn()} request={null} onConfirm={vi.fn()} />
    );
    expect(c2).toBeEmptyDOMElement();
  });

  it.each([
    ["create", "Criação de parâmetro"],
    ["update", "Atualização de parâmetro"],
    ["delete", "Exclusão de parâmetro"],
  ] as const)("change_type=%s renderiza o label %s", (change_type, label) => {
    render(
      <ParameterRequestModal
        isOpen
        onClose={vi.fn()}
        request={makeRequest({ change_type })}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("usa target_chave quando presente, e cai para proposed_payload.chave quando ausente", () => {
    const { rerender } = render(
      <ParameterRequestModal isOpen onClose={vi.fn()} request={makeRequest()} onConfirm={vi.fn()} />
    );
    expect(screen.getByText("tolerancia_adequacao")).toBeInTheDocument();

    rerender(
      <ParameterRequestModal
        isOpen
        onClose={vi.fn()}
        request={makeRequest({ target_chave: null, proposed_payload: { chave: "outro_parametro" } })}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText("outro_parametro")).toBeInTheDocument();
  });

  it("decisão padrão é 'approved' e chama onConfirm(id, 'approved')", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <ParameterRequestModal isOpen onClose={vi.fn()} request={makeRequest({ id: 77 })} onConfirm={onConfirm} />
    );

    await user.click(screen.getByRole("button", { name: /confirmar a aprovação/i }));
    expect(onConfirm).toHaveBeenCalledWith(77, "approved");
  });

  it("selecionar 'Rejeitado' chama onConfirm(id, 'rejected')", async () => {
    // Render à parte: após um onConfirm bem-sucedido, isSubmitting fica travado em
    // `true` para sempre (setIsSubmitting(false) só existe no catch, não no caminho
    // de sucesso) — comportamento atual, caracterizado aqui, não corrigido. Na app
    // real isso não importa porque o pai fecha o modal (isOpen=false) logo em
    // seguida, mas testar os dois decisions no MESMO render pisaria nesse estado.
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <ParameterRequestModal isOpen onClose={vi.fn()} request={makeRequest({ id: 77 })} onConfirm={onConfirm} />
    );

    await user.click(screen.getByLabelText("Rejeitado"));
    await user.click(screen.getByRole("button", { name: /confirmar a reprovação/i }));
    expect(onConfirm).toHaveBeenCalledWith(77, "rejected");
  });
});
