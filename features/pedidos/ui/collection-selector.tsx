"use client";

import { cn } from "@/shared/lib/cn";
import { getColecaoVigente } from "@/shared/lib/colecao";

interface CollectionSelectorProps {
  selectedCollection: number;
}

export function CollectionSelector({ selectedCollection }: CollectionSelectorProps) {
  const vigente = getColecaoVigente();
  // Só há dois estados alcançáveis: a coleção montada é a vigente, ou o app
  // atravessou a virada de semestre com a tela aberta e ela virou passada.
  const isVigenteSelected = selectedCollection === vigente;

  return (
    <div className="flex items-center gap-2 bg-card border ds-border-card shadow-control px-4 py-2 rounded-pill text-sm font-bold text-foreground">
      {/* `bg-primary` (brand-ink-strong) e `bg-foreground` (brand-ink) são a
          mesma tinta nos dois modos — o estado "coleção passada" ficava
          idêntico ao "vigente". `bg-muted-foreground` mantém os dois estados
          distinguíveis sem trocar a cor do estado vigente. */}
      <span className={cn(
        "w-2.5 h-2.5 rounded-full",
        isVigenteSelected ? "bg-foreground" : "bg-muted-foreground"
      )} />
      <span>
        Coleção: {selectedCollection} {isVigenteSelected ? "(Vigente)" : ""}
      </span>
    </div>
  );
}
