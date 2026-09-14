import { useState, useMemo } from 'react';
import { AlertTriangle, Bell, CircleHelp, Info, X } from '@/shared/ui/icons';
import { OrderAlert } from '@/shared/types/models';
import { useLoadMore } from '@/shared/hooks/useLoadMore';
import { Badge } from '@/shared/ui/primitives/badge';
import { Card, CardContent } from '@/shared/ui/primitives/card';
import { Pressable } from '@/shared/ui/primitives/pressable';
import { EmptyState } from '@/shared/ui/primitives/empty-state';
import { LoadMoreFooter } from '@/shared/ui/composite/LoadMoreFooter';
import { FeedCardHeader } from '@/features/pedidos/ui/feed-card-header';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog';

interface PriorityAlertsCardProps {
  alerts: OrderAlert[];
  /** @deprecated Alertas são projeções canônicas; não há dismiss individual. */
  setAlerts?: React.Dispatch<React.SetStateAction<OrderAlert[]>>;
  total?: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  linx: 'Linx ERP',
  acesso: 'Acesso Usuários',
  payload: 'Dados Incompletos',
  performance: 'Desempenho',
  divergencia: 'Divergência Estoque',
  geracao_or: 'Falha Geração OR',
  anomalia_credito: 'Bloqueio Crédito',
  anomalia_estoque: 'Ruptura Estoque',
  adequacao: 'Adequação Grade',
  fila_processamento: 'Fila Assíncrona',
  // As duas fontes de integração compartilham a etiqueta de propósito: a distinção
  // banco-versus-estoque já fica clara no title/message que o backend manda pronto —
  // o badge de categoria só precisa agrupar as duas sob um rótulo comum.
  integracao_banco_de_dados: 'Problemas de integração',
  integracao_estoque: 'Problemas de integração',
};

const FILTER_OPTIONS = [
  { key: 'todos', label: 'Todos' },
  { key: 'linx', label: 'Linx' },
  { key: 'pedidos', label: 'Pedidos/OR' },
  { key: 'acesso', label: 'Acesso' },
  { key: 'estoque', label: 'Estoque & Crédito' },
  { key: 'integracao', label: 'Integração' },
];

export function PriorityAlertsCard({
  alerts,
  total,
  hasMore,
  loadingMore,
  onLoadMore,
}: PriorityAlertsCardProps) {
  const [filterCategory, setFilterCategory] = useState<string>('todos');
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const janela = useLoadMore(alerts);
  const serverPaged = onLoadMore !== undefined;
  const rawAlerts = serverPaged ? alerts : janela.visiveis;

  const visibleAlerts = useMemo(() => {
    if (filterCategory === 'todos') return rawAlerts;
    if (filterCategory === 'linx') return rawAlerts.filter((a) => a.category === 'linx');
    if (filterCategory === 'pedidos') {
      return rawAlerts.filter((a) => ['payload', 'geracao_or', 'adequacao'].includes(a.category || ''));
    }
    if (filterCategory === 'acesso') {
      return rawAlerts.filter((a) => ['acesso', 'performance', 'fila_processamento'].includes(a.category || ''));
    }
    if (filterCategory === 'estoque') {
      return rawAlerts.filter((a) => ['divergencia', 'anomalia_credito', 'anomalia_estoque'].includes(a.category || ''));
    }
    // Filtra por kind, nunca por category (D-03): assim uma terceira fonte de
    // integração que o backend adicione no futuro entra na pílula sozinha.
    if (filterCategory === 'integracao') return rawAlerts.filter((a) => a.kind === 'integracao');
    return rawAlerts;
  }, [rawAlerts, filterCategory]);

  return (
    <>
      <Card variant="elevated" id="alerts-widget-box">
        <FeedCardHeader
          icon={<Bell className="h-4.5 w-4.5 text-muted-foreground" />}
          title="Alertas Prioritários"
          action={(
            <Pressable
              variant="plain"
              size="content"
              onClick={() => setShowInfoModal(true)}
              title="Guia Informativo de Alertas"
              className="p-1 text-muted-foreground hover:text-foreground rounded-full transition cursor-pointer focus-visible:ds-focus-ring"
            >
              <CircleHelp className="h-4.5 w-4.5" />
            </Pressable>
          )}
          badge={(
            <Badge variant="destructive" size="indicator" className="font-mono font-bold">
              {total ?? alerts.length} Críticos
            </Badge>
          )}
        />

        {/* Pílulas de Filtro em Linha Única (Design System) */}
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

        <CardContent className="space-y-3 pt-4" id="alerts-list">
          {visibleAlerts.length > 0 ? (
            visibleAlerts.map((al, idx) => {
              const isError = al.type === 'error';
              const isWarning = al.type === 'warning';
              return (
                <div
                  key={al.id}
                  id={`alert-badge-item-${idx}`}
                  className={`flex items-start gap-3 p-3.5 rounded-control border text-xs leading-snug transition group hover:shadow-control ${
                    isError
                      ? 'bg-destructive/5 ds-border-destructive'
                      : isWarning
                        ? 'bg-warning/5 ds-border-warning'
                        : 'bg-info/5 ds-border-info'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isError ? (
                      <div className="h-4 w-4 rounded-full bg-destructive/20 text-destructive flex items-center justify-center">
                        <X className="h-2.5 w-2.5" />
                      </div>
                    ) : isWarning ? (
                      <AlertTriangle className="h-4.5 w-4.5 text-warning" />
                    ) : (
                      <Info className="h-4.5 w-4.5 text-info" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground font-heading">{al.title || 'Alerta Operacional'}</span>
                      {al.category && (
                        <Badge variant={isError ? 'destructive' : isWarning ? 'warning' : 'outline'} size="indicator">
                          {CATEGORY_LABELS[al.category] || al.category}
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium text-foreground">{al.message}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-sans pt-1">
                      <span className="font-mono">{al.time}</span>
                      {al.orderId ? (
                        <span className="font-mono font-bold text-foreground">{al.orderId}</span>
                      ) : (
                        <span>Atenção imediata</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              variant="inline"
              size="sm"
              headingLevel={3}
              title="Nenhum alerta nesta categoria"
              description="Todos os serviços e solicitações nesta categoria estão estabilizados."
            />
          )}

          {(serverPaged ? hasMore : janela.temMais) ? (
            <LoadMoreFooter
              id="alerts-load-more"
              className="pt-2"
              loaded={serverPaged ? alerts.length : janela.carregados}
              total={serverPaged ? (total ?? alerts.length) : janela.total}
              onLoadMore={onLoadMore ?? janela.carregarMais}
              loading={serverPaged && loadingMore}
              noun={['alerta', 'alertas']}
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Modal Informativo / Orientação de Alertas Operacionais */}
      <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold font-heading">
              <CircleHelp className="h-5 w-5 text-info" />
              Guia Informativo dos Alertas Prioritários
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 text-xs leading-relaxed text-foreground pt-1">
            <p className="text-muted-foreground">
              Central de orientação para acompanhamento e direcionamento dos alertas operacionais em tempo real:
            </p>

            <div className="space-y-2.5">
              <div className="p-3 rounded-control bg-destructive/5 border ds-border-destructive space-y-1">
                <div className="flex items-center gap-2 font-bold text-destructive">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  Linx (ERP)
                </div>
                <p className="text-muted-foreground">
                  ORs geradas no automation-OR aguardando confirmação no Linx. <strong>Ação:</strong> Verificar conector de integração do ERP ou solicitar reprocessamento.
                </p>
              </div>

              <div className="p-3 rounded-control bg-warning/5 border ds-border-warning space-y-1">
                <div className="flex items-center gap-2 font-bold text-warning">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  Pedidos / OR
                </div>
                <p className="text-muted-foreground">
                  Pedidos com dados incompletos (#ID sem itens), falhas de OR ou adequações em andamento. <strong>Ação:</strong> Validar payload e reprocessar se necessário.
                </p>
              </div>

              <div className="p-3 rounded-control bg-info/5 border ds-border-info space-y-1">
                <div className="flex items-center gap-2 font-bold text-info">
                  <span className="h-2 w-2 rounded-full bg-info" />
                  Acesso & Fila
                </div>
                <p className="text-muted-foreground">
                  Confirmação de acesso de usuários ou tarefas assíncronas com retentativas ativas. <strong>Ação:</strong> Aprovar o acesso na aba de Usuários e monitorar workers.
                </p>
              </div>

              <div className="p-3 rounded-control bg-muted/15 border ds-border-divider space-y-1">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <span className="h-2 w-2 rounded-full bg-foreground" />
                  Estoque & Crédito
                </div>
                <p className="text-muted-foreground">
                  Divergência de estoque físico zerado com pedidos ativos ou retenção por limite financeiro. <strong>Ação:</strong> Verificar reposição no CD ou liberação de crédito no ERP.
                </p>
              </div>

              <div className="p-3 rounded-control bg-muted/15 border ds-border-divider space-y-1">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <span className="h-2 w-2 rounded-full bg-foreground" />
                  Problemas de integração
                </div>
                <p className="text-muted-foreground">
                  Avisos técnicos automáticos do sistema — banco de dados instável ou estoque indisponível. <strong>Ação:</strong> nenhuma ação no automation-OR; aguardar a normalização e acionar o suporte técnico se persistir.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}



