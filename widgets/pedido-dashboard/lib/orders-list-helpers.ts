import { Order, ProductItem } from '@/shared/types/models';

// Agrupa itens por tamanho embutido no nome ("Produto (Tam: M)") de volta em
// uma única linha por produto, com a grade repartida em `sizes`. Formato de
// saída DIFERENTE do `groupItems` de features/pedidos/lib/order-detail.ts
// (aquele usa sizesList: string[]; este usa o objeto sizes da grade) — não são
// intercambiáveis, cada um serve ao seu próprio conjunto de telas.
export function groupItemsBySizes(items: ProductItem[]): ProductItem[] {
  const sizePattern = /\(Tam:\s*([^)]+?)\s*\)$/i;
  const map = new Map<string, ProductItem>();

  for (const item of items) {
    const match = item.name.match(sizePattern);
    if (!match) {
      map.set(item.code + '|' + item.name, { ...item });
      continue;
    }

    const sizeLabel = match[1].trim().toUpperCase();
    const baseName = item.name.replace(/\s*\(Tam:\s*[^)]+\)\s*$/i, '').trim();
    const key = item.code + '|' + baseName;

    if (!map.has(key)) {
      map.set(key, { ...item, name: baseName, qty: 0, stock: 0, sizes: {} });
    }

    const existing = map.get(key)!;
    if (item.sizes) {
      for (const [explicitSize, quantity] of Object.entries(item.sizes)) {
        existing.sizes![explicitSize] = (existing.sizes![explicitSize] ?? 0) + quantity;
      }
    } else {
      existing.sizes![sizeLabel] = (existing.sizes![sizeLabel] ?? 0) + item.qty;
    }
    existing.qty += item.qty;
    existing.stock = (existing.stock ?? 0) + (item.stock ?? 0);
  }

  return Array.from(map.values());
}

// Cache por referência de `order`: como os itens de um pedido não mudam entre
// re-renders (só a lista de pedidos incluídos/ordenados muda a cada filtro),
// evita reprocessar o regex de agrupamento por tamanho a cada busca/filtro.
const groupedItemsCache = new WeakMap<Order, ProductItem[]>();

export function getGroupedItems(order: Order): ProductItem[] {
  let grouped = groupedItemsCache.get(order);
  if (!grouped) {
    grouped = groupItemsBySizes(order.items);
    groupedItemsCache.set(order, grouped);
  }
  return grouped;
}

// Assinatura de peças+quantidades de um pedido, usada para achar pedidos similares:
// mesmo código com mesma quantidade total cai na mesma chave, então pedidos com
// cesta idêntica ficam adjacentes na ordenação; cestas parecidas (poucas peças ou
// quantidades diferentes) ficam próximas por ordenação lexicográfica.
export function buildBasketSignature(items: ProductItem[]): string {
  const totalsByCode = new Map<string, number>();
  for (const item of items) {
    totalsByCode.set(item.code, (totalsByCode.get(item.code) ?? 0) + item.qty);
  }
  return Array.from(totalsByCode.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, qty]) => `${code}:${qty}`)
    .join(',');
}

// order.date vem em formatos variados ("2026-07-10" do Databricks, "Hoje 10:00"
// como fallback do back-end quando não há data). Datas parseáveis usam o timestamp
// real; o fallback não-parseável cai em "agora" para não quebrar a ordenação.
export function parseOrderDate(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const parsed = Date.parse(dateStr);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}
