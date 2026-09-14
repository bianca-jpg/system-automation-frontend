import {
  DataTableSkeleton,
  PageHeaderSkeleton,
} from "@/shared/ui/composite/skeletons";
import { PageShell } from "@/shared/ui/primitives/page-shell";

// Não usa o `PageLoader` do design system porque ele renderiza um <main>, e o
// loading.tsx deste grupo cai DENTRO do <main> do AppShell — aninhar <main> é
// HTML inválido.
//
// Fica dentro do `PageShell` (a mesma largura e os mesmos gutters das páginas) e
// segue o molde do `manager-route-loading` do Ara: cabeçalho + bloco de dados,
// nas mesmas medidas das telas reais, para a troca de rota não deslocar nada.
//
// Como este arquivo serve TODAS as rotas do grupo `(app)`, ele não sabe qual
// tela vem a seguir — daí a forma neutra (cabeçalho + tabela) e o cabeçalho
// esqueletizado, que é a única situação em que o título é desconhecido. Dentro
// das telas, o carregamento é o esqueleto específico de cada uma
// (`parametros-page-skeleton`, `usuarios-page-skeleton`, `orders-list-skeleton`,
// `dashboard-overview-skeleton`), que já conhece a forma final do conteúdo.
export default function Loading() {
  return (
    <PageShell
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando conteúdo..."
    >
      <span className="sr-only">Carregando conteúdo...</span>

      {/* Esqueleto é decorativo — o anúncio para o leitor de tela é o texto
          acima. O `gap-6` repete o do PageShell, já que aqui os blocos ficam
          dentro de um mesmo container em vez de soltos na página. */}
      <div aria-hidden="true" className="flex flex-col gap-6">
        {/* `withBackButton={false}`: este arquivo serve todas as rotas do grupo
            e a home (Visão Geral) não tem botão de voltar — `defaultBackHref`
            é `null` no registro de metadata. Desenhar o círculo aqui deslocaria
            o título ~48px ao entrar nela. */}
        <PageHeaderSkeleton className="mb-0" withBackButton={false} />
        <div>
          {/* `showHeader={false} showToolbar`: as tabelas do app migraram para o
              `DynamicTable`, que tira o título de dentro da moldura e põe a
              barra de busca no topo do cartão. Manter a forma antiga aqui faria
              a tela saltar na transição de rota. */}
          <DataTableSkeleton rows={6} columns={6} showHeader={false} showToolbar />
        </div>
      </div>
    </PageShell>
  );
}
