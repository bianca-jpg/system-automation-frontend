import React from 'react';
import { ChevronDown, ChevronRight, Edit3 } from '@/shared/ui/icons';
import { ProductItem } from '@/shared/types/models';
import { formatCurrency } from '@/shared/lib/format/currency';
import { groupByCategory, groupItems, sumItemsValue } from '@/features/pedidos/lib/order-detail';
import { Badge } from '@/shared/ui/primitives/badge';
import { Pressable } from '@/shared/ui/primitives/pressable';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/primitives/table';

interface OriginalGradeSectionProps {
  pedidoAlterado?: boolean;
  originalItems?: ProductItem[];
  expandedItems: Record<string, boolean>;
  expandedCategories: Record<string, boolean>;
  onToggleItem: (code: string) => void;
  onToggleCategory: (key: string) => void;
}

// Grade original do pedido antes de uma alteração manual — só aparece quando
// o pedido foi de fato alterado E existem itens originais para comparar.
export function OriginalGradeSection({
  pedidoAlterado,
  originalItems,
  expandedItems,
  expandedCategories,
  onToggleItem,
  onToggleCategory,
}: OriginalGradeSectionProps) {
  if (!pedidoAlterado || !originalItems || originalItems.length === 0) return null;

  const groupedOriginalItems = groupItems(originalItems);
  const categorized = groupByCategory(groupedOriginalItems);

  return (
    <div className="mb-8 rounded-card border ds-border-warning bg-warning/5 p-5">
      {/* `bg-warning/5` é tinta fraca demais para valer como superfície de
          status: `--warning-text` resolve #000000 no tema claro e o aviso
          desapareceria. O cromático `text-warning` sinaliza nos dois modos, e
          o ícone de título é decorativo (neutro). */}
      <h4 className="text-warning font-bold text-sm uppercase tracking-wider font-heading mb-4 flex items-center gap-2">
        <Edit3 className="h-4 w-4 text-muted-foreground" />
        Grade Original (Antes da Alteração)
      </h4>
      <div className="mb-2">
        <Table className="text-left font-sans text-xs border-b ds-border-divider text-foreground">
          {/* Mesma receita de cabeçalho da `current-items-table` e do
              `product-grade-detail-modal`: tipografia pelo default do
              `TableHead`, caixa-alta/tracking uma vez no `TableHeader`, e no
              `th` só geometria. O `pl-4` entrou para alinhar com a primeira
              célula do corpo, que já usava `pl-4` sem par no cabeçalho. */}
          <TableHeader className="uppercase tracking-wider">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Produtos</TableHead>
              <TableHead className="text-center">Qtd.</TableHead>
              <TableHead className="text-center">Código</TableHead>
              <TableHead className="text-right">Valor Unitário</TableHead>
            </TableRow>
          </TableHeader>
          {/* O texto secundário vem do token `muted-foreground` em vez de
              `opacity-80`: a opacidade derrubava o contraste da grade inteira
              abaixo do que os tokens garantem no modo escuro. */}
          <TableBody className="font-medium text-muted-foreground">
            {Object.entries(categorized).map(([category, items]) => {
              const catKey = `orig-${category}`;
              const isCatExpanded = expandedCategories[catKey];
              return (
                <React.Fragment key={category}>
                  <TableRow
                    className="bg-muted/30 hover:bg-muted/50 cursor-pointer group"
                    onClick={() => onToggleCategory(catKey)}
                  >
                    <TableCell colSpan={4} className="px-4 py-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {/* O chevron é o controle real (foco e teclado); o
                            onClick da linha continua como atalho de mouse. */}
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
                          {isCatExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                        </Pressable>
                        {category} ({items.reduce((acc, it) => acc + it.qty, 0)} peças)
                      </div>
                    </TableCell>
                  </TableRow>
                  {isCatExpanded && items.map((item, idx) => {
                    const isExpanded = expandedItems[`orig-${item.code}`];
                    return (
                      <React.Fragment key={`${category}-${item.code}-${idx}`}>
                        <TableRow
                          className="cursor-pointer group"
                          onClick={() => onToggleItem(`orig-${item.code}`)}
                        >
                          <TableCell className="py-2.5 font-bold pl-4 whitespace-normal">
                            <div className="flex items-center gap-2">
                              <Pressable
                                variant="plain"
                                size="content"
                                aria-expanded={!!isExpanded}
                                aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} grade de ${item.name}`}
                                onClick={event => {
                                  event.stopPropagation();
                                  onToggleItem(`orig-${item.code}`);
                                }}
                                className="p-1 text-muted-foreground hover:bg-hover-soft hover:text-foreground group-hover:text-foreground"
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                              </Pressable>
                              {item.name}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 text-center font-mono">{item.qty}</TableCell>
                          <TableCell className="py-2.5 text-center text-muted-foreground font-mono">{item.code}</TableCell>
                          <TableCell className="py-2.5 text-right font-mono">{formatCurrency(item.unitValue)}</TableCell>
                        </TableRow>
                        {isExpanded && item.sizesList && item.sizesList.length > 0 && (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={4} className="py-3 px-8 whitespace-normal">
                              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Grade do Produto</div>
                              <div className="flex flex-wrap gap-2">
                                {item.sizesList.map((sizeStr, i) => (
                                  <Badge key={i} variant="outline" size="label" className="font-mono">
                                    {sizeStr}
                                  </Badge>
                                ))}
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
      <p className="text-xs font-bold text-warning mt-2 text-right">
        Valor Original Total: <span className="font-mono">{formatCurrency(sumItemsValue(originalItems))}</span>
      </p>
    </div>
  );
}
