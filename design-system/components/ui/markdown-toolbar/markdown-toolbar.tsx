"use client";

import { Bold, Heading1, Italic, Link2, List, ListOrdered } from "lucide-react";

import { cn } from "../../../lib/utils";
import { Button } from "../button";

export type MarkdownToolbarAction =
  | "bold"
  | "italic"
  | "bullet-list"
  | "ordered-list"
  | "heading"
  | "link";

type MarkdownToolbarProps = {
  onAction: (action: MarkdownToolbarAction) => void;
  disabled?: boolean;
  className?: string;
  actions?: MarkdownToolbarAction[];
};

const DEFAULT_ACTIONS: MarkdownToolbarAction[] = [
  "bold",
  "italic",
  "bullet-list",
  "ordered-list",
  "heading",
  "link",
];

const ACTION_CONFIG: Record<
  MarkdownToolbarAction,
  {
    icon: typeof Bold;
    label: string;
  }
> = {
  bold: { icon: Bold, label: "Negrito" },
  italic: { icon: Italic, label: "Itálico" },
  "bullet-list": { icon: List, label: "Lista com marcadores" },
  "ordered-list": { icon: ListOrdered, label: "Lista numerada" },
  heading: { icon: Heading1, label: "Título" },
  link: { icon: Link2, label: "Link" },
};

export function MarkdownToolbar({
  onAction,
  disabled = false,
  className,
  actions = DEFAULT_ACTIONS,
}: MarkdownToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Ferramentas de formatação markdown"
      data-slot="markdown-toolbar"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border ds-border-surface bg-muted/30 p-2",
        className,
      )}
    >
      {actions.map((action) => {
        const config = ACTION_CONFIG[action];
        const Icon = config.icon;

        return (
          <Button
            key={action}
            type="button"
            variant="outline"
            size="icon-sm"
            data-slot="markdown-toolbar-button"
            className="h-8 w-8 bg-background"
            disabled={disabled}
            onClick={() => onAction(action)}
            title={config.label}
            aria-label={config.label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
}
