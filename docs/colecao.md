# Regra de coleção

A coleção muda a cada **6 meses** (semestre civil). A regra é puramente
de calendário e vive no frontend.

## A regra

- Jan–Jun de um ano → 1º semestre
- Jul–Dez do mesmo ano → 2º semestre

**Âncora:** 1º semestre de 2026 = coleção **117**. Cada semestre seguinte soma +1.

| Período | Vigente |
|---------|---------|
| Jan–Jun 2026 | 117 |
| Jul–Dez 2026 | 118 |
| Jan–Jun 2027 | 119 |
| Jul–Dez 2027 | 120 |

## Implementação

`shared/lib/colecao.ts`:

```ts
getColecaoVigente(date = new Date())  // Jan–Jun → semestre 0; Jul–Dez → semestre 1
```

O cálculo usa a data local (`new Date()`), então os números avançam sozinhos na
virada de semestre, sem intervenção.

## Onde é usado

- `app/(app)/visao-geral/page.tsx` — resolve a coleção exibida na montagem da
  rota e a repassa ao seletor.
- `features/pedidos/ui/collection-selector.tsx` — exibe `{coleção} (Vigente)`,
  ou só o número quando a tela atravessa a virada de semestre aberta.

Não existe seletor de coleção passada nem de próxima coleção: a tela sempre
mostra a coleção vigente no momento em que a rota montou.

## Observação

Esta regra é independente do campo `cd_colecao_ped` que vem do Databricks: a
coleção exibida na tela é derivada do calendário, não do dado do pedido.
