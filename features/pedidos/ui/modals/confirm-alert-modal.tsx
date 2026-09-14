import * as React from 'react';

import { Progress } from '@/shared/ui';
import { X } from '@/shared/ui/icons';
import { Pressable } from '@/shared/ui/primitives/pressable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/primitives/alert-dialog';

export interface ConfirmModalState {
  isOpen: boolean;
  // 'salvar-aprovar': confirmação de D-14 (modal de grade, salvar finaliza a
  // OR). Tipo próprio — não reaproveita 'sem'/'com', que já estão amarrados
  // aos callbacks do fluxo em lote "Efetuar OR" de orders-list.tsx.
  type: 'sem' | 'com' | 'salvar-aprovar' | 'success' | 'alert' | 'processing';
  title: string;
  progress?: {
    current: number;
    total: number | null;
    label: string;
  };
  retryLabel?: string;
}

interface ConfirmAlertModalProps {
  modal: ConfirmModalState | null;
  onClose: () => void;
  /** Opcionais: cada chamador só passa o(s) callback(s) do(s) tipo(s) de diálogo que usa. */
  onConfirmSemAdequacao?: () => void | Promise<void>;
  onConfirmComAdequacao?: () => void | Promise<void>;
  onConfirmSalvarAprovar?: () => void | Promise<void>;
  onRetry?: () => void | Promise<void>;
  pending?: boolean;
}

export function ConfirmAlertModal({
  modal,
  onClose,
  onConfirmSemAdequacao,
  onConfirmComAdequacao,
  onConfirmSalvarAprovar,
  onRetry,
  pending = false,
}: ConfirmAlertModalProps) {
  // O pai zera o estado no mesmo commit em que fecha. Sem reter o último
  // conteúdo, a árvore sairia do DOM antes de o Radix chegar a
  // `data-state=closed` e as saídas animadas de `dialogContentVariants`
  // (`animate-out`/`fade-out-0`/`zoom-out-95`) nunca rodariam — o diálogo
  // desapareceria em corte seco.
  const [previousModal, setPreviousModal] = React.useState(modal);
  const [content, setContent] = React.useState(modal);

  if (modal !== previousModal) {
    setPreviousModal(modal);
    if (modal) setContent(modal);
  }

  // 'sem'/'com'/'salvar-aprovar' pedem decisão (Cancelar + Ok); 'success'/'alert' só informam.
  const isConfirmation = content?.type === 'sem' || content?.type === 'com' || content?.type === 'salvar-aprovar';
  const hasRetry = !isConfirmation && Boolean(content?.retryLabel && onRetry);
  // Sem cor por className: o "Ok" que confirma é o AlertDialogAction (variant
  // primary do ActionButton) e o "Ok" que só dispensa um aviso é o
  // AlertDialogCancel (variant secondary, neutro). Aqui fica apenas o ajuste
  // tipográfico, o mesmo aplicado ao "Cancelar".
  const okClassName = 'text-xs font-bold font-sans';

  return (
    // AlertDialog (e não Dialog): é uma confirmação — ganha role="alertdialog"
    // e não fecha por clique fora, só por Cancelar/Ok/Esc.
    //
    // O empilhamento acima das demais modais do módulo (antes forçado com
    // `z-toast`) agora vem de graça: cada diálogo do Radix monta seu próprio
    // portal no fim do <body>, e este abre sempre depois dos outros. Por isso
    // também não se usa `forceMount`: ele criaria o portal já na montagem e
    // inverteria a ordem de empilhamento.
    <AlertDialog
      open={Boolean(modal?.isOpen)}
      onOpenChange={open => {
        if (!open && !pending) onClose();
      }}
    >
      {content ? (
        <AlertDialogContent size="sm" className="select-none">
          {/* O AlertDialogContent não injeta botão de fechar (ao contrário do
              DialogContent, que tem `showCloseButton`) — é a semântica de
              role="alertdialog". O X é reposto sobre o Pressable do DS, que já
              traz `type="button"`, transição e `focus-visible:ds-focus-ring`; o
              variant ghost dá o `hover:bg-hover-soft`. Sobra o posicionamento,
              o tamanho e o `cursor-pointer` dos X irmãos do módulo. */}
          <Pressable
            variant="ghost"
            size="content"
            onClick={onClose}
            disabled={pending}
            aria-label="Fechar"
            className="absolute top-4 right-4 size-9 cursor-pointer rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Pressable>

          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading tracking-wider uppercase">
              {content.type === 'success'
                ? 'Sucesso'
                : content.type === 'processing'
                  ? 'Processamento'
                : content.type === 'alert'
                  ? 'Aviso'
                  : 'Confirmação'}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
              {content.title}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {content.progress ? (
            <div className="space-y-2" aria-live="polite">
              <div
                id="or-processing-progress-label"
                className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground"
              >
                <span>{content.progress.label}</span>
                {content.progress.total !== null && content.progress.total > 0 ? (
                  <span className="shrink-0 font-mono tabular-nums">
                    {Math.max(0, Math.min(content.progress.current, content.progress.total))} / {content.progress.total}
                  </span>
                ) : null}
              </div>
              <Progress
                aria-labelledby="or-processing-progress-label"
                value={content.progress.current}
                max={content.progress.total ?? 100}
                indeterminate={content.progress.total === null || content.progress.total <= 0}
              />
            </div>
          ) : null}

          {/* AlertDialogCancel/Action no lugar de Button cru: é o Cancel que
              preenche o `cancelRef` que o AlertDialogContent foca ao abrir — sem
              ele o diálogo abre sem foco algum. Por isso, quando não há decisão a
              tomar, o próprio "Ok" é o Cancel (ele só dispensa o aviso). */}
          <AlertDialogFooter className="gap-3 sm:justify-end">
            {isConfirmation ? (
              <>
                <AlertDialogCancel disabled={pending} className="text-xs font-bold font-sans">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={pending}
                  onClick={event => {
                    // O Action fecha o diálogo por padrão; aqui ele precisa
                    // continuar aberto enquanto a requisição roda. Quem troca o
                    // conteúdo (sucesso/erro) ou fecha é o pai.
                    event.preventDefault();
                    if (pending) return;
                    if (content.type === 'sem') void onConfirmSemAdequacao?.();
                    else if (content.type === 'com') void onConfirmComAdequacao?.();
                    else void onConfirmSalvarAprovar?.();
                  }}
                  className={okClassName}
                >
                  {pending ? 'Processando...' : 'Ok'}
                </AlertDialogAction>
              </>
            ) : hasRetry ? (
              <>
                <AlertDialogCancel disabled={pending} className={okClassName}>Fechar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={pending}
                  onClick={event => {
                    event.preventDefault();
                    if (!pending) void onRetry?.();
                  }}
                  className={okClassName}
                >
                  {pending ? 'Processando...' : content.retryLabel}
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogCancel disabled={pending} className={okClassName}>
                {pending ? 'Processando...' : 'Ok'}
              </AlertDialogCancel>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      ) : null}
    </AlertDialog>
  );
}
