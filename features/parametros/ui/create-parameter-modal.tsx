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

interface NovoParametroValue {
  nome: string;
  tipo: string;
  valor: string;
  descricao: string;
}

interface CreateParameterModalProps {
  isOpen: boolean;
  onClose: () => void;
  novoParam: NovoParametroValue;
  onChangeNovoParam: (value: NovoParametroValue) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
  modalFeedback: { tipo: "sucesso" | "erro"; texto: string } | null;
}

export function CreateParameterModal({
  isOpen,
  onClose,
  novoParam,
  onChangeNovoParam,
  onSubmit,
  isSubmitting,
  modalFeedback,
}: CreateParameterModalProps) {
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [estavaAberto, setEstavaAberto] = useState(isOpen);

  // O modal continua montado quando fecha (o pai só alterna `isOpen`), então o
  // aviso de validação de uma tentativa anterior sobreviveria à reabertura.
  // Ajuste durante a renderização (react.dev/learn/you-might-not-need-an-effect),
  // não `useEffect` — o efeito ainda pintaria o aviso velho num primeiro render.
  if (isOpen !== estavaAberto) {
    setEstavaAberto(isOpen);
    if (isOpen) setTentouEnviar(false);
  }

  // Sem `if (!isOpen) return null`: o `<Dialog open={isOpen}>` abaixo já não
  // pinta conteúdo nenhum quando fechado, e desmontar a árvore inteira faria a
  // subárvore do Radix pular o `data-state=closed` — perdendo a animação de
  // saída declarada em `dialogContentVariants` (fade-out/zoom-out) e a devolução
  // de foco ao gatilho.

  // O campo Valor do tipo booleano era um <select required>, e quem barrava o
  // submit vazio era o navegador. O Select do design system é Radix (botão +
  // portal), não é um <select> e não participa da validação nativa do
  // formulário — por isso a checagem passou a ser explícita aqui, com aviso
  // visível. Os demais campos obrigatórios continuam sendo <input required>.
  // Mesma checagem do edit-parameter-modal: só aceita os dois valores que
  // existem como `SelectItem`. Aqui o campo sempre começa vazio, mas manter o
  // critério idêntico evita que os dois modais divirjam.
  const ehNumerico = novoParam.tipo === "float" || novoParam.tipo === "int";

  const valorBooleanoPendente =
    novoParam.tipo === "bool" &&
    novoParam.valor !== "true" &&
    novoParam.valor !== "false";
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
      {/* `aria-describedby={undefined}`: o diálogo é um formulário, não tem um
          parágrafo único que sirva de descrição para leitores de tela. */}
      <DialogContent size="sm" surface="panel" aria-describedby={undefined}>
        <DialogPanelHeader className="bg-muted/30 px-6 py-4 pr-12">
          <DialogTitle>Solicitar Novo Parâmetro</DialogTitle>
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
              <Label htmlFor="create-param-nome">Nome do Parâmetro</Label>
              <Input
                id="create-param-nome"
                type="text"
                required
                value={novoParam.nome}
                onChange={e => onChangeNovoParam({...novoParam, nome: e.target.value})}
                placeholder="Ex: mudança de Margem de Adequação"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-param-tipo">Tipo</Label>
              <Select
                value={novoParam.tipo}
                onValueChange={tipo => onChangeNovoParam({...novoParam, tipo})}
              >
                <SelectTrigger id="create-param-tipo" aria-label="Tipo">
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
              <Label htmlFor="create-param-valor">
                Valor Desejado <span className="text-muted-foreground font-normal text-xs ml-1">(Qual será o valor aplicado inicialmente)</span>
              </Label>
              {novoParam.tipo === 'bool' ? (
                <>
                  <Select
                    value={novoParam.valor}
                    onValueChange={valor => onChangeNovoParam({...novoParam, valor})}
                  >
                    <SelectTrigger
                      id="create-param-valor"
                      aria-label="Valor Desejado"
                      // O variant do gatilho não traz regra `aria-invalid:*`
                      // (o do Input traz), então sem esta classe o campo com
                      // erro ficaria idêntico ao normal — só a mensagem abaixo
                      // sinalizaria.
                      className="aria-invalid:ds-border-destructive-strong"
                      aria-invalid={mostrarErroValor || undefined}
                      aria-describedby={mostrarErroValor ? "create-param-valor-erro" : undefined}
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
                    <p id="create-param-valor-erro" role="alert" className="text-xs text-destructive">
                      Selecione o valor desejado (Sim ou Não).
                    </p>
                  )}
                </>
              ) : (
                <Input
                  id="create-param-valor"
                  type="text"
                  required
                  // Ver edit-parameter-modal: `type="number"` guarda ponto
                  // decimal no DOM e ignora a vírgula do usuário brasileiro.
                  inputMode={ehNumerico ? (novoParam.tipo === 'int' ? 'numeric' : 'decimal') : undefined}
                  value={novoParam.valor}
                  onChange={e => onChangeNovoParam({
                    ...novoParam,
                    valor: ehNumerico
                      ? mascararNumeroBr(e.target.value, { inteiro: novoParam.tipo === 'int' })
                      : e.target.value,
                  })}
                  placeholder={novoParam.tipo === 'int' ? "Ex: 25" : novoParam.tipo === 'float' ? "Ex: 10,5" : "Ex: valor do texto"}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-param-descricao">Descrição</Label>
              <Textarea
                id="create-param-descricao"
                value={novoParam.descricao} onChange={e => onChangeNovoParam({...novoParam, descricao: e.target.value})}
                className="resize-none"
                rows={3} placeholder="Para que serve este parâmetro?"
              />
            </div>
          </DialogPanelBody>

          <DialogPanelFooter className="p-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Solicitar Criação'}
            </Button>
          </DialogPanelFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
