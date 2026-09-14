"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

import { Check, Moon, Settings, Sun, User } from "@/shared/ui/icons";
import { cn } from "@/shared/lib/cn";
import { iniciaisDoNome } from "@/shared/lib/iniciais";
import { Avatar, AvatarFallback } from "@/shared/ui/primitives/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogPanelBody,
  DialogPanelHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { Pressable } from "@/shared/ui/primitives/pressable";
import { Separator } from "@/shared/ui/primitives/separator";
import { Switch } from "@/shared/ui/primitives/switch";
import { Typography } from "@/shared/ui/primitives/Typography";
import { useTheme } from "@/shared/ui/primitives/use-theme";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SECOES = [
  { id: "informacoes", label: "Informações", icon: User },
  { id: "tema", label: "Tema", icon: Sun },
] as const;

type SecaoId = (typeof SECOES)[number]["id"];

/**
 * Modal de configurações do painel, espelhando o manager do Ara
 * (`features/preferences/components/settings-modal.tsx`): navegação de seções
 * à esquerda, conteúdo à direita.
 *
 * A seção Tema já existia; Informações entrou na quick 260908-prf, quando o
 * backend passou a capturar o nome do SSO.
 */
export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoId>("informacoes");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      {/* `2xl` e não `md`: duas colunas no mesmo diálogo pedem largura, senão a
          coluna de conteúdo fica estreita demais para os campos em par. */}
      <DialogContent size="2xl" surface="panel">
        <DialogPanelHeader className="bg-sidebar/50">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 shrink-0" aria-hidden />
            <DialogTitle>Configurações</DialogTitle>
          </div>
          <DialogDescription className="mt-1">
            Seus dados de acesso e a aparência do painel.
          </DialogDescription>
        </DialogPanelHeader>

        <DialogPanelBody className="p-0">
          {/* Empilha no mobile e vira duas colunas a partir de `sm`: uma
              navegação lateral de 2 itens não cabe ao lado do conteúdo numa
              tela de celular. */}
          <div className="flex flex-col sm:flex-row">
            <nav
              aria-label="Seções das configurações"
              className="shrink-0 border-b ds-border-divider p-2 sm:w-52 sm:border-b-0 sm:border-r"
            >
              <div className="flex gap-1 sm:flex-col">
                {SECOES.map((secao) => {
                  const Icon = secao.icon;
                  const ativa = secaoAtiva === secao.id;

                  return (
                    <Pressable
                      key={secao.id}
                      type="button"
                      onClick={() => setSecaoAtiva(secao.id)}
                      pressed={ativa}
                      aria-current={ativa ? "true" : undefined}
                      className={cn(
                        "flex flex-1 cursor-pointer items-center gap-2 rounded-control px-3 py-2 text-left transition-colors sm:flex-none",
                        ativa
                          ? "bg-muted/40 text-foreground"
                          : "text-muted-foreground hover:bg-hover-soft hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <Typography variant="small" className="font-medium">
                        {secao.label}
                      </Typography>
                    </Pressable>
                  );
                })}
              </div>
            </nav>

            <div className="min-w-0 flex-1 p-6">
              {secaoAtiva === "informacoes" ? <SecaoInformacoes /> : <SecaoTema />}
            </div>
          </div>
        </DialogPanelBody>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Perfil da pessoa logada, em modo leitura.
 *
 * Nada aqui é editável de propósito: nome e e-mail vêm do diretório
 * corporativo e são reescritos pelo backend a cada login (`sign_in_microsoft`
 * grava o claim `name`), então um campo editável prometeria uma alteração que
 * o próximo acesso desfaria em silêncio. O papel, por definição, só muda por
 * um administrador.
 *
 * Os dados saem da sessão do NextAuth, que já os carrega — sem fetch próprio,
 * sem estado de carregamento, sem uma segunda fonte de verdade para o mesmo
 * dado. O endpoint `GET /api/auth/users/me` existe para quem precisar do
 * perfil fresco fora da sessão.
 */
function SecaoInformacoes() {
  const { data: session } = useSession();
  const user = session?.user;

  const nome = user?.name ?? "";
  const email = user?.email ?? "";
  // Nome ausente cai no e-mail (conta que ainda não relogou desde a migration
  // 036) — e de e-mail não se tira inicial que signifique algo.
  const nomeReal = nome && !nome.includes("@") ? nome : "";
  const iniciais = iniciaisDoNome(nomeReal);

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="small" className="font-medium">
          Informações
        </Typography>
        <Typography variant="caption" className="text-muted-foreground">
          Seus dados vêm do login corporativo e não são editáveis aqui.
        </Typography>
      </div>

      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 border ds-border-surface">
          <AvatarFallback className="bg-background text-foreground">
            {iniciais ? (
              <span className="text-base font-semibold leading-none">{iniciais}</span>
            ) : (
              <User className="h-6 w-6" aria-hidden />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <Typography variant="small" className="truncate font-medium">
            {nomeReal || email || "Usuário"}
          </Typography>
          {user?.roleTitle && (
            <Typography variant="caption" className="text-muted-foreground">
              {user.roleTitle}
            </Typography>
          )}
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoLeitura
          id="perfil-nome"
          label="Nome"
          value={nomeReal}
          vazio="Disponível no próximo login"
        />
        <CampoLeitura id="perfil-email" label="E-mail corporativo" value={email} />
        <CampoLeitura
          id="perfil-nivel"
          label="Nível de acesso"
          value={user?.roleTitle ?? ""}
        />
      </div>
    </div>
  );
}

/**
 * Campo de perfil em modo leitura.
 *
 * `readOnly` em vez de `disabled`: campo desabilitado sai da ordem de
 * tabulação e não é anunciado por leitor de tela, o que esconderia o dado de
 * quem navega por teclado — e o dado é justamente o conteúdo da tela.
 */
function CampoLeitura({
  id,
  label,
  value,
  vazio = "Não informado",
}: {
  id: string;
  label: string;
  value: string;
  vazio?: string;
}) {
  const preenchido = value.trim().length > 0;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        readOnly
        value={preenchido ? value : vazio}
        aria-label={preenchido ? undefined : `${label}: ${vazio}`}
        className={cn(
          "cursor-default bg-muted/20",
          !preenchido && "text-muted-foreground italic",
        )}
      />
    </div>
  );
}

/**
 * Tema em dois eixos independentes, ambos do provider do design system: a
 * paleta de cor (`data-theme`) e o modo claro/escuro (`.light`/`.dark`).
 */
function SecaoTema() {
  const { colorTheme, setColorTheme, colorThemes, resolvedTheme, setTheme } =
    useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <div className="space-y-6">
      {/* Paleta de cores (eixo `data-theme`) */}
      <div>
        <Typography variant="small" className="mb-1 font-medium">
          Paleta de cores
        </Typography>
        <Typography variant="caption" className="mb-3 text-muted-foreground">
          Escolha a cor base da interface. Vale para o modo claro e o escuro.
        </Typography>
        <div className="flex flex-wrap gap-3">
          {colorThemes.map((theme) => {
            const isSelected = colorTheme === theme.id;

            return (
              <Pressable
                key={theme.id}
                type="button"
                onClick={() => setColorTheme(theme.id)}
                className="flex cursor-pointer flex-col items-center gap-1.5 transition-all"
                aria-label={`Selecionar tema ${theme.label}`}
                pressed={isSelected}
              >
                {/* As cores da bolinha vêm do próprio registro de temas do
                    design system (`swatch`), não de hex escrito aqui: é a
                    prévia da paleta, e cada tema traz a sua. */}
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 ds-border-surface transition-all",
                    isSelected
                      ? "ring-1 ring-primary ring-offset-1 ring-offset-background"
                      : "hover:scale-110",
                  )}
                  style={{ backgroundColor: theme.swatch.surface }}
                >
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.swatch.accent }}
                  >
                    {isSelected && (
                      <Check
                        className="h-3.5 w-3.5 text-secondary-foreground"
                        strokeWidth={3}
                      />
                    )}
                  </div>
                </div>
                <Typography
                  variant="caption"
                  className={cn(
                    "text-center transition-colors",
                    isSelected
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {theme.label}
                </Typography>
              </Pressable>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Modo claro/escuro (eixo `.light`/`.dark`) */}
      {/* `rounded-control` (token) e não `rounded-lg` (0.5rem da escala crua
          do Tailwind): o bloco convive com superfícies em `rounded-card` e
          `rounded-full` vindas do DS. */}
      <div className="flex items-center justify-between rounded-control border ds-border-surface bg-muted/20 p-4">
        <div className="flex items-center gap-3">
          {isDark ? (
            <Moon className="h-5 w-5" aria-hidden />
          ) : (
            <Sun className="h-5 w-5" aria-hidden />
          )}
          <div>
            <Typography variant="small" className="font-medium">
              {isDark ? "Modo escuro" : "Modo claro"}
            </Typography>
            <Typography variant="caption" className="text-muted-foreground">
              {isDark
                ? "Interface com cores escuras"
                : "Interface com cores claras"}
            </Typography>
          </div>
        </div>
        <Switch
          checked={isDark}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          aria-label="Alternar modo escuro"
        />
      </div>
    </div>
  );
}
