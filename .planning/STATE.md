---
gsd_state_version: 1.0
milestone: v1
milestone_name: Quick tasks (sem fase planejada)
status: executing
last_updated: "2026-09-09T15:05:00.000Z"
last_activity: 2026-09-09 -- Quick task 260909-gh7 concluida (aba Alertas passa a exibir os avisos tecnicos de integracao vindos do backend -- banco de dados instavel/estoque Databricks indisponivel -- agrupados sob a etiqueta "Problemas de integracao" e isolaveis por pilula de filtro propria)
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

Sem `PROJECT.md` dedicado — este `.planning/` existe só para satisfazer o pré-requisito do `/gsd-quick` (exige `ROADMAP.md`). Contexto do produto vive em `backend/.planning/PROJECT.md` (autoritativo).

**Current focus:** Tarefas avulsas de frontend via `/gsd-quick` — ver "Quick Tasks Completed" abaixo.

## Session note 2026-08-27 (setup mínimo para /gsd-quick)

Criado `.planning/ROADMAP.md` + `STATE.md` mínimos neste repositório — só o necessário pro `/gsd-quick` funcionar (ele valida `roadmap_exists` antes de rodar). Não é o aparato completo de projeto (`PROJECT.md`/`REQUIREMENTS.md`) que o `/gsd-new-project` geraria — isso foi tentado e revertido nesta mesma sessão por ser desproporcional a um conjunto de 4 itens de refactor já verificados no código (ver `backend/.planning/STATE.md` § Session note 2026-08-27 para o levantamento original).

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
| --- | --- | --- | --- | --- |
| 260827-fuw | Introduzir React Query no fluxo de evolucaoFaturamento (QueryProvider + ApiRequestError/apiErrorMessage + migração de AppDataProvider) | 2026-08-27 | `df8caaa` (worktree, mesclado em `develop`) | [260827-fuw-introduzir-react-query-para-o-fluxo-resu](./quick/260827-fuw-introduzir-react-query-para-o-fluxo-resu/) |
| 260827-m3a | Remover fluxo morto de detalhe de pedido (OrderDetailModal + prop onViewOrder + estado selectedOrderDetails no AppDataProvider) | 2026-08-28 | `46e4d20` | [260827-m3a-remover-fluxo-morto-de-detalhe-de-pedido](./quick/260827-m3a-remover-fluxo-morto-de-detalhe-de-pedido/) |
| 260828-emx | Extrair hook useAdequacaoProcessing de OrdersList (submissão/polling/retry de adequação, 1ª fatia de um refactor maior do arquivo) | 2026-08-28 | `9369a2c` | [260828-emx-extrair-a-muta-o-de-adequa-o-de-ordersli](./quick/260828-emx-extrair-a-muta-o-de-adequa-o-de-ordersli/) |
| 260828-fz2 | Consolidar hooks de paginação por número de página (usePagedResource + useNumberedResource → um só em shared/hooks/, 8 call sites migrados) | 2026-08-28 | `46f0690` | [260828-fz2-consolidar-hooks-de-pagina-o-por-n-mero-](./quick/260828-fz2-consolidar-hooks-de-pagina-o-por-n-mero-/) |
| 260831-kpx | Extrair funções puras de parsing/validação do protocolo realtime de realtime-provider.tsx para o novo features/realtime/model/protocol.ts (reorganização pura, sem mudança de comportamento) | 2026-08-31 | `6119db3`, `c362ee5` | [260831-kpx-extrair-fun-es-puras-de-parsing-valida-o](./quick/260831-kpx-extrair-fun-es-puras-de-parsing-valida-o/) |
| 260831-lb9 | Extrair camada de storage (persistência localStorage do cursor realtime) de realtime-provider.tsx para o novo features/realtime/model/storage.ts (2º passo do refactor protocolo/storage/conexão; reorganização pura, sem mudança de comportamento) | 2026-08-31 | `06a5bad`, `0eafd5b` | [260831-lb9-extrair-camada-de-storage-persist-ncia-l](./quick/260831-lb9-extrair-camada-de-storage-persist-ncia-l/) |
| 260831-lxx | Extrair a máquina de conexão websocket (~600 linhas: ticket, handshake, heartbeat, backoff, poll de status, resync, desmontagem) de realtime-provider.tsx para o novo features/realtime/model/connection.ts (3ª e última fatia do refactor protocolo/storage/conexão; provider cai de 1010 para 384 linhas) | 2026-09-01 | `6544af9`, `951723c` | [260831-lxx-extrair-o-efeito-de-conexao-websocket-li](./quick/260831-lxx-extrair-o-efeito-de-conexao-websocket-li/) |
| 260904-fr5 | Remover mt-8 redundante entre StandardPageHeader e conteúdo em 10 sítios (app/ e widgets/) — PageShell já tem gap-6, respiro cai de 56px para 24px; esqueleto de Usuários l.62 mantido de propósito (decisão da dev, paridade com margem própria da tabela de histórico); mt-6 do bloco de erro em Parâmetros registrado como follow-up | 2026-09-04 | `c493614` | [260904-fr5-remover-mt-8-redundante-do-espacamento-e](./quick/260904-fr5-remover-mt-8-redundante-do-espacamento-e/) |
| 260909-gh7 | Consumo do backend (quick task irmã 260909-ek7, já mesclada em `backend`): `OrderAlert.kind?: 'negocio'\|'integracao'` opcional em `shared/types/models.ts`; `PriorityAlertsCard` ganha etiqueta comum "Problemas de integração" para `integracao_banco_de_dados`/`integracao_estoque` em `CATEGORY_LABELS`, 6ª pílula de filtro "Integração" filtrando por `kind` (nunca por `category`, para aceitar fonte futura sem editar o arquivo de novo), e 5º bloco no guia informativo; zero mudança em `design-system/`, `features/realtime/` ou no caminho de fetch — o live-update do aviso de estoque já funciona pelo tópico `alerts` existente, sem código novo (confirmado pelas suítes de realtime passando sem edição). Suíte nova de 7 casos (TDD RED→GREEN) para um componente que não tinha teste. Diff restrito a 3 arquivos | 2026-09-09 | `d77dc9d`, `0f4cbfb` | [260909-gh7-consumir-kind-integracao-de-get-api-v1-a](./quick/260909-gh7-consumir-kind-integracao-de-get-api-v1-a/) |
