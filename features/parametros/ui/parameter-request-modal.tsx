"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogPanelBody,
  DialogPanelFooter,
  DialogPanelHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/primitives/radio-group";
import { Separator } from "@/shared/ui/primitives/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
import { Typography } from "@/shared/ui/primitives/Typography";
import type { ParameterChangeRequest } from "@/entities/parametro/model/types";
import { ModalCloseButton } from "./modal-close-button";

interface ParameterRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ParameterChangeRequest | null;
  onConfirm: (id: number, decision: "approved" | "rejected") => Promise<void>;
}

const CHANGE_TYPE_LABEL: Record<ParameterChangeRequest["change_type"], string> = {
  create: "Criação de parâmetro",
  update: "Atualização de parâmetro",
  delete: "Exclusão de parâmetro",
};

export function ParameterRequestModal({ isOpen, onClose, request, onConfirm }: ParameterRequestModalProps) {
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sem early return: o `<Dialog open={isOpen}>` já cuida do fechado e a
  // solicitação vira guarda de CONTEÚDO. O gatilho é um `DropdownMenuItem` da
  // tabela de usuários, que sai do DOM ao ser selecionado — desmontar o Dialog
  // inteiro devolveria o foco ao <body> e ainda pularia as classes de saída de
  // `dialogContentVariants`.
  const payload = request?.proposed_payload || {};
  const chave = request?.target_chave || (typeof payload.chave === "string" ? payload.chave : null);

  const handleConfirm = async () => {
    if (!request) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(request.id, decision);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar a decisão.");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      {/* `showCloseButton={false}`: o X fica à esquerda do título (o botão padrão
          do DS é absoluto no canto direito e colidiria com o número da
          solicitação). `aria-describedby={undefined}` porque não há um
          parágrafo único que descreva o diálogo. */}
      {request ? (
        <DialogContent
          size="2xl"
          surface="panel"
          showCloseButton={false}
          aria-describedby={undefined}
        >
          <DialogPanelHeader className="flex items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              {/* `DialogClose asChild` + `ModalCloseButton`: a aparência sai do
                  Button do DS, inclusive o tratamento de `disabled`, e o
                  comportamento continua do Radix. */}
              <DialogClose asChild disabled={isSubmitting}>
                <ModalCloseButton />
              </DialogClose>
              <DialogTitle>Detalhes de Mudança de Parâmetro</DialogTitle>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>Solicitação #{request.id}</span>
              <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
              <span className="font-bold tracking-widest uppercase">OR automation</span>
            </div>
          </DialogPanelHeader>

          <DialogPanelBody className="p-8">
            <div className="mb-8">
              <Typography as="h3" variant="h3" className="uppercase tracking-tight">
                {chave || "(chave não informada)"}
              </Typography>
              <p className="text-muted-foreground mt-1">
                Solicitado por: Usuário #{request.requested_by}
              </p>
            </div>

            {/* Parameter Details Table */}
            <div className="mb-8">
              <Table className="border-b ds-border-divider text-left">
                <TableHeader className="uppercase">
                  <TableRow>
                    <TableHead>Tipo de Mudança</TableHead>
                    <TableHead>Tipo do Valor</TableHead>
                    <TableHead>Valor Proposto</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Realce NEUTRO (`bg-muted/30`, o mesmo do bloco de
                      justificativa abaixo): a linha traz o valor proposto da
                      solicitação, não um estado "informativo". `bg-info/10` é o
                      fundo do Badge `info` do DS e fazia a linha ler como pílula
                      de status. */}
                  <TableRow className="bg-muted/30">
                    <TableCell className="py-4 font-medium">{CHANGE_TYPE_LABEL[request.change_type]}</TableCell>
                    <TableCell className="py-4 text-muted-foreground">
                      {typeof payload.tipo === "string" ? payload.tipo : "—"}
                    </TableCell>
                    <TableCell className="py-4 font-medium">
                      {typeof payload.valor === "string" || typeof payload.valor === "number"
                        ? String(payload.valor)
                        : "—"}
                    </TableCell>
                    <TableCell className="py-4 text-muted-foreground">
                      {typeof payload.descricao === "string" ? payload.descricao : "—"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Justification and Decision */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-bold uppercase mb-2 text-muted-foreground">Descrição do Motivo</h4>
                <p className="text-sm bg-muted/30 p-4 rounded-control border ds-border-divider whitespace-pre-wrap">
                  {request.justification || "Nenhuma justificativa informada."}
                </p>
              </div>

              <div className="bg-surface p-5 rounded-card border ds-border-card">
                <h4 className="text-sm font-bold uppercase mb-4">Decisão do Administrador</h4>

                <RadioGroup
                  value={decision}
                  onValueChange={(value) => setDecision(value as "approved" | "rejected")}
                  disabled={isSubmitting}
                  className="flex flex-row gap-6 mb-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="approved" id="decision-approved" />
                    <Label htmlFor="decision-approved" className="cursor-pointer">Aprovado</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="rejected" id="decision-rejected" />
                    <Label htmlFor="decision-rejected" className="cursor-pointer">Rejeitado</Label>
                  </div>
                </RadioGroup>

                {/* `text-destructive` (token cromático) e não `-text`: o bloco de
                    decisão está sobre `bg-surface` (superfície neutra), onde
                    `-text` renderiza preto no tema claro e o erro perderia o
                    sinal de cor. */}
                {error && (
                  <p role="alert" className="text-xs text-destructive mb-2">{error}</p>
                )}
              </div>
            </div>
          </DialogPanelBody>

          <DialogPanelFooter className="bg-surface p-6 flex-row items-center justify-between sm:justify-between">
            <p className="text-xs text-muted-foreground">© 2026 System Automation. Todos os direitos reservados.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="w-auto px-6">
                Cancelar
              </Button>
              <Button onClick={handleConfirm} loading={isSubmitting} className="w-auto px-6">
                {decision === "approved" ? "Confirmar a aprovação" : "Confirmar a reprovação"}
              </Button>
            </div>
          </DialogPanelFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
