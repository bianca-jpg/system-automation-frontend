---
phase: 260908-ihe
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - shared/types/models.ts
  - features/pedidos/lib/orcamento-pedido.ts
  - features/pedidos/lib/orcamento-pedido.test.ts
  - features/pedidos/api/pedidos.api.ts
  - features/pedidos/api/pedidos.api.test.ts
  - features/pedidos/ui/modals/confirm-alert-modal.tsx
  - features/pedidos/ui/modals/product-grade-detail-modal.tsx
  - features/pedidos/ui/modals/product-grade-detail-modal.test.tsx
autonomous: true
requirements: [QUICK-260908-ihe]

must_haves:
  truths:
    - "D-12/D-13: ao abrir o modal de edição de um produto, toda linha 'sem adequação' já exibe — antes de qualquer digitação — dois medidores permanentes (adição e corte) com o gasto/limite do PEDIDO INTEIRO, não só do produto da tela"
    - "D-01/D-11: linha 'com adequação' continua sem medidor, sem banner novo, com o rótulo 'Salvar Alterações' e com a trava de total redistributivo intacta"
    - "Linha 'sem adequação' passa a poder mudar o total do cliente — a trava hoje universal (hasInvalidClientTotals) e a checagem espelhada em normalizeGradeChanges passam a valer só para 'com adequação'; sem isso nenhum dos estados de orçamento é alcançável"
    - "D-15: quando o delta pretendido de uma linha 'sem adequação' passa do restante do pedido, aparece um banner role=alert nomeando o cliente e os restantes, e o botão de salvar fica desabilitado — os inputs de quantidade continuam editáveis para a pessoa conseguir se corrigir"
    - "D-14: com todas as linhas sujas 'sem adequação' e dentro do limite, o clique em salvar abre uma confirmação avisando que salvar finaliza a OR; só o Ok dispara o PUT"
    - "D-16: um 409 com code=orcamento_pedido_excedido mostra a mensagem do backend literal, sem marcar o rascunho como descartável e sem cair na copy genérica de conflito de versão"
    - "pnpm typecheck limpo e os três arquivos de teste tocados passam"
  artifacts:
    - path: "features/pedidos/lib/orcamento-pedido.ts"
      provides: "Funções puras de tom do medidor, avaliação de delta contra o restante e reconhecimento do 409 de orçamento"
      exports: ["toneOrcamento", "avaliarDeltaOrcamento", "orcamentoExcedidoDetail"]
      min_lines: 40
    - path: "shared/types/models.ts"
      provides: "Espelho do contrato OrcamentoPedidoOut do backend e campo opcional em Order"
      contains: "orcamentoPedido"
    - path: "features/pedidos/ui/modals/product-grade-detail-modal.tsx"
      provides: "Medidores por linha, banner de trava, rótulo condicional do CTA, confirmação e branch de 409"
      contains: "orcamentoPedido"
    - path: "features/pedidos/ui/modals/confirm-alert-modal.tsx"
      provides: "Tipo de diálogo salvar-aprovar reconhecido como decisão Cancelar/Ok"
      contains: "salvar-aprovar"
  key_links:
    - from: "features/pedidos/ui/modals/product-grade-detail-modal.tsx"
      to: "shared/types/models.ts"
      via: "row.orderRef.orcamentoPedido — passthrough do payload de GET /produtos/clientes, sem mapeamento campo a campo"
      pattern: "orderRef\\.orcamentoPedido"
    - from: "features/pedidos/ui/modals/product-grade-detail-modal.tsx"
      to: "features/pedidos/lib/orcamento-pedido.ts"
      via: "avaliarDeltaOrcamento decide o banner e o disabled; orcamentoExcedidoDetail decide o branch de erro"
      pattern: "avaliarDeltaOrcamento|orcamentoExcedidoDetail"
    - from: "features/pedidos/ui/modals/product-grade-detail-modal.tsx"
      to: "features/pedidos/api/pedidos.api.ts"
      via: "expectedTotalQty=null nas linhas 'sem adequação' libera a variação de total no cliente HTTP"
      pattern: "expectedTotalQty"
---

<objective>
Fechar a metade de frontend da Fase 20 do backend (D-12, D-13, D-14, D-15,
D-16): o modal de edição de grade passa a mostrar, travar e confirmar o
orçamento de ±5% do pedido inteiro nas linhas "sem adequação".

O backend já está pronto e no ar: `GET /api/v1/pedidos/produtos/clientes`
devolve `orcamentoPedido` embutido no card do pedido de cada linha "sem
adequação" (plano 20-04), e `PUT /api/v1/pedidos/produtos/grades` recusa com
409 estruturado quando a edição estoura (plano 20-03). Nada de rede novo
precisa ser inventado aqui — o dado já chega na resposta que o modal já
consome; falta declarar o tipo, desenhar e travar.

Purpose: sem indicador e sem trava, a pessoa do automation descobre que estourou
o ±5% só quando o servidor recusa — que é exatamente a experiência de planilha
que este produto existe para substituir.

Output: medidores permanentes por linha, banner de trava com `role="alert"`,
CTA "Salvar e Aprovar OR" com confirmação, e tratamento gracioso do 409.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Contrato de design — FONTE DE VERDADE, não inventar layout

@../backend/.planning/phases/20-trava-de-or-amento-de-5-na-edi-o-manual-de-pedidos-sem-adequ/20-UI-SPEC.md

# Decisões D-01..D-16 (seção "Frontend" é a relevante)

@../backend/.planning/phases/20-trava-de-or-amento-de-5-na-edi-o-manual-de-pedidos-sem-adequ/20-CONTEXT.md

# Arquivos a modificar

@features/pedidos/ui/modals/product-grade-detail-modal.tsx
@features/pedidos/ui/modals/confirm-alert-modal.tsx
@features/pedidos/api/pedidos.api.ts
@shared/types/models.ts
</context>

<contratos_do_backend>

Estes dois contratos já estão implementados, commitados e testados no repo
irmão. Copiar os nomes exatamente — camelCase, sem tradução.

**Leitura** — objeto `orcamentoPedido` dentro do card do pedido de cada linha
(`row.order`), presente somente quando `adequacaoAplicada === false`. Campos:
`nrPedido`, `limiteAdicao`, `consumidoAdicao`, `restanteAdicao`,
`limiteCorte`, `consumidoCorte`, `restanteCorte` — todos inteiros de peças.
O agregado é do PEDIDO INTEIRO (todos os produtos daquele `nr_pedido`), que é
justamente o que D-12 pede.

⚠ O `20-04-SUMMARY.md` registra que a serialização HTTP não exclui nulos: uma
linha "com adequação" pode chegar com `orcamentoPedido: null` em vez de sem a
chave. Todo teste de presença no frontend deve ser por veracidade do valor,
nunca por existência de chave.

**Escrita** — `PUT /produtos/grades` responde 409 com `detail` estruturado:
`code` (sempre `orcamento_pedido_excedido`), `message` (frase pronta em
pt-BR), `nrPedido`, `orcamento` (`adicao` ou `corte`), `restanteAdicao`,
`restanteCorte`. `code` é o único campo que o front pode usar para decidir o
branch — a `message` é para exibir, não para parsear. O corpo completo chega
em `ApiRequestError.body` como `{ detail: { ... } }` (padrão FastAPI).

Os outros 409 do mesmo endpoint (conflito de versão, processamento em
andamento) continuam com `detail` string — é por isso que o branch novo
precisa vir ANTES do tratamento de 409 que já existe hoje.

</contratos_do_backend>

<decisoes_deste_plano>

O `20-UI-SPEC.md` tem três pontos em que a tabela de contrato e o trecho de
markup ilustrativo divergem. Resolvidos aqui para o executor não ter de
arbitrar no meio da implementação:

- **PD-01 — Nome acessível do medidor.** A tabela de copy pede a frase longa
  ("...Restam N peças") como nome acessível; o snippet aponta
  `aria-labelledby` para o rótulo curto visível. Resolução: o alvo do
  `aria-labelledby` é um span que contém o rótulo curto **visível verbatim**
  mais um `<span className="sr-only">` com a cláusula do restante. Rótulo
  visível preservado ao pé da letra e leitor de tela recebe o restante.
- **PD-02 — Tamanho de fonte do rótulo do medidor.** O snippet usa
  `text-[10px]`, valor arbitrário; a tabela de Typography e a guardrail
  "nenhum tamanho de fonte novo" mandam `text-xs`. Vale `text-xs`. Como a
  `TableCell` de cliente é `uppercase font-bold`, o rótulo precisa também de
  `normal-case font-medium` para sair como a copy foi escrita.
- **PD-03 — Rótulo do CTA quando estoura.** A tabela de copy condiciona
  "Salvar e Aprovar OR" a estar dentro do limite; a States Matrix mostra o
  mesmo rótulo visível-porém-desabilitado no estado que estoura. Vale a
  States Matrix: o rótulo depende só da composição do lote (todas as linhas
  sujas "sem adequação"), e o estouro age apenas no `disabled`. Além de
  seguir a matriz, evita o rótulo piscar entre dois textos enquanto a pessoa
  digita.

Mais duas decisões de implementação:

- **PD-04 — Relaxar a trava de total é pré-requisito, não escopo extra.**
  Hoje `hasInvalidClientTotals` (modal) e a igualdade
  `total !== expectedTotalQty` (`normalizeGradeChanges`) proíbem qualquer
  mudança de total para TODA linha. Enquanto isso valer, os estados 3 e 4 da
  States Matrix são inalcançáveis e a fase inteira fica morta na tela. As
  duas travas passam a valer só para `adequacaoAplicada === true`. O
  `20-CONTEXT.md` já aponta isso explicitamente em `canonical_refs`.
- **PD-05 — Os medidores refletem o payload do carregamento, não o pós-erro.**
  `clientGrids` guarda o `orderRef` do momento em que a linha entrou; um
  `clients.reload()` não reescreve linhas já existentes que têm versão. Logo
  não adianta recarregar depois de um 409 de orçamento para "atualizar os
  medidores" — não atualizaria. O mitigante é que a própria `message` do 409
  carrega os restantes frescos. Portanto o branch de 409 de orçamento **não**
  chama reload e **não** marca `requiresDraftDiscard`: o rascunho continua
  válido, só é grande demais.

</decisoes_deste_plano>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Contrato do orçamento no frontend, lógica pura e liberação da variação de total no cliente HTTP</name>
  <files>shared/types/models.ts, features/pedidos/lib/orcamento-pedido.ts, features/pedidos/lib/orcamento-pedido.test.ts, features/pedidos/api/pedidos.api.ts, features/pedidos/api/pedidos.api.test.ts</files>
  <behavior>
    `toneOrcamento(consumido, limite)`:
    - 0 de 10 usadas → `default`
    - 8 de 10 usadas → `warning` (limiar de 80%)
    - 10 de 10 usadas → `destructive`
    - 0 de 0 usadas (pedido pequeno demais para render 1 peça de folga) → `destructive`, sem divisão por zero

    `avaliarDeltaOrcamento(orcamento, delta)`:
    - delta 0 → não excede, tipo nulo
    - delta +3 com `restanteAdicao` 2 → excede, tipo `adicao`
    - delta +2 com `restanteAdicao` 2 → não excede (teto exato cabe)
    - delta -3 com `restanteCorte` 5 → não excede, tipo `corte`
    - delta -6 com `restanteCorte` 5 → excede, tipo `corte`
    - adição e corte nunca se compensam (D-08): sobra de corte não libera adição

    `orcamentoExcedidoDetail(error)`:
    - erro 409 com corpo `{detail:{code:'orcamento_pedido_excedido', message:'...'}}` → devolve o detail
    - erro 409 com `detail` string (conflito de versão) → null
    - erro 500 com o mesmo corpo → null
    - erro sem corpo / corpo não-objeto / message vazia → null
    - valor que nem é erro (null, string) → null, sem lançar

    `normalizeGradeChanges` com `expectedTotalQty: null`:
    - total diferente da baseline chega à API (nada é lançado)
    - total zero continua sendo recusado antes da rede
    - com `expectedTotalQty` numérico o comportamento de hoje é idêntico
  </behavior>
  <action>
    Em `shared/types/models.ts`, declarar e exportar a interface
    `OrcamentoPedido` espelhando os sete campos camelCase do backend descritos
    em `<contratos_do_backend>` (todos `number`), e acrescentar a `Order` o
    campo opcional `orcamentoPedido?: OrcamentoPedido | null`. Documentar em
    comentário curto que a chave só vem preenchida em linha "sem adequação",
    que pode chegar literalmente nula, e que o agregado é do pedido inteiro e
    não do produto da tela (D-12). Não reexportar nada de `entities/` aqui — o
    comentário no fim do arquivo explica por quê.

    Criar `features/pedidos/lib/orcamento-pedido.ts` (mesma pasta de
    `order-lifecycle.ts`, mesmo estilo: funções puras, sem React, sem fetch)
    exportando:
    - `type OrcamentoTone = 'default' | 'warning' | 'destructive'` — os três
      nomes são variantes que o `Progress` do design system já aceita, não
      inventar quarta.
    - `toneOrcamento(consumido: number, limite: number): OrcamentoTone` —
      `destructive` quando `limite <= 0` ou `consumido >= limite`, `warning`
      a partir de 80% do limite, `default` abaixo disso. Regra única, sem
      ramo especial para limite zero (0 >= 0 já cai em destructive).
    - `avaliarDeltaOrcamento(orcamento: OrcamentoPedido, delta: number):
      { excede: boolean; tipo: 'adicao' | 'corte' | null }` — delta positivo
      compara com `restanteAdicao`, negativo compara o módulo com
      `restanteCorte`, zero devolve não-excede/tipo nulo. Excede é
      estritamente maior que o restante (o teto exato é permitido, igual ao
      backend).
    - `orcamentoExcedidoDetail(error: unknown)` devolvendo o objeto de detalhe
      tipado (`code`, `message`, `nrPedido`, `orcamento`, `restanteAdicao`,
      `restanteCorte`) ou `null`. Narrowing estrutural sobre `status` e `body`
      — não importar a classe `ApiRequestError`, para a função continuar
      testável com objetos literais. Exigir status 409, `code` igual ao
      identificador de máquina do backend e `message` string não vazia; tudo
      o mais devolve null sem lançar.

    Em `features/pedidos/api/pedidos.api.ts`, mudar o tipo de
    `ProductGradeChange.expectedTotalQty` para `number | null` e atualizar o
    comentário do campo: continua não sendo serializado, e `null` significa
    "esta linha é 'sem adequação', o total pode variar dentro do orçamento do
    pedido, quem decide é o backend". Em `normalizeGradeChanges`, envolver as
    duas checagens ligadas a esse campo (a validação de inteiro positivo e a
    comparação `total !== expectedTotalQty`) em um teste de não-nulidade.
    Todas as outras validações permanecem como estão para as duas espécies de
    linha: faixa de 1 a 100 clientes, pedido inteiro positivo, versão string
    de 1 a 128, 1 a 100 tamanhos, chave de tamanho canônica sem duplicata,
    quantidade inteira de 0 a 1.000.000, e grade totalmente zerada recusada.

    Escrever `features/pedidos/lib/orcamento-pedido.test.ts` cobrindo os casos
    do bloco `<behavior>` (vitest, mesmo estilo de `order-lifecycle.test.ts`),
    e acrescentar a `features/pedidos/api/pedidos.api.test.ts` um caso novo
    provando que `expectedTotalQty: null` com total divergente chega ao
    `apiFetch` e que total zero continua barrado antes da rede. Os casos
    existentes de `pedidos.api.test.ts` ficam intactos — eles são a prova de
    regressão do caminho "com adequação".
  </action>
  <verify>
    <automated>pnpm exec vitest run features/pedidos/lib/orcamento-pedido.test.ts features/pedidos/api/pedidos.api.test.ts</automated>
    <automated>pnpm typecheck</automated>
  </verify>
  <done>As três funções puras existem com os limiares acima cobertos por teste; `Order` carrega `orcamentoPedido` opcional e anulável; `expectedTotalQty` nulo libera a variação de total sem afrouxar nenhuma outra validação; os casos pré-existentes de `pedidos.api.test.ts` seguem verdes.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Medidores permanentes por linha "sem adequação" (D-12/D-13) e liberação da mudança de total no modal</name>
  <files>features/pedidos/ui/modals/product-grade-detail-modal.tsx, features/pedidos/ui/modals/product-grade-detail-modal.test.tsx</files>
  <behavior>
    - Linha com `adequacaoAplicada: false` e `orcamentoPedido` preenchido
      renderiza dois `progressbar`, um nomeado com o rótulo de adição e outro
      com o de corte, já no primeiro render, sem nenhuma digitação
    - Linha com `adequacaoAplicada: true` não renderiza `progressbar` algum
    - Linha "sem adequação" cujo `orcamentoPedido` chega nulo também não
      renderiza medidor, e não quebra a tela
    - Alterar um tamanho de linha "sem adequação" de forma que o total mude
      NÃO exibe o banner de redistribuição e mantém o botão de salvar ativo
    - O mesmo desvio de total numa linha "com adequação" continua exibindo o
      banner de redistribuição e desabilitando o salvar (regressão D-01/D-11)
  </behavior>
  <action>
    Trabalhar em `ProductGradeDetailModalContent`. Importar `Progress` de
    `@/shared/ui` (o mesmo caminho que `confirm-alert-modal.tsx` usa) e
    `toneOrcamento` do módulo criado na Task 1. Nenhuma primitiva nova: a
    tabela "Component Reuse Map" do `20-UI-SPEC.md` lista tudo o que pode ser
    usado, e a lista de "Do not build" logo abaixo diz o que não pode.

    Criar, no mesmo arquivo, um componente local de apresentação que recebe o
    objeto de orçamento e a chave da linha e devolve os dois medidores
    empilhados (`mt-1 flex flex-col gap-1`). Para cada medidor:
    - um span rotulador com `id` derivado da chave da linha mais um sufixo que
      distinga adição de corte, classes
      `flex items-center gap-1 text-xs font-medium normal-case text-muted-foreground`
      (PD-02), texto visível exatamente como a tabela de copy do UI-SPEC
      define para adição e para corte, e dentro dele um span `sr-only` com a
      cláusula do restante em peças (PD-01)
    - um `Progress` com `aria-labelledby` apontando para esse `id`,
      `className="h-1"`, `variant` vindo de `toneOrcamento`, e `value`/`max`
      iguais ao consumido/limite — com um ajuste: quando o limite é zero o
      `Progress` normaliza `max` para 100 e a barra sairia vazia, então nesse
      caso passar valor e máximo iguais a 1, para a barra aparecer cheia em
      `destructive` como o UI-SPEC descreve na seção de edge case. O rótulo
      visível continua dizendo zero de zero.

    Renderizar esse componente dentro da `TableCell` de "Loja / Cliente",
    como irmão logo DEPOIS do `div` que já contém o chevron e o nome do
    cliente — nunca como coluna nova de tabela, porque uma coluna renderiza
    (mesmo vazia) também para linha "com adequação" e violaria D-01. A
    condição de render é a veracidade de `row.orderRef.orcamentoPedido`
    (cuidado com o `null` documentado em `<contratos_do_backend>`), o que já
    implica "sem adequação" pelo contrato do backend. Quando não há orçamento,
    nada é acrescentado à célula e a linha sai idêntica ao que é hoje.

    Relaxar a trava de total (PD-04), em dois pontos do mesmo arquivo:
    - `invalidTotalRows` passa a filtrar apenas as linhas sujas com
      `adequacaoAplicada` verdadeiro; `hasInvalidClientTotals`, o banner que
      ele alimenta, a guarda homônima dentro de `save()` e a condição de
      `disabled` do botão continuam exatamente como estão escritos hoje — só a
      população que alimenta o filtro encolhe.
    - na montagem do array `changes`, `expectedTotalQty` passa a ser a
      baseline da linha quando ela é "com adequação" e `null` quando é "sem
      adequação", casando com a assinatura ampliada na Task 1.

    Ainda na linha da tabela, a célula de total à direita hoje pinta em tom de
    aviso e acrescenta o sufixo com a baseline quando o total diverge, com um
    `title` afirmando que o total precisa permanecer no valor reservado. Essa
    afirmação deixa de ser verdadeira para "sem adequação": condicionar tom,
    sufixo e `title` a `row.orderRef.adequacaoAplicada`, de modo que a linha
    "sem adequação" com total alterado mostre só o número no tom primário. O
    ramo "com adequação" tem de sair byte-idêntico.

    Acrescentar em `product-grade-detail-modal.test.tsx` os casos do bloco
    `<behavior>`. O arquivo já mocka `useProductClients`, `useRealtime` e
    `updateProductGrades`; o helper `makeOrder()` monta uma linha "com
    adequação" — parametrizá-lo (ou criar um irmão) para produzir também a
    variante "sem adequação" com orçamento, sem alterar o default usado pelos
    quinze testes existentes.
  </action>
  <verify>
    <automated>pnpm exec vitest run features/pedidos/ui/modals/product-grade-detail-modal.test.tsx</automated>
    <automated>pnpm typecheck</automated>
  </verify>
  <done>Linha "sem adequação" mostra os dois medidores antes de qualquer edição e aceita mudança de total; linha "com adequação" não mostra medidor, mantém a trava redistributiva e o texto do CTA de hoje; os quinze testes que já existiam continuam passando.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Trava com alerta (D-15), confirmação de finalização da OR (D-14) e 409 gracioso (D-16)</name>
  <files>features/pedidos/ui/modals/confirm-alert-modal.tsx, features/pedidos/ui/modals/product-grade-detail-modal.tsx, features/pedidos/ui/modals/product-grade-detail-modal.test.tsx</files>
  <behavior>
    - Linha "sem adequação" editada além do `restanteAdicao`: aparece um
      elemento com `role="alert"` nomeando o cliente e os restantes, o botão de
      salvar fica `disabled`, e os inputs de quantidade da linha continuam
      habilitados
    - Voltar a quantidade para dentro do restante faz o alerta sumir e o botão
      voltar a ficar ativo
    - Lote todo "sem adequação" e dentro do limite: o botão exibe o rótulo de
      salvar-e-aprovar e o clique NÃO dispara o PUT — abre um diálogo de
      confirmação com o aviso de que salvar finaliza a OR
    - Confirmar no diálogo dispara `updateProductGrades` uma única vez
    - Cancelar no diálogo não dispara PUT algum
    - Lote com pelo menos uma linha "com adequação" suja mantém o rótulo e o
      clique diretos de hoje, sem diálogo (D-11)
    - PUT que falha com 409 de orçamento mostra a mensagem do backend literal,
      e o botão de recarregar do banner de erro continua com o rótulo normal
      (o rascunho não vira descartável)
    - PUT que falha com 409 de conflito de versão continua caindo no fluxo
      atual: releitura, rascunho marcado como descartável, copy de conflito
  </behavior>
  <action>
    Em `confirm-alert-modal.tsx`, acrescentar `'salvar-aprovar'` à união de
    `ConfirmModalState['type']`, incluí-lo na constante `isConfirmation` (que
    hoje só reconhece os dois tipos do fluxo em lote de "Efetuar OR"), e
    acrescentar uma prop opcional de callback para esse tipo. No `onClick` do
    `AlertDialogAction`, despachar para o callback novo quando o tipo for o
    novo, mantendo o despacho atual para os dois tipos existentes. Tornar os
    dois callbacks de "Efetuar OR" opcionais e chamá-los com encadeamento
    opcional — assim o modal de grade não precisa passar função vazia, e
    `orders-list.tsx`, que passa os dois, segue válido sem tocar no arquivo.
    Nada mais muda: o mapeamento de título já cai em "Confirmação" para
    qualquer tipo que não seja sucesso/processamento/aviso, os botões
    continuam "Cancelar" e "Ok", e o estado pendente já está implementado.

    No modal de grade, importar `ConfirmAlertModal` e o tipo do estado dele, e
    `avaliarDeltaOrcamento` / `orcamentoExcedidoDetail` do módulo da Task 1.

    Derivar, com `useMemo` sobre `dirtyRows`, a lista de linhas fora do
    orçamento: para cada linha suja com orçamento presente, calcular o delta
    como total atual menos baseline e chamar `avaliarDeltaOrcamento`; guardar
    a linha e o restante relevante quando excede. Linha suja "sem adequação"
    sem orçamento no payload não entra nessa lista — o backend segue como
    fonte de verdade e recusa com 409 se for o caso (D-16).

    Renderizar o banner de trava logo DEPOIS do banner de redistribuição e
    ANTES do banner de limite de cem clientes, guardado por `!actionError`
    como os irmãos. Markup: copiar a forma exata do banner de redistribuição
    (`role="alert"`, `mb-4`, borda e fundo de aviso, `p-3`, `text-xs
    font-medium`, ícone de alerta `h-4 w-4 shrink-0`). Não usar tom
    destrutivo: o UI-SPEC justifica que a paridade é com o banner bloqueante
    de aviso que já existe no arquivo. Conteúdo: uma frase por linha
    infratora, na estrutura que a tabela de copy do UI-SPEC define — nomeia o
    cliente, informa quantas peças restam para adicionar e para cortar, e
    fecha pedindo a redução. Com uma única linha infratora o texto sai
    idêntico à frase do contrato; com várias, empilhar as frases dentro do
    mesmo banner (o contrato dá restantes no singular, e eles diferem por
    pedido, então juntar nomes numa frase só produziria número errado).

    No rodapé: derivar se o lote é inteiramente "sem adequação" (existe linha
    suja e todas elas têm `adequacaoAplicada` falso). O rótulo do botão de
    salvar passa a ser o de salvar-e-aprovar nesse caso e o de hoje caso
    contrário — dependendo só da composição do lote, nunca do estouro (PD-03).
    O ícone permanece o mesmo ícone de salvar de hoje; não trocar por outro,
    porque o outro está reservado ao botão separado de aprovação. Acrescentar
    a condição de estouro à lista de `disabled` que já existe, como mais um
    termo na mesma expressão, sem criar mecanismo paralelo de desabilitação.
    O `onClick` passa a abrir o estado do diálogo de confirmação quando o lote
    é inteiramente "sem adequação", e a chamar `save()` direto caso contrário.

    Montar o `ConfirmAlertModal` no fim da árvore do `DialogContent`, com o
    tipo novo, `title` recebendo o aviso de finalização de OR exatamente como
    a tabela de copy do UI-SPEC o escreve, `pending` amarrado à ação de save
    em curso, e o callback de confirmação executando `save()` e depois
    limpando o estado do diálogo. Não montar mecanismo de empilhamento
    manual: o comentário dentro de `confirm-alert-modal.tsx` explica que a
    ordem de portal do Radix já resolve o diálogo sobre o diálogo.

    No `catch` de `save()`, inserir como PRIMEIRO branch a checagem de
    `orcamentoExcedidoDetail`: havendo detalhe, exibir a `message` do backend
    como erro da ação, encerrar a ação pendente e retornar — sem releitura e
    sem marcar o rascunho como descartável, pelos motivos de PD-05. O branch
    de 409 que já existe e o fallback genérico ficam intactos abaixo dele.
    Não tocar em `operationError`: a mensagem do backend é exibida direto.

    Acrescentar ao arquivo de teste os casos do bloco `<behavior>`, usando o
    helper de linha "sem adequação" criado na Task 2. Para os dois casos de
    409, fazer o mock de `updateProductGrades` rejeitar com um objeto que
    carregue `status` 409 e o corpo correspondente.
  </action>
  <verify>
    <automated>pnpm exec vitest run features/pedidos/ui/modals/product-grade-detail-modal.test.tsx features/pedidos/lib/orcamento-pedido.test.ts</automated>
    <automated>pnpm typecheck</automated>
    <automated>pnpm lint</automated>
    <human-check>Abrir um produto em edição que tenha cliente "sem adequação": confirmar que os dois medidores aparecem antes de qualquer digitação, que aumentar a quantidade além do restante trava o botão com o alerta, e que salvar dentro do limite pede confirmação antes de finalizar a OR.</human-check>
  </verify>
  <done>Estouro exibe alerta e desabilita o salvar mantendo os inputs editáveis; lote "sem adequação" dentro do limite exige confirmação antes do PUT; 409 de orçamento mostra a mensagem do backend sem invalidar o rascunho; 409 de conflito de versão segue no fluxo antigo.</done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
| --- | --- |
| backend → navegador | O payload de `orcamentoPedido` e o corpo do 409 são dados de rede desserializados sem schema no cliente (`parseCursorPage` é passthrough tipado) |
| operador → modal | Quantidades digitadas viram o delta que alimenta a trava local |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
| --- | --- | --- | --- | --- |
| T-ihe-01 | Tampering | trava de orçamento no cliente | accept | D-16 é explícito: o cálculo do front é feedback de UX; a autoridade é a validação transacional do backend (plano 20-03), que roda dentro do lock. Burlar a trava visual não burla a regra |
| T-ihe-02 | Information Disclosure | `message` do 409 renderizada literal | mitigate | A frase é gerada pelo domínio do backend e contém só número de pedido e contagem de peças — dado que o operador já vê na tela. Renderizada como texto em JSX (escapado), nunca como HTML |
| T-ihe-03 | Denial of Service | campo `orcamentoPedido` ausente, nulo ou com limite zero | mitigate | Render condicionado à veracidade do valor; `toneOrcamento` trata limite zero sem divisão por zero; medidor de limite zero renderiza cheio em vez de quebrar |
| T-ihe-04 | Tampering | dependências | accept | Nenhum pacote novo é instalado; todo componente vem do design system já vendorizado |

</threat_model>

<verification>

- `pnpm typecheck` limpo.
- `pnpm lint` sem warning novo.
- `pnpm exec vitest run features/pedidos` verde nos arquivos tocados.
- Não rodar a suíte completa como gate binário: o baseline deste repo já tem
  ~5 testes instáveis fora de `features/pedidos`. Se for rodar tudo, comparar
  com o baseline (`git stash`) antes de atribuir qualquer falha a esta
  mudança.
- `git status` do diretório `design-system/` sem arquivo novo desta tarefa —
  ele é cópia vendorizada e não se edita a partir daqui.

</verification>

<success_criteria>

- Os cinco itens de decisão desta tarefa entregues: orçamento do pedido
  inteiro buscado e exibido (D-12), indicador permanente antes de qualquer
  edição (D-13), aviso de finalização de OR antes de confirmar (D-14), trava
  visual com `role="alert"` no estouro (D-15) e 409 do backend tratado com
  graça mesmo quando o cálculo local achava que cabia (D-16).
- Nenhum pixel do caminho "com adequação" muda (D-01/D-11): mesmo rótulo de
  botão, mesma trava redistributiva, nenhum medidor, nenhum diálogo novo.
- Nenhum token de cor, tamanho de fonte, valor de espaçamento, variante ou
  primitiva nova é introduzida — tudo já existe no design system ou já é
  renderizado neste mesmo arquivo.
- Nenhuma dependência nova no `package.json`.

</success_criteria>

<output>
Criar `.planning/quick/260908-ihe-implementar-ui-02-d-12-a-d-15-trava-de-o/260908-ihe-SUMMARY.md` ao terminar.
</output>
