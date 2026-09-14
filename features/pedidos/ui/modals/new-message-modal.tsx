"use client";

import React from 'react';
import { Mail, Search, Send } from '@/shared/ui/icons';
import type { Order } from '@/shared/types/models';
import type { OrderLookupRow } from '@/features/pedidos/api/pedidos.api';
import { useOrderLookup } from '@/features/pedidos/model/use-order-lookup';
import { commercialEmails } from '@/shared/config/commercial-emails';
import { technicalTeamEmail } from '@/shared/config/technical-team-email';
import { isValidEmail } from '@/shared/lib/validation/email';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { LoadMoreFooter } from '@/shared/ui/composite/LoadMoreFooter';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/primitives/select';
import { Textarea } from '@/shared/ui/primitives/textarea';

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Compatibilidade com fixtures; a aplicacao consulta o lookup do servidor. */
  orders?: Order[];
  draftRecipient: string;
  setDraftRecipient: (value: string) => void;
  draftBody: string;
  setDraftBody: (value: string) => void;
  selectedOrderRefForDraft: string;
  setSelectedOrderRefForDraft: (value: string) => void;
  onSend: (event: React.FormEvent) => void;
  sending?: boolean;
  errorMessage?: string | null;
}

interface OrderChoice {
  value: string;
  client: string;
  canal: 'Franquia' | 'Multimarca';
  status: string;
  motivo: string | null;
  orderValue: number;
}

// Presets do select de destinatário: e-mails do time comercial + o único
// endereço fixo do time técnico, nessa ordem (técnico por último, antes só de
// "Outro"). Uma lista combinada única alimenta tanto as opções do Select
// quanto o cálculo de `isPreset` abaixo — se cada lista fosse checada
// separado, escolher "Time Técnico" marcaria `isPreset=false` (só olhava
// `commercialEmails`) e o Select voltaria a mostrar o placeholder vazio
// mesmo com o e-mail certo já preenchido.
const presetRecipients = [...commercialEmails, technicalTeamEmail];
const CUSTOM_OPTION = '__custom__';
const NO_ORDER_LABEL = 'Não associado a pedido específico';
const NO_ORDER_OPTION_ID = 'msg-order-option-none';
const MAX_RECIPIENT_LENGTH = 254;
const MAX_CONTENT_LENGTH = 10_000;
const compactFieldClassName =
  'h-auto min-h-0 w-full rounded-[var(--radius-control)] bg-card p-2.5 text-xs font-medium md:text-xs';
const compactSelectTriggerClassName =
  'h-auto rounded-[var(--radius-control)] bg-card p-2.5 text-xs font-medium';
const compactSelectItemClassName =
  'text-xs [&>span:last-child]:min-w-0 [&>span:last-child]:truncate';

function lookupChoice(row: OrderLookupRow): OrderChoice {
  return {
    value: `#${row.id}`,
    client: row.client,
    canal: row.canal,
    status: row.status,
    motivo: row.motivo,
    orderValue: row.value,
  };
}

function legacyChoice(order: Order): OrderChoice {
  return {
    value: order.id.startsWith('#') ? order.id : `#${order.id}`,
    client: order.client,
    canal: order.canal,
    status: order.status,
    motivo: order.motivo,
    orderValue: order.value,
  };
}

function buildOrderMessage(order: OrderChoice): string {
  const value = order.orderValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  return (
    `Prezado time comercial,\n\n` +
    `Solicitamos apoio no destravamento do pedido ${order.value} — ${order.client} (${order.canal}).\n` +
    `Status atual: ${order.status}.\n` +
    `Motivo: ${order.motivo ?? 'Não informado'}.\n` +
    `Valor do pedido: ${value}.\n\n` +
    `Ação negociada: `
  );
}

function SearchableOrderCombobox({
  orders,
  value,
  onChange,
  id,
}: {
  orders: Order[];
  value: string;
  onChange: (value: string, choice: OrderChoice | null) => void;
  id: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [selectedChoice, setSelectedChoice] = React.useState<OrderChoice | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listboxId = `${id}-listbox`;
  const lookup = useOrderLookup({ enabled: open, search: query });

  const choices = React.useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    const legacy = orders
      .map(legacyChoice)
      .filter(choice => (
        normalizedQuery.length === 0
        || choice.value.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
        || choice.client.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
      ));
    const merged = [...lookup.rows.map(lookupChoice), ...legacy];
    const seen = new Set<string>();
    return merged.filter(choice => {
      if (seen.has(choice.value)) return false;
      seen.add(choice.value);
      return true;
    });
  }, [lookup.rows, orders, query]);

  const options = React.useMemo<Array<OrderChoice | null>>(() => [null, ...choices], [choices]);
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, options.length - 1));
  const resolvedSelected = (selectedChoice?.value === value ? selectedChoice : null)
    ?? choices.find(choice => choice.value === value)
    ?? orders.map(legacyChoice).find(choice => choice.value === value)
    ?? null;

  React.useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const close = (restoreFocus = false) => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const select = (choice: OrderChoice | null) => {
    setSelectedChoice(choice);
    onChange(choice?.value ?? '', choice);
    close(true);
  };

  const moveActive = (delta: number) => {
    setActiveIndex(previous => {
      const length = options.length;
      if (length === 0) return 0;
      return (previous + delta + length) % length;
    });
  };

  return (
    <div
      className="relative"
      onBlurCapture={event => {
        const nextFocus = event.relatedTarget;
        if (nextFocus instanceof Node && event.currentTarget.contains(nextFocus)) return;
        close(false);
      }}
    >
      <Button
        ref={triggerRef}
        id={id}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        onClick={() => setOpen(previous => !previous)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex(event.key === 'ArrowUp' ? Math.max(0, options.length - 1) : 0);
          }
        }}
        className="h-auto w-full justify-between rounded-[var(--radius-control)] bg-card p-2.5 text-left text-xs font-medium"
      >
        <span className="truncate">
          {resolvedSelected ? `${resolvedSelected.value} - ${resolvedSelected.client}` : NO_ORDER_LABEL}
        </span>
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-card border ds-border-card bg-popover p-2 shadow-popover">
          <Input
            ref={searchInputRef}
            type="search"
            role="combobox"
            aria-label="Buscar por cliente ou pedido"
            aria-expanded
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={safeActiveIndex === 0 ? NO_ORDER_OPTION_ID : `${id}-option-${options[safeActiveIndex]?.value.replace('#', '')}`}
            placeholder="Buscar por cliente ou pedido..."
            value={query}
            onChange={event => {
              setQuery(event.target.value.slice(0, 120));
              setActiveIndex(0);
            }}
            onKeyDown={event => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                moveActive(1);
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                moveActive(-1);
              } else if (event.key === 'Enter') {
                event.preventDefault();
                select(options[safeActiveIndex] ?? null);
              } else if (event.key === 'Escape') {
                event.preventDefault();
                close(true);
              }
            }}
            className="h-9 text-xs md:text-xs"
          />

          <div id={listboxId} role="listbox" aria-label="Pedidos encontrados" className="mt-2 max-h-56 overflow-y-auto">
            <div
              id={NO_ORDER_OPTION_ID}
              role="option"
              aria-selected={!value}
              data-active={safeActiveIndex === 0 ? '' : undefined}
              className="cursor-pointer rounded-control px-2.5 py-2 text-xs data-[active]:bg-hover-soft"
              onMouseDown={event => event.preventDefault()}
              onClick={() => select(null)}
            >
              {NO_ORDER_LABEL}
            </div>
            {choices.map((choice, index) => (
              <div
                key={choice.value}
                id={`${id}-option-${choice.value.replace('#', '')}`}
                role="option"
                aria-selected={choice.value === value}
                data-active={safeActiveIndex === index + 1 ? '' : undefined}
                className="cursor-pointer truncate rounded-control px-2.5 py-2 text-xs data-[active]:bg-hover-soft"
                onMouseDown={event => event.preventDefault()}
                onClick={() => select(choice)}
              >
                {choice.value} - {choice.client}
              </div>
            ))}
          </div>

          {lookup.searching && (
            <p role="status" className="p-2 text-center text-xs text-muted-foreground">Buscando pedidos...</p>
          )}
          {!lookup.searching && choices.length === 0 && (
            <p className="p-2 text-center text-xs text-muted-foreground">Nenhum pedido encontrado.</p>
          )}
          {lookup.error && (
            <div role="alert" className="flex items-center justify-between gap-2 p-2 text-xs text-destructive-text">
              <span>Não foi possível atualizar a busca.</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void lookup.reload()}
              >
                Tentar novamente
              </Button>
            </div>
          )}
          {lookup.hasMore && (
            <LoadMoreFooter
              className="border-t ds-border-divider pt-2"
              loaded={lookup.rows.length}
              total={lookup.total}
              noun={['pedido', 'pedidos']}
              onLoadMore={() => void lookup.loadMore()}
              loading={lookup.loadingMore}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function NewMessageModal({
  isOpen,
  onClose,
  orders = [],
  draftRecipient,
  setDraftRecipient,
  draftBody,
  setDraftBody,
  selectedOrderRefForDraft,
  setSelectedOrderRefForDraft,
  onSend,
  sending = false,
  errorMessage = null,
}: NewMessageModalProps) {
  const [isCustomRecipient, setIsCustomRecipient] = React.useState(false);
  const lastTemplateRef = React.useRef('');
  const isPreset = presetRecipients.some(option => option.email === draftRecipient);
  const selectValue = isCustomRecipient ? CUSTOM_OPTION : isPreset ? draftRecipient : '';
  const recipientValid = isValidEmail(draftRecipient);
  const canSend = recipientValid
    && draftRecipient.length <= MAX_RECIPIENT_LENGTH
    && draftBody.trim().length > 0
    && draftBody.length <= MAX_CONTENT_LENGTH
    && !sending;

  const handleOrderSelect = (orderId: string, choice: OrderChoice | null) => {
    setSelectedOrderRefForDraft(orderId);
    const template = choice ? buildOrderMessage(choice) : '';
    if (draftBody.trim() === '' || draftBody === lastTemplateRef.current) {
      setDraftBody(template);
      lastTemplateRef.current = template;
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        if (!open && !sending) onClose();
      }}
    >
      <DialogContent
        size="md"
        aria-describedby={undefined}
        className="text-foreground"
        id="new-msg-modal-box"
        showCloseButton={!sending}
        onEscapeKeyDown={event => {
          if (sending) event.preventDefault();
        }}
        onPointerDownOutside={event => {
          if (sending) event.preventDefault();
        }}
      >
        <DialogHeader className="border-b ds-border-divider pb-3.5 pr-12">
          <DialogTitle className="font-heading flex items-center gap-1.5 uppercase tracking-wider">
            <Send className="h-4.5 w-4.5" />
            Registrar Comunicação
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSend} className="space-y-4 text-xs font-medium" id="new-msg-form">
          <div>
            <Label className="mb-1.5 block font-bold text-muted-foreground">Canal de Envio</Label>
            <div className="flex items-center justify-center gap-1.5 rounded-control border ds-border-control bg-muted/40 p-2.5 text-center font-sans font-bold text-foreground">
              <Mail className="h-4 w-4 text-muted-foreground" />
              E-mail
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block font-bold text-muted-foreground" htmlFor="msg-recipient-select">Destinatário</Label>
            <Select
              value={selectValue}
              onValueChange={value => {
                if (value === CUSTOM_OPTION) {
                  setIsCustomRecipient(true);
                  setDraftRecipient('');
                } else {
                  setIsCustomRecipient(false);
                  setDraftRecipient(value);
                }
              }}
            >
              <SelectTrigger id="msg-recipient-select" className={compactSelectTriggerClassName}>
                <SelectValue placeholder="Selecione um destinatário..." />
              </SelectTrigger>
              <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
                {presetRecipients.map(option => (
                  <SelectItem key={option.email} value={option.email} className={compactSelectItemClassName}>
                    {option.label} — {option.email}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_OPTION} className={compactSelectItemClassName}>Outro (digitar e-mail)</SelectItem>
              </SelectContent>
            </Select>
            {isCustomRecipient && (
              <Input
                id="msg-custom-recipient"
                type="email"
                required
                maxLength={MAX_RECIPIENT_LENGTH}
                aria-label="E-mail do destinatário"
                value={draftRecipient}
                onChange={event => setDraftRecipient(event.target.value.slice(0, MAX_RECIPIENT_LENGTH))}
                placeholder="Digite o e-mail do destinatário..."
                className={`mt-2 ${compactFieldClassName}`}
              />
            )}
            {draftRecipient.length > 0 && !recipientValid && (
              <p className="mt-1.5 text-xs font-medium text-destructive">Informe um e-mail válido.</p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block font-bold text-muted-foreground" htmlFor="msg-order-select">Selecione Pedido Relacionado (Opcional)</Label>
            <SearchableOrderCombobox
              id="msg-order-select"
              orders={orders}
              value={selectedOrderRefForDraft}
              onChange={handleOrderSelect}
            />
          </div>

          <div>
            <Label className="mb-1.5 block font-bold text-muted-foreground" htmlFor="msg-body-textarea">Conteúdo do Alerta / Mensagem</Label>
            <Textarea
              id="msg-body-textarea"
              rows={4}
              required
              maxLength={MAX_CONTENT_LENGTH}
              value={draftBody}
              onChange={event => setDraftBody(event.target.value.slice(0, MAX_CONTENT_LENGTH))}
              placeholder="Descreva a ação negociada com o comercial para destravamento do pedido."
              className={compactFieldClassName}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {draftBody.length.toLocaleString('pt-BR')} / {MAX_CONTENT_LENGTH.toLocaleString('pt-BR')}
            </p>
          </div>

          {errorMessage && (
            <div role="alert" className="rounded-control border ds-border-destructive bg-destructive/10 p-2.5 text-xs font-medium text-destructive-text">
              {errorMessage}
            </div>
          )}

          <DialogFooter className="flex-row gap-2 pt-2">
            <Button type="button" onClick={onClose} variant="outline" disabled={sending} className="flex-1 font-bold font-sans">Cancelar</Button>
            <Button type="submit" disabled={!canSend} loading={sending} loadingLabel="Confirmando..." className="flex-1 font-bold font-sans">
              <Mail className="h-3.5 w-3.5" />
              Confirmar E-mail
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
