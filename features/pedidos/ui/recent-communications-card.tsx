import { useState, useMemo } from 'react';
import { ArrowRight, MessageSquare, Smartphone, WhatsappIcon } from '@/shared/ui/icons';
import type { Communication } from '@/shared/types/models';
import { usePermissions } from '@/shared/config/auth/permissions';
import { useLoadMore } from '@/shared/hooks/useLoadMore';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/primitives/badge';
import { Card, CardContent, CardFooter } from '@/shared/ui/primitives/card';
import { Pressable } from '@/shared/ui/primitives/pressable';
import { EmptyState } from '@/shared/ui/primitives/empty-state';
import { LoadMoreFooter } from '@/shared/ui/composite/LoadMoreFooter';
import { FeedCardHeader } from '@/features/pedidos/ui/feed-card-header';

const communicationStatus = {
  Pendente: { label: 'Aguardando envio', variant: 'warning' as const },
  Enviado: { label: 'Enviado', variant: 'success' as const },
  Falhou: { label: 'Falhou', variant: 'destructive' as const },
  Incerto: { label: 'Resultado incerto', variant: 'warning' as const },
} satisfies Record<Communication['status'], {
  label: string;
  variant: 'warning' | 'success' | 'destructive';
}>;

interface RecentCommunicationsCardProps {
  communications: Communication[];
  onOpenNewMessage: () => void;
  total?: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

const FILTER_OPTIONS = [
  { key: 'todos', label: 'Todos' },
  { key: 'comercial', label: 'Comercial' },
  { key: 'tecnico', label: 'Time Técnico' },
];

export function RecentCommunicationsCard({
  communications,
  onOpenNewMessage,
  total,
  hasMore,
  loadingMore,
  onLoadMore,
}: RecentCommunicationsCardProps) {
  const { hasMinLevel } = usePermissions();
  const [filterCategory, setFilterCategory] = useState<string>('todos');

  const janela = useLoadMore(communications);
  const serverPaged = onLoadMore !== undefined;
  const rawCommunications = serverPaged ? communications : janela.visiveis;

  const visibleCommunications = useMemo(() => {
    if (filterCategory === 'todos') return rawCommunications;

    if (filterCategory === 'tecnico') {
      // Mensagens direcionadas ao time técnico (erros, falhas de integração, falhas de entrega ou avisos de sistema)
      return rawCommunications.filter(
        (c) =>
          c.status === 'Falhou' ||
          c.status === 'Incerto' ||
          /técnico|tecnico|erro|falha|linx|job|sistema|suporte|ti/i.test(c.content + c.recipient),
      );
    }

    if (filterCategory === 'comercial') {
      // Mensagens direcionadas ao comercial (vendas, clientes, WhatsApp comercial e emails operacionais)
      return rawCommunications.filter(
        (c) =>
          c.status === 'Enviado' ||
          c.status === 'Pendente' ||
          /comercial|venda|loja|cliente|franquia|multimarca/i.test(c.content + c.recipient),
      );
    }

    return rawCommunications;
  }, [rawCommunications, filterCategory]);

  return (
    <Card variant="elevated" id="comms-widget-box">
      <FeedCardHeader
        icon={<Smartphone className="h-4.5 w-4.5 text-muted-foreground" />}
        title="Comunicações Recentes"
        badge={<Badge variant="neutral" size="indicator" className="font-mono">Hoje</Badge>}
      />

      {/* Pílulas de Filtro alinhadas na MESMA RETA dos Alertas Prioritários */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap px-6 pt-3 pb-2 border-b ds-border-divider">
        {FILTER_OPTIONS.map((opt) => {
          const isSelected = filterCategory === opt.key;
          return (
            <Pressable
              key={opt.key}
              variant="plain"
              size="content"
              onClick={() => setFilterCategory(opt.key)}
              pressed={isSelected}
              className={`px-2.5 py-1 text-xs font-medium rounded-control transition-colors cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-foreground text-background font-bold'
                  : 'bg-muted/10 text-muted-foreground hover:text-foreground hover:bg-muted/20'
              }`}
            >
              {opt.label}
            </Pressable>
          );
        })}
      </div>

      <CardContent className="flex-1 space-y-4 pt-4" id="comms-list-feed">
        {visibleCommunications.length > 0 ? (
          visibleCommunications.map((c, idx) => {
            const status = communicationStatus[c.status];
            return (
              <div key={c.id} className="group p-4 rounded-control border ds-border-card transition bg-muted/20 hover:ds-border-neutral" id={`comm-feed-item-${idx}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 flex items-center justify-center rounded-full bg-muted text-muted-foreground">
                      {c.type === 'WhatsApp' ? (
                        <WhatsappIcon className="h-3.5 w-3.5" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5" />
                      )}
                    </span>

                    <div>
                      <span className="text-xs font-bold text-foreground leading-tight block">{c.recipient}</span>
                      <div className="flex items-center gap-1">
                        <Badge variant={status.variant} size="content">{status.label}</Badge>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{c.time}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug wrap-break-word">
                  {c.content}
                </p>
                {c.status === 'Falhou' && (
                  <p className="mt-2 text-xs font-medium text-destructive-text">
                    Não foi possível entregar após novas tentativas.
                  </p>
                )}
                {c.status === 'Incerto' && (
                  <p className="mt-2 text-xs font-medium text-warning-text">
                    O provedor não confirmou o resultado. Não reenvie; solicite verificação.
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <EmptyState
            variant="inline"
            size="sm"
            headingLevel={3}
            title="Nenhuma comunicação nesta categoria"
            description="Não há registros de comunicação para o filtro selecionado."
          />
        )}

        {(serverPaged ? hasMore : janela.temMais) ? (
          <LoadMoreFooter
            id="comms-load-more"
            className="pt-1"
            loaded={serverPaged ? communications.length : janela.carregados}
            total={serverPaged ? (total ?? communications.length) : janela.total}
            onLoadMore={onLoadMore ?? janela.carregarMais}
            loading={serverPaged && loadingMore}
            noun={['comunicação', 'comunicações']}
          />
        ) : null}
      </CardContent>

      <CardFooter className="mt-4 justify-center border-t ds-border-divider text-center text-xs" id="comms-footer-action">
        {hasMinLevel(20) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenNewMessage}
            className="w-auto text-xs font-bold text-muted-foreground hover:bg-hover-soft hover:text-foreground"
          >
            Exibir todas as comunicações comercial
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

