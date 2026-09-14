"use client";

import { Trash2 } from "@/shared/ui/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/primitives/alert-dialog";
import type { Parameter } from "@/entities/parametro/model/types";
import { ModalCloseButton } from "./modal-close-button";

interface DeleteParameterModalProps {
  isOpen: boolean;
  onClose: () => void;
  paramToDelete: Parameter | null;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
  modalFeedback: { tipo: "sucesso" | "erro"; texto: string } | null;
}

export function DeleteParameterModal({
  isOpen,
  onClose,
  paramToDelete,
  onConfirm,
  isSubmitting,
  modalFeedback,
}: DeleteParameterModalProps) {
  // Sem early return: o `<AlertDialog open={isOpen}>` já cuida do fechado, e o
  // alvo vira guarda de CONTEÚDO. Desmontar a árvore inteira ao fechar tiraria o
  // `FocusScope` do ar antes de ele devolver o foco — e o gatilho é um
  // `DropdownMenuItem` que já saiu do DOM, então o foco cairia no <body>. Também
  // é o que permite rodar as classes de saída de `dialogContentVariants`.
  return (
    // AlertDialog (e não Dialog): confirmação destrutiva ganha role="alertdialog"
    // e não fecha por clique fora — só por Cancelar/Esc.
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {paramToDelete ? (
        <AlertDialogContent size="sm" surface="panel">
          <AlertDialogHeader className="shrink-0 flex-row items-center justify-between gap-4 border-b ds-border-divider bg-destructive/10 px-6 py-4">
            {/* Título sobre fundo tinto (bg-destructive/10): aqui `-text` é o
                pareamento correto do DS — no tema claro é tinta escura sobre o
                fundo lavado. */}
            <AlertDialogTitle className="flex items-center gap-2 text-destructive-text">
              <Trash2 size={20} /> Excluir Parâmetro
            </AlertDialogTitle>
            {/* O AlertDialogContent não injeta botão de fechar (ao contrário do
                DialogContent, que tem `showCloseButton`), então o X é reposto à
                mão — pelo mesmo `ModalCloseButton` dos outros modais de
                parâmetro. O `shrink-0` é daqui: o header é flex e o título ao
                lado pode empurrar o botão. */}
            <ModalCloseButton className="shrink-0" onClick={onClose} />
          </AlertDialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            {modalFeedback && (
              <div
                role={modalFeedback.tipo === "erro" ? "alert" : "status"}
                className={`p-3 rounded-control border text-sm font-medium ${
                  modalFeedback.tipo === "sucesso"
                    ? "ds-border-success bg-success/10 text-success-text"
                    : "ds-border-destructive bg-destructive/10 text-destructive-text"
                }`}
              >
                {modalFeedback.texto}
              </div>
            )}
            {/* `text-destructive` (token cromático) e não `-text`: o corpo do
                diálogo está sobre superfície neutra, onde `-text` renderiza preto
                no tema claro e o destaque do nome sumiria. */}
            <p className="text-sm text-foreground">Tem certeza que deseja excluir o parâmetro <strong className="text-destructive">{paramToDelete.name}</strong>?</p>
            <AlertDialogDescription className="text-xs">
              Esta ação não poderá ser desfeita e impactará a simulação de adequação e os canais.
            </AlertDialogDescription>
          </div>

          {/* AlertDialogCancel/Action no lugar de Button cru: é o Cancel que
              preenche o `cancelRef` que o AlertDialogContent foca ao abrir — sem
              ele o diálogo abre sem foco algum. */}
          <AlertDialogFooter className="shrink-0 border-t ds-border-divider bg-background px-6 py-4">
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            {/* LIMITAÇÃO DO DS (não é desvio deste app): o `AlertDialogAction`
                não encaminha `variant` — ele fixa `ActionButton` no primário
                (design-system/.../alert-dialog.tsx) — e `actionButtonVariants`
                não sai pela API pública (action-button/index.ts só exporta o
                componente). As três classes abaixo reproduzem VERBATIM o variant
                `danger` de `actionButtonVariants`, que é o pareamento correto
                para exclusão. A correção de verdade é upstream: o DS aceitar
                `variant` no AlertDialogAction. */}
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={(event) => {
                // O Action fecha o diálogo por padrão; aqui ele precisa continuar
                // aberto para mostrar "Excluindo..." e o feedback. Quem fecha é o
                // pai, depois da resposta.
                event.preventDefault();
                void onConfirm();
              }}
              className="bg-destructive text-destructive-foreground-strong hover:bg-destructive/92"
            >
              {isSubmitting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      ) : null}
    </AlertDialog>
  );
}
