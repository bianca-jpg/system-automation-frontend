type OrderStatus = 'Liberados para faturamento' | 'OR com adequação' | 'OR sem adequação' | 'Bloqueado Estoque' | 'Bloqueado sem crédito' | 'Processado no ERP';

type CDStatus = 'Aprovado' | 'Regular' | 'Não enviado' | 'Pendente Adequação';

export interface ProductItem {
  name: string;
  qty: number;
  code: string;
  unitValue: number;
  cdStatus: CDStatus;
  stock?: number;
  sizes?: Record<string, number>;
}

// Agregado do orçamento de ±5% do PEDIDO INTEIRO (`nr_pedido`, todos os
// produtos/clientes daquele pedido somados) — não é o produto isolado da tela
// (D-12). Só vem preenchido em `Order.orcamentoPedido` quando
// `adequacaoAplicada === false` ("sem adequação"); o backend não omite a
// chave quando não se aplica, ele manda `null` (serialização HTTP não exclui
// nulos), então qualquer teste de presença deve checar veracidade do valor,
// nunca existência de chave. Todos os campos são inteiros de peças.
export interface OrcamentoPedido {
  nrPedido: number;
  limiteAdicao: number;
  consumidoAdicao: number;
  restanteAdicao: number;
  limiteCorte: number;
  consumidoCorte: number;
  restanteCorte: number;
}

export interface Order {
  id: string; // e.g., "#14789"
  client: string;
  value: number;
  originalValueBeforeAdequacao: number;
  status: OrderStatus;
  motivo: string;
  date?: string;        // data real (dt_emissao); ausente => exibir "—"
  deliveryDate?: string; // sem fonte real hoje => exibir "—"
  canal: 'Franquia' | 'Multimarca';
  items: ProductItem[];
  alert?: string;
  adequacaoAplicada: boolean;
  adequacaoValorAjustado: number; // The 5% adjustment differential
  pedidoAlterado?: boolean;
  originalItems?: ProductItem[];
  /** Ver comentário em `OrcamentoPedido`. Presente só em "sem adequação", pode chegar `null`. */
  orcamentoPedido?: OrcamentoPedido | null;
  // Ciclo de vida do faturamento — AUTORITATIVO do back-end (persistido no
  // Postgres, sobrevive a nova sessão). O front confia nesses campos, não os fabrica.
  // 1. Recebido: status 'Liberados para faturamento' e SEM processedAt → só pode
  //    ser tratado pelos botões "Efetuar OR"; não é editável manualmente.
  // 2. Em edição: processedAt definido (instante em que a OR foi gerada no back) →
  //    editável por 24h e disponível para aprovação manual. Fica na aba Pedidos.
  // 3. Aprovado: aprovado === true (manual via /aprovar OU 24h automáticas) → Histórico.
  processedAt?: number; // epoch ms da geração da OR no back-end (created_at); início das 24h
  aprovado?: boolean;   // aprovação final (manual ou automática por 24h) → Histórico
  approvedAt?: number;  // epoch ms da aprovação (manual: aprovado_em; automática: processedAt + 24h)
}

// Ponto da série de evolução de faturamento por coleção × canal (dashboard).
export interface EvolucaoFaturamento {
  colecao: number;
  canal: 'Franquia' | 'Multimarca';
  planejado: number;
  distribuido: number;
}

export interface Communication {
  id: string;
  type: 'WhatsApp' | 'Email';
  status: 'Pendente' | 'Enviado' | 'Falhou' | 'Incerto';
  time: string;
  content: string;
  recipient: string;
}

export type AlertCategory =
  | 'linx'
  | 'acesso'
  | 'payload'
  | 'performance'
  | 'divergencia'
  | 'geracao_or'
  | 'anomalia_credito'
  | 'anomalia_estoque'
  | 'adequacao'
  | 'fila_processamento';

export interface OrderAlert {
  id: string;
  orderId?: string;
  category?: AlertCategory | string;
  type: 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  time: string;
  affectedCount?: number;
  // Distingue linha de negócio (projeção de pedido) de aviso técnico automático de
  // integração (banco de dados instável ou estoque do Databricks indisponível), cujos
  // title/message já chegam prontos do backend, sem tradução necessária no front.
  kind?: 'negocio' | 'integracao';
}


// Parameter/ParameterChangeRequest vivem em `entities/parametro/model/types` e
// se importam de lá. NÃO reexporte tipos de `entities/` por aqui: `shared/` é a
// camada mais baixa da FSD e um reexport nesse sentido inverte a direção de
// import enquanto continua parecendo válido para o ESLint.
