"use client";

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

interface DeleteUserAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userLabel: string;
  onConfirm: () => void;
}

/**
 * Segunda confirmação da exclusão de acesso, numa janela própria — o gesto
 * anterior (segundo clique no mesmo botão do change-role-modal) passava
 * despercebido demais para uma ação irreversível. AlertDialog (não Dialog):
 * ganha role="alertdialog" e não fecha por clique fora, só por
 * Cancelar/Confirmar/Esc. Empilha por cima do change-role-modal — cada Radix
 * Dialog monta seu próprio portal no fim do <body>.
 */
export function DeleteUserAlertDialog({
  open,
  onOpenChange,
  userLabel,
  onConfirm,
}: DeleteUserAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">Excluir acesso</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o acesso de{" "}
            <strong className="text-foreground">{userLabel}</strong>? Essa ação
            não pode ser desfeita — o usuário perde acesso ao sistema
            imediatamente.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* AlertDialogCancel/Action no lugar de Button cru: é o Cancel que
            preenche o `cancelRef` que o AlertDialogContent foca ao abrir. */}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {/* LIMITAÇÃO DO DS (mesma observação de delete-parameter-modal.tsx):
              AlertDialogAction não encaminha `variant` — as classes abaixo
              reproduzem o variant `danger` de actionButtonVariants. */}
          <AlertDialogAction
            onClick={(event) => {
              // O Action fecha o AlertDialog por padrão (bom aqui); só
              // precisamos garantir que onConfirm rode antes.
              event.preventDefault();
              onConfirm();
              onOpenChange(false);
            }}
            className="bg-destructive text-destructive-foreground-strong hover:bg-destructive/92"
          >
            Confirmar exclusão
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
