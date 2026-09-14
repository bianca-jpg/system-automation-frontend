"use client";

import {
  DataTableSkeleton,
  MetricGridSkeleton,
} from "@/shared/ui/composite/skeletons";

/**
 * Esqueletos da tela de Parâmetros. São dois blocos independentes porque as duas
 * áreas de dados da tela têm alcances de permissão diferentes: a tabela só
 * existe a partir de gestor (`Can minLevel={30}`), o "Resumo da Aplicação" é de
 * todos. Cada bloco carrega a própria semântica de carregando — assim quem não
 * enxerga a tabela também não ouve "carregando" de algo que nunca vai chegar.
 *
 * O cabeçalho da página e o título do resumo são texto fixo: continuam reais, no
 * molde do `manager-route-loading` do Ara.
 */

const MENSAGEM_TABELA = "Carregando parâmetros...";
const MENSAGEM_RESUMO = "Carregando indicadores do resumo...";

/**
 * Tabela de parâmetros — espelha o `DynamicTable` do design system, que é a
 * tabela real desde a migração:
 *
 * - A faixa do topo do cartão NÃO é mais título + descrição (esses viraram
 *   texto fixo, fora do cartão, e não carregam): é a barra de ferramentas do
 *   DynamicTable — campo de busca `h-12` de cantos `rounded-2xl` e, embaixo, a
 *   linha "Mostrando N registros".
 * - O cartão do DynamicTable usa o `variant` PADRÃO do Card (sem sombra), daí
 *   `elevated={false}` — com sombra, a moldura piscaria na troca.
 * - 7 colunas: Parâmetro, Tipo, Valor atual, Limites/Opções, Descrição, Status
 *   e Ações (o menu "..." da linha, centralizado).
 * - O rodapé de paginação (`PaginationControls` no `footerRow` da
 *   `ParametrosTable`) fica DENTRO da moldura e é sempre renderizado — daí
 *   `showPagination`. Sem ele a tela pularia a altura da faixa quando os dados
 *   chegassem.
 */
export function ParametrosTableSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={MENSAGEM_TABELA}
    >
      <span className="sr-only">{MENSAGEM_TABELA}</span>
      {/* O esqueleto é decorativo: sem isso o leitor de tela varre dezenas de
          caixas vazias antes de chegar ao conteúdo. */}
      <div aria-hidden="true">
        {/* `showToolbar` é o prop que a própria biblioteca oferece para tabelas
            migradas ao DynamicTable — o mesmo que o esqueleto de usuários usa.
            Reconstruir a geometria da barra à mão aqui deixaria as duas telas
            fora de sincronia no dia em que o topo do DynamicTable mudasse. */}
        <DataTableSkeleton
          rows={5}
          columns={7}
          elevated={false}
          showHeader={false}
          showToolbar
          showPagination
          actionsColumnAlign="center"
        />
      </div>
    </div>
  );
}

/**
 * Indicadores do "Resumo da Aplicação": os dois `MetricCard` (Adequação e
 * Segurança CD), na mesma grade e com a legenda de apoio que os cartões reais
 * têm embaixo do valor.
 */
export function ParametrosResumoCardsSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={MENSAGEM_RESUMO}
    >
      <span className="sr-only">{MENSAGEM_RESUMO}</span>
      <div aria-hidden="true">
        <MetricGridSkeleton cards={2} showDescription />
      </div>
    </div>
  );
}
