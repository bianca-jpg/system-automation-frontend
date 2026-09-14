import { EvolucaoFaturamento, Order } from '@/shared/types/models';
import type { DashboardOrderStats } from '@/features/pedidos/api/pedidos.api';

export type OrderStats = DashboardOrderStats;

export const EMPTY_ORDER_STATS: OrderStats = {
  totalOrdersCount: 0,
  liberadosCount: 0,
  editingOrderCount: 0,
  editingProductCount: 0,
  orComAdequacaoCount: 0,
  orSemAdequacaoCount: 0,
  processadoErpCount: 0,
  pecasBloqueadasCount: 0,
  pecasBloqueadasPercent: 0,
  bloqueadosSemCreditoCount: 0,
  liberadosPercent: 0,
  bloqueadosSemCreditoPercent: 0,
};

export interface EvolucaoSeriePoint {
  colecao: number;
  planejado: number;
  distribuido: number;
}

// Apura contagens por status + peças bloqueadas por falta de estoque, POR
// PRODUTO (não por pedido): para cada código somamos a demanda (qty) dos
// pedidos ABERTOS E LIBERADOS (com crédito, ainda não processados) e
// subtraímos o estoque disponível do produto — o que faltar é faturamento
// impedido por estoque. Só 'Liberados para faturamento' geram demanda:
// pedidos sem crédito, ORs já geradas e processados no ERP não seriam
// faturados por estoque agora, então não contam. O estoque é compartilhado
// entre pedidos, então deduplicamos as linhas repetidas (mesmo código+nome)
// ao somar o disponível.
export function computeOrderStats(
  orders: Order[],
  selectedChannel: 'Todos' | 'Franquia' | 'Multimarca',
): OrderStats {
  let lib = 0, orCom = 0, orSem = 0, blkEst = 0, blkCred = 0, procErp = 0;

  const demandaPorProduto: Record<string, number> = {};
  const estoquePorProduto: Record<string, number> = {};
  const linhasEstoqueVistas = new Set<string>();
  const pedidosEmEdicao = new Set<string>();
  const produtosEmEdicao = new Set<string>();

  for (const o of orders) {
    if (selectedChannel !== 'Todos') {
      const normalizedChannel = selectedChannel.toLowerCase().replace(/s$/, '');
      const orderChannel = (o.canal || '').toLowerCase().replace(/s$/, '');
      if (normalizedChannel !== orderChannel) continue;
    }
    if (o.status === 'Liberados para faturamento') lib++;
    else if (o.status === 'OR com adequação') orCom++;
    else if (o.status === 'OR sem adequação') orSem++;
    else if (o.status === 'Bloqueado Estoque') blkEst++;
    else if (o.status === 'Bloqueado sem crédito') blkCred++;
    else if (o.status === 'Processado no ERP') procErp++;

    if (o.status === 'OR com adequação' || o.status === 'OR sem adequação') {
      pedidosEmEdicao.add(String(o.id));
      for (const item of o.items) produtosEmEdicao.add(`${o.canal}|${item.code}`);
    }

    // Só pedidos abertos e liberados (com crédito, ainda não processados)
    // geram demanda de estoque — são os únicos candidatos reais a faturamento
    // limitado por estoque. O estoque do produto entra uma única vez.
    const geraDemanda = o.status === 'Liberados para faturamento';
    for (const item of o.items) {
      if (geraDemanda) {
        demandaPorProduto[item.code] = (demandaPorProduto[item.code] || 0) + item.qty;
      }
      const chaveLinha = `${item.code}|${item.name}`;
      if (!linhasEstoqueVistas.has(chaveLinha)) {
        linhasEstoqueVistas.add(chaveLinha);
        estoquePorProduto[item.code] = (estoquePorProduto[item.code] || 0) + (item.stock || 0);
      }
    }
  }

  let pecasBloqueadas = 0, pecasLiberadas = 0;
  for (const code in demandaPorProduto) {
    const demanda = demandaPorProduto[code];
    pecasLiberadas += demanda;
    pecasBloqueadas += Math.max(0, demanda - (estoquePorProduto[code] || 0));
  }

  const total = lib + orCom + orSem + blkEst + blkCred;
  const pctT = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  return {
    totalOrdersCount: total,
    liberadosCount: lib,
    editingOrderCount: pedidosEmEdicao.size,
    editingProductCount: produtosEmEdicao.size,
    orComAdequacaoCount: orCom,
    orSemAdequacaoCount: orSem,
    processadoErpCount: procErp,
    pecasBloqueadasCount: pecasBloqueadas,
    pecasBloqueadasPercent: pecasLiberadas > 0 ? Math.round((pecasBloqueadas / pecasLiberadas) * 100) : 0,
    bloqueadosSemCreditoCount: blkCred,
    liberadosPercent: pctT(lib),
    bloqueadosSemCreditoPercent: pctT(blkCred),
  };
}

// Série de evolução por coleção (planejado × distribuído), filtrada pelo
// canal selecionado no dashboard (client-side): 'Todos' soma Franquia+Multimarca.
export function computeEvolucaoSerie(
  evolucaoFaturamento: EvolucaoFaturamento[],
  selectedChannel: 'Todos' | 'Franquia' | 'Multimarca',
): EvolucaoSeriePoint[] {
  const porColecao = new Map<number, { planejado: number; distribuido: number }>();
  for (const p of evolucaoFaturamento) {
    if (selectedChannel !== 'Todos' && p.canal !== selectedChannel) continue;
    const acc = porColecao.get(p.colecao) || { planejado: 0, distribuido: 0 };
    acc.planejado += p.planejado;
    acc.distribuido += p.distribuido;
    porColecao.set(p.colecao, acc);
  }
  return Array.from(porColecao.entries())
    .map(([colecao, v]) => ({ colecao, ...v }))
    .sort((a, b) => a.colecao - b.colecao);
}

export const formatCompact = (v: number) =>
  v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000 ? `R$ ${(v / 1_000).toFixed(0)}K`
  : `R$ ${v.toFixed(0)}`;
