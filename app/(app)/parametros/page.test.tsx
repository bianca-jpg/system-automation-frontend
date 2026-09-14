// Rede de segurança (Fase 1, Etapa 0) — caracteriza o comportamento ATUAL de
// ParametrosPage antes de qualquer reorganização DDD, principalmente o mapeamento
// inline rawType->mappedType de handleEditClick (hoje só existe dentro do handler,
// sem função nomeada extraída — por isso o teste passa pela interação real de
// acionar "Editar" em vez de importar uma função pura).
//
// As ações de linha agora seguem o padrão do manager: um único gatilho por
// linha que abre um DropdownMenu com os itens Editar/Excluir — daí o helper
// `acionarAcaoDaLinha`. Com a tabela vinda do `DynamicTable` do design system,
// esse gatilho é rotulado com o nome da linha ("Abrir ações para <parâmetro>"),
// não mais só "Abrir ações" — por isso a busca por expressão regular.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Parameter } from "@/entities/parametro/model/types";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock("@/lib/api/http-client", () => ({ apiFetch: apiFetchMock }));

vi.mock("@/shared/config/auth/permissions", () => ({
  usePermissions: () => ({ hasMinLevel: (min: number) => min <= 40 }),
  Can: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// O StandardPageHeader monta o BackButton do design system, que chama
// useRouter(). Sem o app router montado, o Next lança "invariant expected app
// router to be mounted" no jsdom.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

import ParametrosPage from "./page";

// A tabela do design system guarda ordenação e busca em localStorage
// (`persistKey`). Sem limpar, o estado de um teste vazaria para o próximo.
// O encadeamento opcional é necessário: o jsdom desta suíte roda sem storage
// real (`window.localStorage` é um objeto vazio), e o DynamicTable já trata
// isso — o teste não pode quebrar por causa do ambiente.
beforeEach(() => {
  window.localStorage?.clear?.();
  apiFetchMock.mockReset();
});

function paginaDeParametros(parametros: Parameter[]) {
  return {
    rows: parametros.map((param) => ({
      id: param.id,
      chave: param.name,
      valor: String(param.value),
      tipo: param.type,
      descricao: param.description,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    })),
    total: parametros.length,
    page: 1,
    pageSize: 25,
    totalPages: 1,
  };
}

function renderWithParam(param: Partial<Parameter>) {
  const fullParam: Parameter = {
    id: 1,
    name: "Parâmetro de teste",
    type: "string",
    value: "10",
    unit: "%",
    limits: "0-100",
    limitsDetail: "",
    description: "descrição",
    status: "Ativo",
    ...param,
  };
  apiFetchMock.mockImplementation(async (path: string) => (
    path.startsWith("/api/v1/parametros?")
      ? paginaDeParametros([fullParam])
      : undefined
  ));
  return render(<ParametrosPage />);
}

/** Abre o menu "..." da (única) linha renderizada e aciona o item pedido. */
async function acionarAcaoDaLinha(
  user: ReturnType<typeof userEvent.setup>,
  item: RegExp | string
) {
  await user.click(await screen.findByRole("button", { name: /^Abrir ações para / }));
  await user.click(await screen.findByRole("menuitem", { name: item }));
}

// A tela não tinha estado de carregando: renderizava tabela e indicadores
// vazios enquanto o AppDataProvider buscava os parâmetros. Agora, enquanto a
// carga inicial não termina (`parametersLoading`), as duas áreas de dados viram
// esqueleto — e só elas: o cabeçalho da página e o título do resumo são texto
// fixo e continuam reais.
describe("ParametrosPage — estado de carregamento", () => {
  it("troca tabela e indicadores por esqueleto, com rótulo acessível, enquanto os parâmetros carregam", () => {
    apiFetchMock.mockImplementation(() => new Promise(() => {}));

    render(<ParametrosPage />);

    const regioes = screen.getAllByRole("status");
    expect(regioes).toHaveLength(2);
    expect(regioes[0]).toHaveTextContent("Carregando parâmetros...");
    expect(regioes[1]).toHaveTextContent("Carregando indicadores do resumo...");
    regioes.forEach((regiao) => expect(regiao).toHaveAttribute("aria-busy", "true"));

    // Conteúdo conhecido não vira esqueleto.
    expect(screen.getByRole("heading", { name: "Parâmetros da Aplicação" })).toBeInTheDocument();
    expect(screen.getByText("Resumo da Aplicação")).toBeInTheDocument();

    // A tabela real ainda não chegou — nem seus cabeçalhos de coluna.
    expect(screen.queryByText("Valor atual")).not.toBeInTheDocument();
  });
});

// A tela tinha dois h3 e nenhum h2 abaixo do h1 da rota: as duas seções agora
// são h2 irmãs. O ícone `cursor-help` ao lado do nome do parâmetro foi removido
// — ele não abria dica alguma e não tinha nome acessível, e a descrição já vive
// numa coluna própria, sempre visível.
describe("ParametrosPage — estrutura de títulos e descrição do parâmetro", () => {
  it("expõe as duas seções como h2, abaixo do h1 da rota", () => {
    renderWithParam({});

    expect(screen.getByRole("heading", { level: 1, name: "Parâmetros da Aplicação" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Parâmetros" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Resumo da Aplicação" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  // O tooltip de descrição saiu: ele repetia, atrás de um hover, o MESMO
  // `param.description` que a coluna "Descrição" já mostra sempre visível na
  // mesma linha. O que o teste garante agora é que a informação continua na
  // tela — e que não voltou a existir um segundo caminho para ela.
  it("mostra a descrição na coluna dedicada, sem gatilho de tooltip duplicando", async () => {
    renderWithParam({ name: "Margem de adequação", description: "Tolerância do motor" });

    expect(await screen.findByText("Tolerância do motor")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sobre Margem de adequação" }),
    ).not.toBeInTheDocument();
  });
});

// A tabela passou a vir do `DynamicTable` do design system, que ordena ao
// clicar no cabeçalho. Só as três colunas pedidas ordenam: Parâmetro, Tipo e
// Status. Valor atual, Limites/Opções e Descrição ficam fixas de propósito —
// são textos livres, e a comparação lexicográfica ("10" antes de "5") daria
// uma ordem errada com cara de certa.
describe("ParametrosPage — ordenação pelo cabeçalho da tabela", () => {
  const PARAMETROS: Parameter[] = [
    {
      id: 1,
      name: "beta_limite",
      type: "float",
      value: "10",
      unit: "%",
      limits: "0-100",
      limitsDetail: "",
      description: "segundo na ordem",
      status: "Ativo",
    },
    {
      id: 2,
      name: "alfa_limite",
      type: "bool",
      value: "1",
      unit: "",
      limits: "Sim / Não",
      limitsDetail: "",
      description: "primeiro na ordem",
      status: "Inativo",
    },
  ];

  function renderComParametros() {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (!path.startsWith("/api/v1/parametros?")) return undefined;
      const query = new URL(path, "http://localhost").searchParams;
      const search = (query.get("search") ?? "").toLowerCase();
      const order = query.get("order") ?? "asc";
      const sort = query.get("sort") ?? "name";
      const filtered = PARAMETROS.filter((param) => (
        !search || param.name.toLowerCase().includes(search)
      ));
      const rows = [...filtered].sort((left, right) => {
        const leftValue = sort === "type" ? left.type : sort === "value" ? left.value : left.name;
        const rightValue = sort === "type" ? right.type : sort === "value" ? right.value : right.name;
        return leftValue.localeCompare(rightValue) * (order === "desc" ? -1 : 1);
      });
      return paginaDeParametros(rows);
    });
    return render(<ParametrosPage />);
  }

  /** Conteúdo das linhas de dados, na ordem em que estão na tela. */
  function linhasDeDados() {
    return screen
      .getAllByRole("row")
      .slice(1) // a primeira é o cabeçalho de colunas
      .map((linha) => linha.textContent ?? "");
  }

  it.each(["Parâmetro", "Tipo", "Status"])(
    "coluna %s tem cabeçalho acionável de ordenação",
    async (coluna) => {
      renderComParametros();

      expect(await screen.findByRole("button", { name: coluna })).toBeInTheDocument();
    }
  );

  it.each(["Valor atual", "Limites / Opções", "Descrição"])(
    "coluna %s não é ordenável",
    async (coluna) => {
      renderComParametros();

      expect(await screen.findByRole("columnheader", { name: coluna })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: coluna })).not.toBeInTheDocument();
    }
  );

  it("clicar em Parâmetro alterna crescente/decrescente e reordena as linhas", async () => {
    const user = userEvent.setup();
    renderComParametros();

    await screen.findByText("alfa_limite");
    // A primeira página já vem ordenada pelo servidor.
    expect(linhasDeDados()[0]).toContain("alfa_limite");
    expect(screen.getByRole("columnheader", { name: "Parâmetro" })).toHaveAttribute(
      "aria-sort",
      "ascending"
    );

    await user.click(screen.getByRole("button", { name: "Parâmetro" }));
    await screen.findByText("beta_limite");
    await screen.findByRole("columnheader", { name: "Parâmetro" });
    expect(screen.getByRole("columnheader", { name: "Parâmetro" })).toHaveAttribute(
      "aria-sort",
      "descending"
    );
    expect(linhasDeDados()[0]).toContain("beta_limite");
  });

  it("busca da tabela filtra as linhas pelo nome do parâmetro", async () => {
    const user = userEvent.setup();
    renderComParametros();

    await user.type(await screen.findByRole("searchbox", { name: "Buscar parâmetros" }), "alfa");
    await screen.findByText("alfa_limite");

    expect(linhasDeDados()).toHaveLength(1);
    expect(linhasDeDados()[0]).toContain("alfa_limite");
  });
});

describe("ParametrosPage — caracterização do mapeamento rawType -> mappedType (handleEditClick)", () => {
  it.each([
    ["float", "float"],
    ["Percent", "float"],
    ["int", "float"], // "int" cai no mesmo bucket de float hoje — comportamento atual, não "corrigido" aqui
    ["Integer", "float"], // "integer".includes("int") também é true
    ["bool", "bool"],
    ["Boolean", "bool"],
    ["string", "string"],
    ["json", "string"], // "json" não bate em nenhum includes -> cai no default "string"
  ])("param.type=%s -> select de Tipo fica com value=%s", async (rawType, mappedType) => {
    const user = userEvent.setup();
    renderWithParam({ type: rawType });

    await acionarAcaoDaLinha(user, "Editar");

    // O campo Tipo agora é o Select do design system (Radix): o valor escolhido
    // aparece como texto no gatilho (role="combobox"), não como <option> de um
    // <select> nativo — daí a asserção por texto em vez de findByDisplayValue.
    const tipoSelect = await screen.findByRole("combobox", { name: "Tipo" });
    expect(tipoSelect).toHaveTextContent(
      mappedType === "float"
        ? "Número Decimal (Valores quebrados ou percentuais, ex: 10,5)"
        : mappedType === "bool"
          ? "Booleano (Apenas opções de Sim ou Não)"
          : "Texto (Palavras, frases ou nomes)"
    );
  });

  it("pré-preenche nome/valor/descrição do parâmetro no modal de edição", async () => {
    const user = userEvent.setup();
    renderWithParam({ name: "Margem de adequação", value: "5", description: "Tolerância do motor" });

    await acionarAcaoDaLinha(user, "Editar");

    expect(await screen.findByDisplayValue("Margem de adequação")).toBeInTheDocument();
    expect(screen.getByDisplayValue("5")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Tolerância do motor")).toBeInTheDocument();
  });
});

// Etapa 4 — chamadas de apiFetch agora passam pelas funções nomeadas de
// features/parametros/api/change-requests.api.ts; estes testes garantem que o
// endpoint/método/payload continuam idênticos ao comportamento pré-extração.
describe("ParametrosPage — chamadas de API dos fluxos de criar/editar/excluir (Etapa 4)", () => {
  it("Novo parâmetro: submit chama apiFetch com change_type=create e o payload preenchido", async () => {
    const user = userEvent.setup();
    renderWithParam({});

    await user.click(screen.getByRole("button", { name: /novo parâmetro/i }));
    await user.type(screen.getByPlaceholderText("Ex: mudança de Margem de Adequação"), "Novo Parametro X");
    await user.type(screen.getByPlaceholderText("Ex: valor do texto"), "42");
    await user.type(screen.getByPlaceholderText("Para que serve este parâmetro?"), "Descricao teste");
    await user.click(screen.getByRole("button", { name: "Solicitar Criação" }));

    expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/parametros/change-requests", {
      method: "POST",
      body: JSON.stringify({
        change_type: "create",
        proposed_payload: { chave: "Novo Parametro X", tipo: "string", valor: "42", descricao: "Descricao teste" },
        justification: "Criação de novo parâmetro solicitada via painel",
      }),
    });
  });

  // A fronteira com a API é o ponto sensível da máscara pt-BR: a tela mostra
  // vírgula, o servidor recebe ponto. Se esta conversão sumir, o parâmetro é
  // gravado com um valor que o backend não sabe ler — e nada na tela denuncia.
  //
  // O fluxo escolhido é o de EDIÇÃO porque ele já entra com o tipo resolvido
  // (`type: "float"` → `mappedType: "float"`), sem depender de dirigir o Select
  // do Radix em jsdom.
  it("valor decimal vai para a API com ponto, mesmo digitado com vírgula", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithParam({ type: "float", value: "5.5" });

    await acionarAcaoDaLinha(user, "Editar");

    // Ida: o valor da API (ponto) aparece na tela com vírgula.
    const campoValor = await screen.findByLabelText("Valor");
    expect(campoValor).toHaveValue("5,5");

    await user.clear(campoValor);
    await user.type(campoValor, "1234,56");
    // Máscara: milhar com ponto na exibição.
    expect(campoValor).toHaveValue("1.234,56");

    await user.click(screen.getByRole("button", { name: "Salvar Alterações" }));

    const chamada = apiFetchMock.mock.calls.find(
      ([rota]) => typeof rota === "string" && rota.includes("change-requests"),
    );
    expect(chamada).toBeDefined();
    // `body` vai como string JSON (ver change-requests.api.ts).
    const enviado = JSON.parse(chamada?.[1]?.body as string);
    // Volta: ponto decimal, sem separador de milhar.
    expect(enviado.proposed_payload.valor).toBe("1234.56");
  });

  it("Editar: submit chama apiFetch com change_type=update, parameter_id e os valores pré-preenchidos", async () => {
    const user = userEvent.setup();
    renderWithParam({ id: 7, name: "Margem de adequação", type: "float", value: "5", description: "Tolerância do motor" });

    await acionarAcaoDaLinha(user, "Editar");
    await screen.findByDisplayValue("Margem de adequação");
    await user.click(screen.getByRole("button", { name: "Salvar Alterações" }));

    expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/parametros/change-requests", {
      method: "POST",
      body: JSON.stringify({
        change_type: "update",
        parameter_id: 7,
        proposed_payload: { chave: "Margem de adequação", tipo: "float", valor: "5", descricao: "Tolerância do motor" },
        justification: "Edição solicitada via painel",
      }),
    });
  });

  it("Excluir: submit chama apiFetch com change_type=delete e parameter_id", async () => {
    const user = userEvent.setup();
    renderWithParam({ id: 9, name: "Parametro a excluir" });

    await acionarAcaoDaLinha(user, "Excluir");
    await screen.findByText(/tem certeza que deseja excluir/i);
    await user.click(screen.getByRole("button", { name: "Confirmar Exclusão" }));

    expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/parametros/change-requests", {
      method: "POST",
      body: JSON.stringify({
        change_type: "delete",
        parameter_id: 9,
        justification: "Exclusão solicitada via painel",
      }),
    });
  });
});
