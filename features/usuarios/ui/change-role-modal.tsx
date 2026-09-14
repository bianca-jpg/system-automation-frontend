"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
import { automation_ROLES, type automationRole } from "@/shared/config/auth/automation-roles";
import { DeleteUserAlertDialog } from "./delete-user-alert-dialog";

interface ChangeRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Identificação do usuário sendo editado (e-mail), só para exibição. */
  userLabel: string;
  /** Papel atual — pode ser um papel legado, fora de automation_ROLES. */
  currentRole: string | null;
  onConfirm: (role: automationRole) => void;
  /** Quando ausente, o botão "Excluir acesso" não é renderizado. */
  onDelete?: () => void;
}

/**
 * Confirmação da troca de papel.
 *
 * Existe por causa de uma regressão: antes a coluna "Ações" tinha um <select>
 * nativo cujo onChange chamava onChangeRole direto, e o PUT de papéis saía no
 * primeiro clique errado — sem confirmar nem desfazer. Aqui a escolha só vira
 * chamada quando o usuário confirma; fechar/cancelar não dispara nada.
 */
export function ChangeRoleModal({
  open,
  onOpenChange,
  userLabel,
  currentRole,
  onConfirm,
  onDelete,
}: ChangeRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<string>(currentRole ?? "");
  const [wasOpen, setWasOpen] = useState(open);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  // O modal fica montado o tempo todo (a tabela precisa disso para o Radix
  // devolver o foco ao gatilho da linha ao fechar), então reabrir o MESMO
  // usuário não passa por um remount que zeraria o estado. Este ajuste é o que
  // garante que uma escolha abandonada num cancelamento anterior não vaze para
  // a próxima abertura. É ajuste durante a renderização
  // (react.dev/learn/you-might-not-need-an-effect), não `useEffect` — o efeito
  // dispararia um segundo render com o valor errado já pintado na tela.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelectedRole(currentRole ?? "");
      setDeleteAlertOpen(false);
    }
  }

  const isLegacyRole = !!currentRole && !automation_ROLES.includes(currentRole as automationRole);
  // Mesma semântica do <select> nativo anterior, que só disparava onChange
  // quando o valor mudava de fato.
  const isUnchanged = !selectedRole || selectedRole === (currentRole ?? "");

  const handleConfirm = () => {
    if (isUnchanged) return;
    onConfirm(selectedRole as automationRole);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="sm" aria-describedby="change-role-description">
          {/* `pr-12` também no mobile: o `DialogCloseButton` é `absolute top-4
              right-4 size-9` em qualquer largura, mas o `DialogHeader` do DS só
              reserva a calha a partir do `sm` — abaixo de 640px o título e a
              descrição passariam por baixo do X. Mesmo ajuste já feito em
              `features/pedidos/ui/modals/new-message-modal.tsx`. */}
          <DialogHeader className="pr-12">
            <DialogTitle>Alterar papel</DialogTitle>
            <DialogDescription id="change-role-description">
              A mudança de permissão só é gravada ao confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="rounded-card border ds-border-card bg-surface p-3">
              <p className="text-xs uppercase tracking-tight text-muted-foreground">Usuário</p>
              <p className="text-sm font-medium text-foreground">{userLabel}</p>
              <p className="mt-2 text-xs uppercase tracking-tight text-muted-foreground">Papel atual</p>
              <p className="text-sm font-medium text-foreground">
                {currentRole ?? "Sem papel atribuído"}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="change-role-select">Novo papel</Label>
              <Select value={selectedRole || undefined} onValueChange={setSelectedRole}>
                <SelectTrigger id="change-role-select" aria-label="Novo papel">
                  <SelectValue placeholder="Selecione um papel" />
                </SelectTrigger>
                <SelectContent>
                  {/* Papel legado (fora de automation_ROLES) continua selecionável,
                      igual à <option> extra que o select nativo renderizava. */}
                  {isLegacyRole && currentRole ? (
                    <SelectItem value={currentRole}>{currentRole}</SelectItem>
                  ) : null}
                  {automation_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            {onDelete ? (
              <Button variant="destructive" onClick={() => setDeleteAlertOpen(true)}>
                Excluir acesso
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={isUnchanged}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {onDelete ? (
        <DeleteUserAlertDialog
          open={deleteAlertOpen}
          onOpenChange={setDeleteAlertOpen}
          userLabel={userLabel}
          onConfirm={() => {
            onDelete();
            onOpenChange(false);
          }}
        />
      ) : null}
    </>
  );
}
