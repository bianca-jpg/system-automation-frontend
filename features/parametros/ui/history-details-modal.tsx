"use client";

import { Calendar, FileText } from "@/shared/ui/icons";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogPanelBody,
  DialogPanelFooter,
  DialogPanelHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import { Typography } from "@/shared/ui/primitives/Typography";
import { Subtitle } from "@/shared/ui/composite/Subtitle";
import type { ParameterHistoryItem } from "@/entities/parametro/model/types";
import { ModalCloseButton } from "./modal-close-button";

interface HistoryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyItem: ParameterHistoryItem | null;
}

export function HistoryDetailsModal({ isOpen, onClose, historyItem }: HistoryDetailsModalProps) {
  // Sem early return: o `<Dialog open={isOpen}>` já cuida do fechado e o item
  // vira guarda de CONTEÚDO. Desmontar a árvore inteira ao fechar tira o
  // `FocusScope` do ar antes de ele devolver o foco (a lista re-renderiza e a
  // linha que tinha o foco pode não ser a mesma) e ainda pula as classes de
  // saída de `dialogContentVariants`.
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* `showCloseButton={false}`: o X vive no canto esquerdo do header, junto
          do título — o botão padrão do DS é absoluto no canto direito e
          colidiria com a data. `aria-describedby={undefined}` porque o diálogo
          não tem um parágrafo único que sirva de descrição. */}
      {historyItem ? (
        <DialogContent
          size="xl"
          surface="panel"
          showCloseButton={false}
          aria-describedby={undefined}
        >
          <DialogPanelHeader className="flex items-center justify-between gap-4 bg-surface p-6">
            <div className="flex items-center gap-4">
              {/* `DialogClose asChild` + `ModalCloseButton`: a aparência sai do
                  Button do DS e o comportamento continua do Radix. */}
              <DialogClose asChild>
                <ModalCloseButton />
              </DialogClose>
              <DialogTitle>Detalhes do Registro Histórico</DialogTitle>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
              <Calendar className="w-4 h-4" />
              {historyItem.date}
            </div>
          </DialogPanelHeader>

          <DialogPanelBody className="p-8">
            <div className="flex justify-between items-start mb-8 gap-4">
              <div>
                <Typography as="h3" variant="h3" className="uppercase tracking-tight">
                  {historyItem.parameter}
                </Typography>
                <p className="text-muted-foreground mt-1">
                  Solicitante: <span className="font-medium text-foreground">{historyItem.requester}</span>
                </p>
              </div>
              <Badge
                variant={historyItem.decision === "Aprovado" ? "success" : "destructive"}
                size="status"
              >
                {historyItem.decision}
              </Badge>
            </div>

            <div className="bg-muted/30 rounded-card p-5 border ds-border-divider mb-6">
              <Subtitle as="h4" className="mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Observações do Administrador
              </Subtitle>
              <p className="text-sm">
                {historyItem.notes}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {historyItem.decision} por: <span className="font-medium text-foreground">{historyItem.admin}</span>
            </div>
          </DialogPanelBody>

          <DialogPanelFooter className="bg-surface p-4">
            <Button onClick={onClose} className="px-8">Fechar</Button>
          </DialogPanelFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
