# Arquitetura Frontend — System Automation

Alinhado ao portal fornecedor (FSD + DDD conceitual).

## Camadas

```text
app → widgets → features → entities → shared
lib/api → infrastructure HTTP
```

| Pasta | Papel |
|-------|--------|
| `entities/` | Tipos e regras puras |
| `features/` | Casos de uso + UI |
| `widgets/` | Shells (sidebar, header, dashboard) |
| `shared/` | Config, providers, adaptadores de UI, libs |
| `lib/api/` | Cliente HTTP |
| `design-system/` | Vendor do design system compartilhado (espelho, não editar) |

## Camada visual

A fundação visual inteira — tokens, componentes, tipografia, tema — vem do
design system compartilhado (`@system-automation/design-system`), vendorizado em
`design-system/`. O app acessa tudo pela camada adaptadora `shared/ui/`:
`features/` e `widgets/` nunca importam o pacote direto.

`app/globals.css` é a única entrada de CSS e o app não define tokens próprios.
Ver [Design System](design-system.md) para tokens, tema, fonte e o processo de
sincronização do vendor.

## Rotas

Definidas em `shared/config/routes.ts`. As páginas de negócio ficam sob
`app/(app)/` (visão-geral, pedidos, histórico, alertas, usuários, parâmetros) e
são protegidas por auth (o `proxy.ts` redireciona para `/login`).

## Consumo da API

Todo o acesso ao back-end passa pelo `apiFetch` (`lib/api/http-client.ts`), que
anexa automaticamente o header `Authorization: Bearer <token>`. A base é
`NEXT_PUBLIC_API_URL` (padrão `http://localhost:8000`).

O **`AppDataProvider`** (`features/pedidos/model/app-data-provider.tsx`) mantém
apenas preferências compartilhadas e recursos pequenos, carregados pela rota que
os consome. Não existe mais leitura global de pedidos nem cache de dados de
negócio em `sessionStorage`:

| Rota | Recursos do provider |
|---|---|
| `/visao-geral` | `/pedidos/resumo`, `/pedidos/evolucao-faturamento` |
| `/pedidos` | `/pedidos/resumo` |
| `/parametros` | `/parametros` |
| `/historico`, `/alertas`, `/usuarios` | — |

As filas de `/pedidos` usam `usePedidosQueues`: aguardando e edição possuem
busca, cursor, total e estado de erro independentes. `/alertas` usa
`useAlertsCommunications`, também com cursores separados para alertas e
comunicações. O histórico usa a mesma projeção por produto e cursor keyset. Nenhum desses
fluxos baixa uma coleção ilimitada para depois paginar no navegador.

Cada item de pedido ou histórico já traz seu `stock` direcionado. O resumo usa a
forma enxuta padrão de `GET /api/v1/pedidos/resumo`; o frontend não solicita o
legado `includeStock=true`, que materializa o mapa global de estoque.

Os hooks de recurso abortam a requisição anterior quando a consulta/filtro muda,
ignoram respostas atrasadas e preservam o último dado válido durante uma falha
de atualização. Refresh manual pós-write e revisão realtime da mesma consulta
compartilham um single-flight; um evento concorrente vira no máximo um follow-up,
sem abortar a confirmação da ação. Revisões realtime invalidam somente o tópico
consumidor; o tópico é marcado como lido após o REST correspondente concluir,
usando a revisão e a geração de resync capturadas para não apagar um evento que
chegou durante o refetch.

## Gestão de usuários e parâmetros

A tela `/usuarios` consome `GET /api/v1/parametros/change-requests` e injeta as
solicitações **pendentes** como linhas na `UserManagementTable` (status
`SOLICITAÇÃO`); as demais entram no histórico (`ParameterHistoryTable`).
Aprovar/rejeitar chama `POST /api/v1/parametros/change-requests/{id}/approve`
ou `/reject` e recarrega a lista — sem necessidade de F5.

Usuários, solicitações pendentes, histórico de decisões e a tabela de
parâmetros usam paginação numerada no servidor (`page`, `pageSize`, `search`,
`sort`, `order`). Cada tabela busca somente a página visível; busca ou ordenação
nova sempre volta para a página 1. Esses recursos administrativos não ficam no
`AppDataProvider`, evitando uma segunda carga global em memória.

A mesma tabela também lista os usuários reais cadastrados via
`GET /api/auth/users` (id, e-mail, papéis, confirmação de e-mail); editar o
papel de um usuário chama `PUT /api/auth/users/{id}/roles` e recarrega a
lista. Ambas as fontes (solicitações e usuários) são reais e paginadas — não há
mais dado mockado nem carregamento integral nessa tela.

## Filtros na tela

A regra depende do endpoint:

- `GET /api/v1/pedidos/produtos` exige `stage`, `channel`, `search`, `sort`,
  `order`, `cursor` e `pageSize`; responde
  `{ rows, total, pageSize, nextCursor, hasMore }`. `aguardando`, `edicao` e
  `historico` usam a mesma projeção agregada autoritativa. No filtro `Todos`, a
  identidade continua sendo `(code, channel)`: o mesmo código em Franquia e
  Multimarca gera duas linhas e nunca uma ação cruzada. O `total` desse envelope
  conta linhas de produto, não pedidos; contagens e confirmações de ações em
  lote usam exclusivamente métricas do resumo com a mesma semântica da etapa e
  ficam indisponíveis quando essa contagem autoritativa não existe.
- `statsByChannel.editingOrderCount` conta pedidos distintos com OR ativa na
  janela de 24 horas; `editingProductCount` conta as identidades
  `(productCode, channel)` dessa mesma projeção. Métricas históricas de OR não
  são usadas como substitutas para nenhum desses totais.
- `GET /api/v1/pedidos/produtos/clientes` carrega sob demanda os clientes de um
  produto e canal exatos, em páginas de 25. O envelope inclui `summary`
  autoritativo e cada linha inclui uma `version` opaca usada no PUT de grade.
- `GET /api/v1/pedidos/lookup` é a busca leve e paginada usada pelo modal de
  comunicação; ela não materializa os itens dos pedidos.
- `GET /api/v1/alertas` e `GET /api/v1/comunicacoes` usam o mesmo envelope de
  cursor.
- `POST /api/v1/comunicacoes` exige `Idempotency-Key` ASCII seguro de 8–128
  caracteres (`[A-Za-z0-9][A-Za-z0-9._:-]{7,127}`) e responde `202` após
  persistir na outbox; isso significa comunicação agendada, não e-mail entregue.
  O header `Location` identifica o recurso individual consultável.
  Replays mantêm a mesma chave e o feed acompanha `Pendente`, `Enviado`,
  `Falhou` ou `Incerto` pelas revisões do tópico `communications`. `Incerto`
  significa que o provedor pode ter aceitado a mensagem; a UI orienta não
  reenviar e solicitar verificação.
- `POST /api/v1/pedidos/processamentos` agenda a geração de OR como job durável
  e exige a mesma forma de `Idempotency-Key`. A resposta `202` não confirma a
  aplicação: a UI acompanha `GET /api/v1/pedidos/processamentos/{jobId}` em
  polling sequencial de 2–5 segundos, com jitter, timeout e cancelamento no
  unmount. Eventos realtime apenas antecipam a próxima consulta REST. Perda da
  resposta do POST reutiliza a mesma chave; perda do polling retoma o mesmo job;
  somente `failed` terminal com `retryable=true` permite uma nova
  submissão e uma nova chave. As filas e o resumo são relidos apenas após
  `succeeded`, pois a execução é checkpointada e não tem semântica all-or-none.
- `PUT /api/v1/pedidos/produtos/grades` aceita de 1 a 100 clientes em uma única
  transação all-or-nothing, com `expectedVersion`; não há chunk automático. A
  operação apenas redistribui tamanhos: a soma de cada cliente deve permanecer
  igual à quantidade já reservada. A ordem de `sizeKeys` do resumo é canônica e
  deve ser preservada. Edição/aprovação só são expostas no estágio `edicao`, para
  perfis autorizados e enquanto a janela absoluta de 24h continua aberta.
- `GET /api/v1/pedidos/resumo` retorna os agregados SQL do dashboard sem
  materializar o mapa global de estoque (`includeStock=false` por padrão).

As buscas enviadas ao backend são limitadas a 120 caracteres. O tamanho padrão
das páginas de cursor é 25; cursores são vinculados aos filtros e à ordenação.
Respostas ilimitadas ou envelopes inválidos são
tratados como erro de contrato, sem fallback para fatiamento local.

Os demais filtros ficam no `AppDataProvider` (context):

- `selectedChannel` — `Todos` | `Franquia` | `Multimarca`.
- `selectedMonthSimulated` — mês usado por `isAdequacaoActiveMonth` para
  ativar/inativar a adequação na tela. É somente leitura: o provider o resolve na
  montagem e não expõe setter.

## Adequação na tela

O seletor de coleção (`features/pedidos/ui/collection-selector.tsx`) é apenas
indicativo — exibe a coleção vigente, sem alternar entre coleções (ver
[Regra de coleção](colecao.md)). A adequação (+5%) é apresentada como ativa ou
inativa conforme `isAdequacaoActiveMonth`.

Os processamentos em lote enviam `mode` e o `channel` selecionado ao endpoint de
jobs duráveis. O resultado terminal contém apenas contagens bounded
(`plannedCount`, `appliedCount`, `deferredCount`, `blockedCreditCount`), sem
listas de itens nem dados pessoais.
