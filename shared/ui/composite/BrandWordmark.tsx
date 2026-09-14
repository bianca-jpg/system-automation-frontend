"use client";

import { cn } from "@/shared/lib/cn";

interface BrandWordmarkProps {
  className?: string;
  size?: "xs" | "sm" | "lg";
  variant?: "default" | "on-foreground";
}

export function BrandWordmark({ className, size = "sm", variant = "default" }: BrandWordmarkProps) {
  const textColor = variant === "on-foreground" ? "text-background" : "text-foreground";
  // `xs` é o tamanho usado no cromo do app-shell (header e fallback da sidebar),
  // onde a wordmark acompanha texto de UI e não pode competir com o conteúdo.
  //
  // EXCEÇÃO CONSCIENTE À ESCALA DO DESIGN SYSTEM (`lg` e o `tracking` abaixo):
  // esta é a única peça do app acima do teto tipográfico do DS — `text-8xl` são
  // 6rem contra 2.5rem do maior degrau (`h1` do `Typography`), e o DS também
  // não expõe token de `letter-spacing`, então `tracking-[0.25em]` não tem
  // equivalente. Não é descuido: é marca em tela de login, papel de display e
  // não de texto de UI. Se um dia o DS ganhar uma variante "display"/"wordmark",
  // este arquivo deve passar a consumi-la em vez de manter valores próprios.
  const sizeClass =
    size === "lg" ? "text-6xl md:text-8xl" : size === "xs" ? "text-sm" : "text-xl";

  return (
    <div className={cn("flex items-center", className)}>
      <span
        className={cn(
          "font-heading font-bold uppercase tracking-[0.25em] select-none",
          textColor,
          sizeClass,
        )}
      >
        OR automation
      </span>
    </div>
  );
}
