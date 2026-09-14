"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Dialog,
  DialogContent,
  DialogPanelBody,
  DialogPanelFooter,
  DialogPanelHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { mascararNumeroBr } from "@/shared/lib/format/numero-br";
import type { ParameterEditDraft } from "@/entities/parametro/model/types";

interface EditParameterModalProps {
  isOpen: boolean;
  onClose: () => void;
  paramToEdit: ParameterEditDraft | null;
  onChangeParamToEdit: (value: ParameterEditDraft) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
  modalFeedback: { tipo: "sucesso" | "erro"; texto: string } | null;
}

export function EditParameterModal({
  isOpen,
  onClose,
  paramToEdit,
  onChangeParamToEdit,
  onSubmit,
  isSubmitting,
  modalFeedback,
}: EditParameterModalProps) {
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [estavaAberto, setEstavaAberto] = useState(isOpen);

  // Ver create-parameter-modal: o modal segue montado ao fechar, então o aviso
  // de validação é zerado a cada reabertura, durante a renderização.
  if (isOpen !== estavaAberto) {
    setEstavaAberto(isOpen);
    if (isOpen) setTentouEnviar(false);
  }

  // Sem early return: o `<Dialog open={isOpen}>` já cuida do fechado, e o alvo
  // vira guarda de CONTEÚDO (`{paramToEdit ? <DialogContent/> : null}`) lá
  // embaixo. Desmontar a árvore inteira ao fechar tiraria o `FocusScope` do ar
  // antes de ele devolver o foco — e o gatilho é um `DropdownMenuItem`, que já
  // saiu do DOM, então o foco cairia no <body>.

  // Ver create-parameter-modal: o Valor booleano era um <select required> e o
  // navegador barrava o submit vazio. O Select do design system é Radix e não
  // participa da validação nativa, então a checagem é explícita aqui.
  // Não basta checar vazio: o backend pode devolver o booleano como "True",
  // "False", "1" ou "0", e `handleEditClick` repassa `param.value` sem
  // normalizar. Um valor fora do conjunto aceito não casa com nenhum
  // `SelectItem` — o gatilho renderiza em branco e, se só testássemos vazio,
  // o submit passaria com o valor cru. O `<select required>` anterior barrava
  // isso porque o React caía na primeira option (value="") e o navegador
  // bloqueava o envio; a validação explícita precisa cobrir o mesmo caso.
  const ehNumerico = paramToEdit?.tipo === "float" || paramToEdit?.tipo === "int";
  const placeholderValor =
    paramToEdit?.tipo === "int" ? "Ex: 25" : paramToEdit?.tipo === "float" ? "Ex: 10,5" : "Ex: valor do texto";

  const valorBooleanoPendente =
    paramToEdit?.tipo === "bool" &&
    paramToEdit.valor !== "true" &&
    paramToEdit.valor !== "false";
  const mostrarErroValor = tentouEnviar && valorBooleanoPendente;

  const handleSubmit = (e: React.FormEvent) => {
    setTentouEnviar(true);
    if (valorBooleanoPendente) {
      e.preventDefault();
      return;
    }
    void onSubmit(e);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* Guarda de CONTEÚDO, não de montagem: o <Dialog> fica montado e só o
          painel depende do alvo (ver a nota sobre foco no topo do componente).
          `aria-describedby={undefined}`: o diálogo é um formulário, não tem um
          parágrafo único que sirva de descrição para leitores de tela. */}
      {paramToEdit ? (
        <DialogContent size="sm" surface="panel" aria-describedby={undefined}>
          <DialogPanelHeader className="bg-muted/30 px-6 py-4 pr-12">
            <DialogTitle>Editar Parâmetro</DialogTitle>
          </DialogPanelHeader>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <DialogPanelBody className="space-y-4 p-6">
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

              <div className="space-y-1.5">
                <Label htmlFor="edit-param-nome">Nome do Parâmetro</Label>
                <Input
                  id="edit-param-nome"
                  type="text" required
                  placeholder="Ex: margem_adequacao"
                  value={paramToEdit.nome} onChange={e => onChangeParamToEdit({...paramToEdit, nome: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-param-tipo">Tipo</Label>
                <Select
                  value={paramToEdit.tipo}
                  onValueChange={tipo => onChangeParamToEdit({...paramToEdit, tipo})}
                >
                  <SelectTrigger id="edit-param-tipo" aria-label="Tipo">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">Texto (Palavras, frases ou nomes)</SelectItem>
                    <SelectItem value="float">Número Decimal (Valores quebrados ou percentuais, ex: 10,5)</SelectItem>
                    <SelectItem value="int">Número Inteiro (Valores exatos, ex: 10 ou 25)</SelectItem>
                    <SelectItem value="bool">Booleano (Apenas opções de Sim ou Não)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-param-valor">Valor</Label>
                {paramToEdit.tipo === 'bool' ? (
                  <>
                    <Select
                      value={paramToEdit.valor}
                      onValueChange={valor => onChangeParamToEdit({...paramToEdit, valor})}
                    >
                      <SelectTrigger
                        id="edit-param-valor"
                        aria-label="Valor"
                        // Ver create-parameter-modal: o variant do gatilho não
                        // tem regra `aria-invalid:*`, então o destaque de erro
                        // precisa vir daqui.
                        className="aria-invalid:ds-border-destructive-strong"
                        aria-invalid={mostrarErroValor || undefined}
                        aria-describedby={mostrarErroValor ? "edit-param-valor-erro" : undefined}
                      >
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Sim (true)</SelectItem>
                        <SelectItem value="false">Não (false)</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* `text-destructive` (token cromático) e não `-text`: o aviso
                        fica sobre a superfície neutra do formulário, onde `-text`
                        renderiza preto no tema claro e o erro perderia o sinal. */}
                    {mostrarErroValor && (
                      <p id="edit-param-valor-erro" role="alert" className="text-xs text-destructive">
                        Selecione o valor (Sim ou Não).
                      </p>
                    )}
                  </>
                ) : (
                  <Input
                    id="edit-param-valor"
                    type="text"
                    required
                    // `type="number"` guarda o valor com PONTO decimal no DOM e
                    // ignora a vírgula que o usuário brasileiro digita. Como
                    // este é um app pt-BR, o campo é texto com máscara e o
                    // `inputMode` é quem traz o teclado numérico no celular.
                    inputMode={ehNumerico ? (paramToEdit.tipo === 'int' ? 'numeric' : 'decimal') : undefined}
                    placeholder={placeholderValor}
                    value={paramToEdit.valor}
                    onChange={e => onChangeParamToEdit({
                      ...paramToEdit,
                      valor: ehNumerico
                        ? mascararNumeroBr(e.target.value, { inteiro: paramToEdit.tipo === 'int' })
                        : e.target.value,
                    })}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-param-descricao">Descrição</Label>
                <Textarea
                  id="edit-param-descricao"
                  value={paramToEdit.descricao} onChange={e => onChangeParamToEdit({...paramToEdit, descricao: e.target.value})}
                  placeholder="Para que serve este parâmetro?"
                  className="resize-none"
                  rows={3}
                />
              </div>
            </DialogPanelBody>

            <DialogPanelFooter className="p-6">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogPanelFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
