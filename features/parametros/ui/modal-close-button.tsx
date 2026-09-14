"use client";

import { X } from "@/shared/ui/icons";
import { Button } from "@/shared/ui/button";

/**
 * Botão de fechar reposto no cabeçalho dos modais de parâmetros.
 *
 * O `DialogCloseButton` do design system não serve aqui: ele é absoluto no canto
 * direito do `DialogContent`, e nestes modais o X fica na linha do título — à
 * esquerda dele nos `Dialog` (senão colidiria com a data / o número da
 * solicitação), à direita no `AlertDialog`, que nem injeta botão de fechar.
 *
 * A APARÊNCIA continua saindo do variant `ghost` + `size="icon"` do Button do DS
 * (mesma métrica `size-9` do `DialogCloseButton`), inclusive o tratamento de
 * `disabled`; só o recorte redondo e a cor de repouso ficam por className. Como
 * repassa todas as props ao Button, funciona como filho de `DialogClose asChild`
 * — o comportamento de fechar continua do Radix.
 */
export function ModalCloseButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Fechar"
      className={
        className
          ? `${className} rounded-full text-muted-foreground hover:bg-hover-soft hover:text-foreground`
          : "rounded-full text-muted-foreground hover:bg-hover-soft hover:text-foreground"
      }
      {...props}
    >
      <X className="size-5" />
    </Button>
  );
}
