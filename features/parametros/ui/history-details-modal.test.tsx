// Rede de segurança (Fase 1, Etapa 0) — caracteriza HistoryDetailsModal.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HistoryDetailsModal } from "./history-details-modal";

const item = {
  id: 1,
  date: "10/01/2026 10:00",
  parameter: "Margem de adequação",
  requester: "Ana",
  decision: "Aprovado",
  admin: "Roberto",
  notes: "Aprovado sem ressalvas.",
};

describe("HistoryDetailsModal — caracterização", () => {
  it("não renderiza nada quando isOpen=false ou historyItem=null", () => {
    const { container: c1 } = render(<HistoryDetailsModal isOpen={false} onClose={vi.fn()} historyItem={item} />);
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(<HistoryDetailsModal isOpen onClose={vi.fn()} historyItem={null} />);
    expect(c2).toBeEmptyDOMElement();
  });

  it("mostra todos os campos do item quando aberto", () => {
    render(<HistoryDetailsModal isOpen onClose={vi.fn()} historyItem={item} />);
    expect(screen.getByText("Margem de adequação")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Aprovado sem ressalvas.")).toBeInTheDocument();
    expect(screen.getByText("10/01/2026 10:00")).toBeInTheDocument();
    expect(screen.getByText("Roberto")).toBeInTheDocument();
  });

  it("chama onClose ao clicar em Fechar ou no X do header", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<HistoryDetailsModal isOpen onClose={onClose} historyItem={item} />);

    // Desde a migração para o Dialog do design system existem DOIS botões que
    // atendem por /fechar/i: o X do header (DialogClose, agora com
    // aria-label="Fechar") e o botão do rodapé. Antes o X não tinha nome
    // acessível, então `getByRole` casava com um só.
    const dialog = screen.getByRole("dialog");
    const [closeIcon, closeFooter] = within(dialog).getAllByRole("button", { name: /fechar/i });

    await user.click(closeIcon);
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(closeFooter);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
