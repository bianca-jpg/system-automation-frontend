# Design System

Toda a fundação visual do System Automation vem do **design system compartilhado da
do projeto** (`@system-automation/design-system`) — o mesmo consumido pelas demais aplicações da
empresa. O app não tem paleta, escala tipográfica, raio, sombra ou espaçamento
próprios: se algo precisa mudar visualmente, muda no design system, não aqui.

## Onde ele vive

| Local | Papel |
|-------|-------|
| `design-system/` (neste repo) | **Vendor** — cópia versionada junto ao app, resolvida por `file:./design-system` |
| Repositório `design-system` | **Referência compartilhada** — fonte da verdade |

O vendor é um **espelho byte a byte** da referência. Isso mantém o build
reprodutível e o deploy no Amplify independente de submódulo, ao custo de exigir
um sync manual.

### Regra

> **Nunca edite nada dentro de `design-system/`.**

Qualquer alteração local é perdida no próximo sync e quebra a paridade com as
outras aplicações. Precisou de um componente ou token novo? Abra a mudança no
repositório do design system e sincronize.

### Como sincronizar

Com o repositório da referência clonado ao lado do workspace
(`../design-system` a partir da raiz do workspace):

```bash
tar -C ../design-system --exclude=./.git --exclude=./node_modules --exclude=./storybook-static --exclude=./tsconfig.tsbuildinfo -cf - . | tar -C design-system -xf -
```

Depois do sync:

1. `git status --short design-system` — revise o que entrou.
2. Confira se `design-system/package.json` ganhou `peerDependencies` novas e
   reflita em `package.json` do app (ver abaixo).
3. `pnpm install`
4. `pnpm typecheck && pnpm lint && pnpm test && pnpm build`

`design-system/pnpm-workspace.yaml` é o **único** arquivo local que não existe na
referência (configura `allowBuilds` para rodar scripts do DS isoladamente).
Preserve-o ao sincronizar.

## Contrato de consumo

O design system documenta o contrato em
[`design-system/docs/CONSUMER_SETUP.md`](../design-system/docs/CONSUMER_SETUP.md).
Como este app cumpre cada item:

| Item do contrato | Onde |
|---|---|
| `@system-automation/design-system` instalado | `package.json` → `file:./design-system` |
| `transpilePackages` inclui o pacote | `next.config.ts` |
| Qualidade 100 dos logos compartilhados habilitada | `next.config.ts` → `images.qualities` |
| `globals.css` importado uma vez | `app/globals.css` |
| `ThemeInitScript` no `<head>` | `app/layout.tsx` |
| `CentralThemeProvider` envolvendo o app | `app/layout.tsx` |
| Tokens e componentes vindos do pacote | `shared/ui/` (camada adaptadora) |

### `@source` é obrigatório

O design system carrega o Tailwind com `@import "tailwindcss" source(none)` para
não vazar candidatos de utilitário do catálogo nos bundles dos apps. Isso
**desliga a detecção automática de fontes de classe**, então `app/globals.css`
registra as do app explicitamente:

```css
@source "../app";
@source "../features";
@source "../widgets";
@source "../shared";
```

Se uma pasta nova passar a conter `className`, adicione o `@source` — sem ele as
classes daquela pasta simplesmente não geram CSS e os elementos ficam sem estilo.

### Peer dependencies

O barrel `index.ts` do design system reexporta tudo, então o app precisa resolver
os peers mesmo dos componentes que não usa (`Form` → `react-hook-form`,
`FeatureBoundary` → `react-error-boundary`). Eles estão declarados em
`package.json`.

`lucide-react` fica travado na mesma faixa do design system (`^0.546.0`) de
propósito: faixas divergentes fazem o pnpm instalar duas cópias e duplicam os
ícones no bundle.

## Fonte

Satoshi, em três pesos estáticos — **400 / 500 / 700**. Não há eixo variável:
`font-semibold` (600) e `font-black` (900) não existem e caem em síntese do
navegador, com resultado ruim. Use `font-normal`, `font-medium`, `font-bold`.

O design system é dono de `--font-sans` e `--font-heading` e das fallbacks; o
binário fica no app (`public/fonts/*.woff2`), carregado por `lib/fonts.ts` com
`next/font/local`, que injeta `--font-satoshi`, faz preload e ajusta as métricas
da fallback para eliminar FOUT/CLS.

Ao sincronizar o design system, confira se os `.woff2` em
`design-system/public/fonts/` mudaram e recopie para `public/fonts/`.
Faça o mesmo com os assets de marca consumidos pelos componentes compartilhados
em `design-system/public/assets/`, preservando os nomes dos arquivos em
`public/assets/`.

## Tema

Dois eixos **ortogonais**, ambos geridos pelo design system:

| Eixo | Aplicado em | Storage | Valores |
|---|---|---|---|
| Modo | classe `.light` / `.dark` no `<html>` | `theme` | `light`, `dark`, `system` |
| Tema de cor | atributo `data-theme` no `<html>` | `color-theme` | `default` (padrão), `blue-ocean`, `purple-rain`, `sweet-pie` |

`ThemeInitScript` resolve os dois no `<head>`, antes da primeira pintura, evitando
flash de tema. `CentralThemeProvider` mantém o estado, reage a mudanças de
preferência do SO e em outras abas, e já monta o `Toaster` — não monte outro.

Para ler ou trocar o tema em um componente, use o `useTheme` do design system
(`theme`, `setTheme`, `resolvedTheme`, `colorTheme`, `setColorTheme`).

## Tokens

Sempre utilitário semântico, nunca hex ou paleta crua — token semântico resolve
claro e escuro sozinho, `bg-blue-50` não.

**Superfícies:** `bg-background`, `bg-background-elevated`, `bg-card`, `bg-surface`,
`bg-surface-hover`, `bg-muted`, `bg-popover`, `bg-sidebar`
**Texto:** `text-foreground`, `text-card-foreground`, `text-muted-foreground`,
`text-secondary-foreground`
**Status** (três níveis cada — fundo suave, texto sobre suave, cor forte):
`bg-info` / `text-info-text` / `info-foreground-strong`, e igualmente para
`success`, `warning`, `destructive`
**Bordas** — utilitários dedicados, não `border-<cor>`: `ds-border-card`,
`ds-border-divider`, `ds-border-info`, `ds-border-success`, `ds-border-l-warning`, …
**Foco:** `ds-focus-ring` / `ds-focus-ring-inset`, sempre com o variant que possui
o foco (`focus-visible:ds-focus-ring`)
**Gráficos:** `--analytics-chart-*` e `--brand-chart-1..8`

A definição completa está em `design-system/tokens/*.css` e nas stories de tokens
do Storybook do design system.

## Gráficos

Os gráficos do dashboard usam o `HorizontalBarChart` do design system — não há
mais SVG desenhado à mão no app. Duas particularidades da API:

- `value` é **percentual** (0–100), não valor absoluto. Converta antes de passar.
- Com `showValues` (padrão `true`) o componente rotula cada barra com o próprio
  percentual. Quando o número que importa é outro (contagem, moeda), use
  `showValues={false}` e leve o valor real no `name`, como faz
  `faturamento-chart-card.tsx`.

As cores vêm dos nomes aceitos pelo componente (`blue`, `sky`, `cyan`, `indigo`,
`slate`, `emerald`, `rose`, `amber`), que mapeiam internamente para
`--analytics-chart-*` e acompanham modo e `data-theme`. Não passe cor literal.

O design system **não** tem donut de múltiplos segmentos nem gráfico de barras
verticais de série temporal. `RadialChart` é anel de progresso de valor único.

## Problema conhecido no design system: `duration-*`

`design-system/tokens/motion.css` declara `--duration-fast/standard/slow` num
bloco `@theme inline`, mas no Tailwind 4 o utilitário `duration-*` resolve pelo
namespace `--transition-duration-*`. Namespace errado ⇒ **`duration-fast`,
`duration-standard` e `duration-slow` não geram CSS nenhum** e as transições
caem no padrão de 150ms.

Isso afeta o próprio design system (`button/variants.ts`, `badge/variants.ts`,
`pressable`, `back-button`, `skip-link` usam essas classes mortas). A correção
definitiva é renomear para `--transition-duration-*` **no repositório do design
system** — não aqui.

Enquanto isso, no app use a forma de valor arbitrário referenciando o token:

```tsx
className="transition-colors duration-[var(--motion-duration-fast)] ease-standard"
```

Ela gera CSS de verdade, mantém o valor vindo do token e ainda respeita o
override de `prefers-reduced-motion` (que zera as durações). `ease-standard`
funciona normalmente — o namespace `--ease-*` é o correto.

## Camada adaptadora

`features/` e `widgets/` **não** importam `@system-automation/design-system` direto. O acesso
passa por `shared/ui/`:

- `shared/ui/primitives/<nome>.tsx` — reexport de uma linha do design system
- `shared/ui/<nome>.ts` — facades por componente
- `shared/ui/index.ts` — barrel com os componentes de formulário e compostos
- `shared/ui/composite/` — composições próprias do app sobre primitivos do DS

Isso mantém um único ponto de troca quando o design system renomeia ou move algo.
Precisou de um componente do DS ainda sem adaptador? Crie o reexport de uma linha
em `shared/ui/primitives/` e importe por ele.

### Tabelas de dados

Tabela de dados sai de `shared/ui/primitives/dynamic-table` (`DynamicTable` +
os tipos `ColumnConfig`, `Action`, `DynamicTableSortingState`), **não** dos
primitivos `Table`/`TableHead`/`TableRow`. O adaptador reexporta só os tipos que
o app usa hoje; se uma tela passar a usar `filters`, acrescente `FilterConfig` na
mesma linha. O `DynamicTable` já entrega, configurado por props:

| O que | Como |
|---|---|
| Ordenação por clique no cabeçalho (setas asc/desc) | `sortable` na coluna — ligado por padrão; desligue com `sortable: false` |
| Ordenação global em fonte paginada | `sorting` + `onSortingChange` + `manualSorting`; o servidor devolve a página já ordenada |
| Ordem correta de valor formatado (data pt-BR, número, rótulo derivado) | `sortAccessor` |
| Busca client-side | `searchKeys` + `filterAccessor` na coluna |
| Filtros de funil | `filters` |
| Menu "..." de ações por linha | `actions` — com `show` (visibilidade por linha), `disabled` e `disabledReason` |
| Clique/Enter na linha | `onRowClick` |
| Estado vazio, esqueleto de carregamento e contagem de registros | `emptyMessage`, `loading`, rodapé próprio |
| Rodapé de "carregar mais" | `footerRow` (+ `hideEndMessage`) — o `DynamicTable` **não** pagina sozinho; quem fatia é o chamador |

### Paginação: páginas administrativas e listas operacionais

Use páginas numeradas quando a pessoa precisa localizar, comparar ou retornar a
uma posição exata: Gestão de Usuários, solicitações de parâmetros, histórico de
decisões e Parâmetros. O composite `PaginationControls` usa apenas botões do
design system e mostra uma única contagem autoritativa (`A–B de M`).

Use `LoadMoreButton` nas listas operacionais contínuas: pedidos aguardando,
edição, histórico de pedidos, alertas, comunicações, lookup e detalhes lazy de
clientes. No app ele vem montado em dois pedaços:

- `features/pedidos/model/use-cursor-resource.ts` — produção: busca páginas
  keyset de 25, preserva cursores e o último dado bom somente para refresh da
  mesma query, e atualiza toda a janela já carregada após uma revisão realtime.
- `shared/hooks/useLoadMore.ts` — compatibilidade de fixtures/testes: janela
  crescente sobre uma lista já em memória. Não deve substituir paginação do
  servidor na aplicação.
- `shared/ui/composite/LoadMoreFooter.tsx` — a contagem "N de M" (`aria-live`)
  e o `LoadMoreButton`. O estado `loading` e o spinner são sempre os nativos do
  design system. Quando esse rodapé existe, a contagem local do `DynamicTable`
  deve ser ocultada com `hideResultsCount` para não exibir dois números.

Usam o padrão: as duas tabelas da aba "abertos" (via `footerRow`), o Histórico
por produto e os dois cartões da aba "alertas" (`PriorityAlertsCard`,
`RecentCommunicationsCard`). O rodapé só aparece quando o envelope informa um
segundo lote.

Os primitivos `Table*` continuam exportados para o que o `DynamicTable` não
cobre — agrupamento de linhas com subtotais e colunas geradas dinamicamente. Em
fontes paginadas, `manualSorting` impede que o `DynamicTable` reordene somente o
lote local; `onSortingChange` troca a query e o cursor no servidor. O Histórico
continua com `Table*` por causa do layout específico, mas também lê a projeção
global `GET /api/v1/pedidos/produtos?stage=historico` e usa cursor keyset.
Fora esses casos, montar tabela à mão duplica comportamento que já existe.

Nas listas da aba "abertos", busca, agregação e ordenação são globais no
backend. O frontend mantém apenas as páginas solicitadas; contadores e totais
vêm do envelope/projeção, e o rodapé mostra "N de M". O `AppDataProvider`
carrega o resumo SQL somente nas rotas que realmente exibem o dashboard.

Quando a busca precisa filtrar uma entidade DIFERENTE da linha exibida, use
`searchValue`/`onSearchChange` (caixa do DS, filtro/query do widget) em vez de
`searchKeys`. É o caso das listas por produto: o servidor pode casar código,
nome, pedido ou cliente sem baixar todo o conjunto para o browser.

> Em teste (jsdom) as linhas só aparecem por causa do polyfill de
> `offsetWidth`/`offsetHeight` em `vitest.setup.ts`: o virtualizador mede o
> container de rolagem por essas propriedades e o jsdom devolve zero para todas
> elas, o que renderizaria um `<tbody>` vazio.

## Formulários: máscaras e placeholders (pt-BR)

O app é pt-BR: vírgula decimal, ponto de milhar. **A API sempre recebe ponto
decimal** — a vírgula existe só na exibição.

### Máscaras

Documento, telefone e moeda vêm do design system (`Mask.format` em
`design-system/lib/masks.ts`), que cobre `cpf`, `cnpj`, `phone`, `document`
(CPF ou CNPJ pelo tamanho) e `currency`. Use `Mask.format` diretamente
(`import { Mask } from "@system-automation/design-system/lib"`) — não reimplemente
máscara que o DS já tem.

O que o DS **não** cobre é número solto (a máscara de moeda força duas casas e o
prefixo R$). Para isso existe `shared/lib/format/numero-br.ts`:

| Função | Uso |
|---|---|
| `mascararNumeroBr(valor, { casasDecimais?, inteiro? })` | no `onChange`, formata o que o usuário digita |
| `paraEnvio(valorExibido)` | **antes do submit** — devolve ponto decimal, sem milhar |
| `paraExibicao(valorDaApi)` | ao abrir um formulário de edição com dado existente |

Regra assimétrica, e ela é intencional: na **entrada** o ponto pode ser decimal
(quem cola `1234.56` de outro sistema não perde a casa); na **saída** só a
vírgula é decimal e todo ponto é milhar, porque `paraEnvio` consome o texto que
a própria máscara produziu. Tratar ponto como decimal na saída faria `1.234`
(mil duzentos e trinta e quatro) virar `1.234` — erro de três ordens de
grandeza indo para a API sem nada aparecer na tela.

Campo numérico usa `type="text"` com `inputMode="decimal"` (ou `"numeric"` para
inteiro), **não** `type="number"`: o input nativo guarda ponto decimal no DOM e
ignora a vírgula digitada.

A conversão de ida e volta é coberta por `numero-br.test.ts` e por um teste de
integração em `app/(app)/parametros/page.test.tsx` que segue o valor da tela até
o corpo da requisição.

### Placeholders

Todo campo de texto tem placeholder, e o exemplo segue a convenção pt-BR —
`Ex: 10,5`, nunca `Ex: 10.5`. Placeholder é dica de formato, não rótulo: o
`Label` continua obrigatório e associado por `htmlFor`.
