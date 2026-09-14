import React from 'react';
import { ChevronDown, ChevronRight } from '@/shared/ui/icons';
import { ProductItem } from '@/shared/types/models';
import { formatCurrency } from '@/shared/lib/format/currency';
import { groupByCategory, groupItems } from '@/features/pedidos/lib/order-detail';
import { Badge } from '@/shared/ui/primitives/badge';
import type { BadgeVariant } from '@/shared/ui/primitives/badge';
import { Pressable } from '@/shared/ui/primitives/pressable';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/primitives/table';

interface CurrentItemsTableProps {
  items: ProductItem[];
  showAdjustedValues: boolean;
  adequacaoFactor: number;
  alert?: string;
  expandedItems: Record<string, boolean>;
  expandedCategories: Record<string, boolean>;
  onToggleItem: (code: string) => void;
  onToggleCategory: (key: string) => void;
}

// Tabela de itens do pedido tal como faturados hoje (com o fator de adequação
// já aplicado quando showAdjustedValues) — inclui o status do CD por item e
// destaca, na grade expandida, o tamanho específico em falta (via `alert`).
export function CurrentItemsTable({
  items,
  showAdjustedValues,
  adequacaoFactor,
  alert,
  expandedItems,
  expandedCategories,
  onToggleItem,
  onToggleCategory,
}: CurrentItemsTableProps) {
  const actualItems = groupItems(items);
  const categorized = groupByCategory(actualItems);

  // Extrai o tamanho em falta do alerta, se houver (ex.: "Grade incompleta
  // para tamanho G...").
  const missingSizesMatch = alert?.match(/tamanho\s+([A-Z0-9]+)/i);
  const missingSizeAlert = missingSizesMatch ? missingSizesMatch[1].toUpperCase() : null;

  return (
    // O scroll horizontal vem do `data-slot="table-container"` do `Table` do
    // design system — este wrapper só carrega a margem e o id da seção.
    <div className="mb-8" id="order-modal-table-container">
      <Table className="text-left font-sans border-b ds-border-divider text-foreground">
        {/* Receita única de cabeçalho das três tabelas de grade: o `TableHead`
            do design system já entrega altura (h-10), `text-xs`, `font-medium`
            e `text-muted-foreground` — só o caixa-alta e o tracking não têm
            default, e ficam uma vez no `TableHeader` (herdados pelo `th`).
            Cada `TableHead` carrega apenas geometria (alinhamento/largura). */}
        <TableHeader className="uppercase tracking-wider">
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Produtos</TableHead>
            <TableHead className="text-center">Qtd.</TableHead>
            <TableHead className="text-center">Código</TableHead>
            <TableHead className="text-right">Valor Unitário</TableHead>
            <TableHead className="text-center">Status do CD</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="font-medium text-foreground text-sm">
          {Object.entries(categorized).map(([category, items]) => {
            const catKey = `actual-${category}`;
            const isCatExpanded = expandedCategories[catKey];
            return (
              <React.Fragment key={category}>
                <TableRow
                  className="bg-muted/40 hover:bg-muted/60 cursor-pointer group"
                  onClick={() => onToggleCategory(catKey)}
                >
                  <TableCell colSpan={5} className="px-4 py-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {/* O chevron é o controle real (foco e teclado); o onClick
                          da linha continua como atalho de mouse. */}
                      <Pressable
                        variant="plain"
                        size="content"
                        aria-expanded={!!isCatExpanded}
                        aria-label={`${isCatExpanded ? 'Recolher' : 'Expandir'} categoria ${category}`}
                        onClick={event => {
                          event.stopPropagation();
                          onToggleCategory(catKey);
                        }}
                        className="p-1 text-muted-foreground hover:bg-hover-soft hover:text-foreground group-hover:text-foreground"
                      >
                        {isCatExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                      </Pressable>
                      {category} ({items.reduce((acc, it) => acc + it.qty, 0)} peças)
                    </div>
                  </TableCell>
                </TableRow>
                {isCatExpanded && items.map((item, idx) => {
                  // Compute adjusted item values for presentation implicitly
                  const adjustedUnitValue = item.unitValue * (showAdjustedValues ? adequacaoFactor : 1);

                  // Pílula de status do CD pela família semântica do design
                  // system (o `default` cobre "Não enviado").
                  const cdVariant: BadgeVariant =
                    item.cdStatus === 'Aprovado' ? 'success' : item.cdStatus === 'Regular' ? 'info' : 'default';

                  const displayStatus = item.cdStatus === 'Aprovado' ? 'Aprovado' : item.cdStatus;
                  const isExpanded = expandedItems[`actual-${item.code}`];

                  return (
                    <React.Fragment key={`${category}-${item.code}-${idx}`}>
                      <TableRow
                        className="cursor-pointer group"
                        id={`order-modal-item-${category}-${idx}`}
                        onClick={() => onToggleItem(`actual-${item.code}`)}
                      >
                        <TableCell className="py-4 pl-4 font-bold text-foreground whitespace-normal">
                          <div className="flex items-center gap-2">
                            <Pressable
                              variant="plain"
                              size="content"
                              aria-expanded={!!isExpanded}
                              aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} grade de ${item.name}`}
                              onClick={event => {
                                event.stopPropagation();
                                onToggleItem(`actual-${item.code}`);
                              }}
                              className="p-1 text-muted-foreground hover:bg-hover-soft hover:text-foreground group-hover:text-foreground"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                            </Pressable>
                            {item.name}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-center text-foreground font-mono">{item.qty}</TableCell>
                        <TableCell className="py-4 text-center text-muted-foreground font-mono">{item.code}</TableCell>
                        <TableCell className="py-4 text-right text-foreground font-mono">
                          {formatCurrency(adjustedUnitValue)}
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <Badge variant={cdVariant} size="status">
                            {displayStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {isExpanded && item.sizesList && item.sizesList.length > 0 && (
                        <TableRow className="bg-muted/10 hover:bg-muted/10">
                          <TableCell colSpan={5} className="py-4 px-10 whitespace-normal">
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 font-heading">
                              Detalhes da Grade ({item.qty} peças no total)
                            </div>
                            <div className="flex flex-wrap gap-3">
                              {item.sizesList.map((sizeStr, i) => {
                                const [sizeName, sizeQty] = sizeStr.includes(': ') ? sizeStr.split(': ') : ['UN', sizeStr];

                                // Determinar se este tamanho específico está em falta
                                const isItemBlocked = item.cdStatus === 'Não enviado';
                                const isThisSizeMissing = isItemBlocked &&
                                  (!missingSizeAlert || sizeName.toUpperCase() === missingSizeAlert || sizeName === 'UN');

                                return (
                                  <div key={i} className={`flex flex-col items-center justify-center bg-card border rounded-control min-w-15 overflow-hidden shadow-control ${isThisSizeMissing ? 'ds-border-destructive-strong' : 'ds-border-card'}`}>
                                    <div className={`w-full py-1 text-center border-b text-xs font-bold uppercase ${isThisSizeMissing ? 'bg-destructive/10 text-destructive-text ds-border-destructive-strong' : 'bg-muted/50 ds-border-divider text-muted-foreground'}`}>
                                      {sizeName}
                                    </div>
                                    {/* A quantidade fica sobre o `bg-card` do cartão (sem tinta),
                                        então o vermelho vem do token cromático `destructive` — o
                                        `destructive-text` resolve preto no tema claro e a falta
                                        deixaria de ser sinalizada. */}
                                    <div className={`py-1.5 text-center text-sm font-mono font-bold ${isThisSizeMissing ? 'text-destructive' : 'text-foreground'}`}>
                                      {sizeQty}
                                    </div>
                                    {isThisSizeMissing && (
                                      <div className="bg-destructive text-destructive-foreground-strong text-xs font-bold w-full text-center py-0.5 uppercase tracking-widest">
                                        Falta
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
