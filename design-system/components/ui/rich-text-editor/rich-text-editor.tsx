"use client";

import * as React from "react";
import {
  EditorContent,
  Extension,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Sparkles,
} from "lucide-react";

import { cn } from "../../../lib/utils";
import { Button } from "../button";
import { Input } from "../input";
import { Label } from "../label";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Spinner } from "../spinner";

export type AiImproveMode = "grammar" | "regenerate";

export interface RichTextEditorAiAssist {
  /**
   * Improve the current markdown. Returns the improved markdown, or null to keep
   * the current content (e.g. on error — the caller surfaces the message).
   */
  onImprove: (text: string, mode: AiImproveMode) => Promise<string | null>;
}

export interface RichTextEditorProps {
  /** Markdown content. */
  value: string;
  /** Called with the serialized markdown on every edit. */
  onChange: (markdown: string) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  /** Maximum number of visible text characters. Formatting markers do not count. */
  maxLength?: number;
  /** Focus the editor when it mounts (use for edit-on-click flows). */
  autoFocus?: boolean;
  /** When provided, shows a right-aligned "improve with AI" button in the toolbar. */
  aiAssist?: RichTextEditorAiAssist | undefined;
}

// tiptap-markdown adds `storage.markdown` at runtime but does not augment the
// Editor storage type, so we read it through a narrow cast.
function readMarkdown(editor: Editor): string {
  const storage = editor.storage as {
    markdown?: { getMarkdown?: () => string };
  };
  return storage.markdown?.getMarkdown?.() ?? "";
}

function countEditorCharacters(editor: Editor): number {
  return editor.getText({ blockSeparator: "\n" }).length;
}

function normalizeMaxLength(maxLength: number | undefined): number | undefined {
  if (maxLength === undefined || !Number.isFinite(maxLength)) return undefined;
  return Math.max(0, Math.floor(maxLength));
}

function countDocumentCharacters(document: {
  content: { size: number };
  textBetween: (
    from: number,
    to: number,
    blockSeparator?: string,
    leafText?: string,
  ) => string;
}): number {
  return document.textBetween(0, document.content.size, "\n", "\n").length;
}

function createCharacterLimitExtension(
  maxLengthRef: React.RefObject<number | undefined>,
  bypassLimitRef: React.RefObject<boolean>,
) {
  return Extension.create({
    name: "richTextEditorCharacterLimit",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          filterTransaction: (transaction, state) => {
            const limit = maxLengthRef.current;
            if (
              bypassLimitRef.current ||
              !transaction.docChanged ||
              limit === undefined
            ) {
              return true;
            }

            const previousCount = countDocumentCharacters(state.doc);
            const nextCount = countDocumentCharacters(transaction.doc);
            return nextCount <= limit || nextCount <= previousCount;
          },
        }),
      ];
    },
  });
}

function normalizeLinkUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    const allowedProtocols = ["http:", "https:", "mailto:"];
    return allowedProtocols.includes(parsed.protocol)
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

// The class is applied to the contenteditable (.ProseMirror) element itself.
// `markdown-content` reuses the design-system markdown styles (lists, headings…).
const EDITOR_CLASS = cn(
  "markdown-content max-h-72 min-h-32 w-full overflow-y-auto rounded-md border ds-border-control bg-background px-3 py-2 text-sm text-foreground outline-none",
  " focus-visible:ds-focus-ring ",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className={cn(
        "h-8 w-8 bg-background",
        active && "border-primary/40 bg-primary/10 text-primary",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
    </Button>
  );
}

/**
 * WYSIWYG markdown editor. Formatting is applied live (bold shows bold, no raw
 * `**`), toolbar actions toggle on/off, and the value is read/written as markdown
 * so it stays compatible with the existing `*_md` fields. Shared across the chat
 * "Lousa" and the vacancy description editor. Optionally exposes an AI assist
 * button (grammar fix / regenerate) via the `aiAssist` prop.
 */
export function RichTextEditor({
  value,
  onChange,
  disabled = false,
  className,
  ariaLabel = "Editor de texto rico",
  maxLength,
  autoFocus = false,
  aiAssist,
}: RichTextEditorProps) {
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiOpen, setAiOpen] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkError, setLinkError] = React.useState<string | null>(null);
  const [characterCount, setCharacterCount] = React.useState(0);
  const statusId = React.useId();
  const linkInputId = React.useId();
  const normalizedMaxLength = normalizeMaxLength(maxLength);
  const maxLengthRef = React.useRef(normalizedMaxLength);
  const bypassLimitRef = React.useRef(false);
  const onChangeRef = React.useRef(onChange);
  maxLengthRef.current = normalizedMaxLength;
  onChangeRef.current = onChange;
  const characterLimitExtension = React.useMemo(
    () => createCharacterLimitExtension(maxLengthRef, bypassLimitRef),
    [],
  );

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    autofocus: autoFocus ? "end" : false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      Markdown.configure({
        html: false,
        linkify: true,
        breaks: true,
        bulletListMarker: "-",
        transformPastedText: true,
        transformCopiedText: true,
      }),
      characterLimitExtension,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: EDITOR_CLASS,
        role: "textbox",
        "aria-label": ariaLabel,
        "aria-describedby": statusId,
        "aria-multiline": "true",
        "aria-disabled": disabled ? "true" : "false",
      },
    },
    onUpdate: ({ editor }) => {
      setCharacterCount(countEditorCharacters(editor));
      onChangeRef.current(readMarkdown(editor));
    },
  });

  // Sync external value changes (panel open / rebase after save) without emitting
  // an update (which would loop back into onChange).
  React.useEffect(() => {
    if (!editor) return;
    if (value !== readMarkdown(editor)) {
      bypassLimitRef.current = true;
      try {
        editor.commands.setContent(value, { emitUpdate: false });
      } finally {
        bypassLimitRef.current = false;
      }
    }
    setCharacterCount(countEditorCharacters(editor));
  }, [value, editor]);

  // Lock the editor while disabled OR while an AI action is running.
  React.useEffect(() => {
    editor?.setEditable(!disabled && !aiBusy);
  }, [disabled, aiBusy, editor]);

  React.useEffect(() => {
    if (!editor) return;
    const editorElement = editor.view.dom;
    editorElement.setAttribute("role", "textbox");
    editorElement.setAttribute("aria-label", ariaLabel);
    editorElement.setAttribute("aria-describedby", statusId);
    editorElement.setAttribute("aria-multiline", "true");
    editorElement.setAttribute(
      "aria-disabled",
      disabled || aiBusy ? "true" : "false",
    );
  }, [ariaLabel, statusId, disabled, aiBusy, editor]);

  React.useEffect(() => {
    if (disabled || aiBusy) {
      setAiOpen(false);
      setLinkOpen(false);
    }
  }, [disabled, aiBusy]);

  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      bulletList: editor?.isActive("bulletList") ?? false,
      orderedList: editor?.isActive("orderedList") ?? false,
      heading: editor?.isActive("heading", { level: 2 }) ?? false,
      link: editor?.isActive("link") ?? false,
    }),
  });
  const controlsDisabled = disabled || aiBusy;

  const handleLinkOpenChange = React.useCallback(
    (isOpen: boolean) => {
      if (isOpen && (!editor || controlsDisabled)) return;
      setLinkOpen(isOpen);
      setLinkError(null);
      if (isOpen && editor) {
        const previousUrl =
          (editor.getAttributes("link").href as string | undefined) ?? "";
        setLinkUrl(previousUrl);
      }
    },
    [controlsDisabled, editor],
  );

  const handleLinkSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editor || controlsDisabled) return;
      const safeUrl = normalizeLinkUrl(linkUrl);
      if (!safeUrl) {
        setLinkError("Informe uma URL http, https ou mailto válida.");
        return;
      }
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: safeUrl })
        .run();
      setLinkOpen(false);
      setLinkError(null);
    },
    [controlsDisabled, editor, linkUrl],
  );

  const handleRemoveLink = React.useCallback(() => {
    if (!editor || controlsDisabled) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
    setLinkError(null);
  }, [controlsDisabled, editor]);

  const handleAiImprove = React.useCallback(
    async (mode: AiImproveMode) => {
      if (!editor || !aiAssist || aiBusy) return;
      setAiOpen(false);
      setAiBusy(true);
      try {
        const previousMarkdown = readMarkdown(editor);
        const improved = await aiAssist.onImprove(readMarkdown(editor), mode);
        if (improved != null && improved.trim()) {
          editor.commands.setContent(improved, { emitUpdate: false });
          const nextMarkdown = readMarkdown(editor);
          setCharacterCount(countEditorCharacters(editor));
          // A character-limit filter can reject oversized AI output. Only emit
          // when content was actually applied.
          if (nextMarkdown !== previousMarkdown) {
            onChangeRef.current(nextMarkdown);
          }
        }
      } finally {
        setAiBusy(false);
      }
    },
    [editor, aiAssist, aiBusy],
  );

  if (!editor) {
    return (
      <div className={cn("flex flex-col gap-2", className)} aria-busy="true">
        <div className="h-12 rounded-lg border ds-border-surface bg-muted/30" />
        <div className="min-h-32 rounded-md border ds-border-control bg-background" />
      </div>
    );
  }

  const characterStatus =
    normalizedMaxLength === undefined
      ? `${characterCount} caracteres`
      : `${characterCount}/${normalizedMaxLength} caracteres`;
  const isAtCharacterLimit =
    normalizedMaxLength !== undefined && characterCount >= normalizedMaxLength;
  const accessibleStatus = aiBusy
    ? "Processando texto..."
    : isAtCharacterLimit
      ? `Limite de ${normalizedMaxLength} caracteres atingido.`
      : "";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="toolbar"
        aria-label="Ferramentas de formatação"
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-lg border ds-border-surface bg-muted/30 p-2",
          aiBusy && "opacity-70",
        )}
      >
        <ToolbarButton
          label="Negrito"
          active={active?.bold ?? false}
          disabled={controlsDisabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Itálico"
          active={active?.italic ?? false}
          disabled={controlsDisabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista com marcadores"
          active={active?.bulletList ?? false}
          disabled={controlsDisabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          active={active?.orderedList ?? false}
          disabled={controlsDisabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Título"
          active={active?.heading ?? false}
          disabled={controlsDisabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <Popover open={linkOpen} onOpenChange={handleLinkOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className={cn(
                "h-8 w-8 bg-background",
                active?.link && "border-primary/40 bg-primary/10 text-primary",
              )}
              disabled={controlsDisabled}
              title="Link"
              aria-label="Link"
              aria-pressed={active?.link ?? false}
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80">
            <form className="flex flex-col gap-3" onSubmit={handleLinkSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={linkInputId}>URL do link</Label>
                <Input
                  id={linkInputId}
                  type="text"
                  inputMode="url"
                  value={linkUrl}
                  onChange={(event) => {
                    setLinkUrl(event.target.value);
                    setLinkError(null);
                  }}
                  placeholder="https://exemplo.com"
                  autoComplete="url"
                  autoFocus
                  aria-invalid={linkError ? true : undefined}
                  aria-describedby={
                    linkError ? `${linkInputId}-error` : undefined
                  }
                />
                {linkError ? (
                  <span
                    id={`${linkInputId}-error`}
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {linkError}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {active?.link ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-auto"
                    onClick={handleRemoveLink}
                  >
                    Remover link
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-auto"
                  onClick={() => setLinkOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" className="w-auto">
                  Aplicar link
                </Button>
              </div>
            </form>
          </PopoverContent>
        </Popover>

        {aiAssist ? (
          <div className="ml-auto">
            <Popover open={aiOpen} onOpenChange={setAiOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8 border-primary/40 bg-background text-primary hover:bg-primary/10"
                  disabled={disabled || aiBusy}
                  title="Melhore sua descrição com IA"
                  aria-label="Melhore sua descrição com IA"
                  aria-busy={aiBusy}
                >
                  {aiBusy ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-60 p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start font-normal hover:bg-hover-soft hover:text-foreground"
                  disabled={aiBusy}
                  onClick={() => void handleAiImprove("grammar")}
                >
                  Revisar texto
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start font-normal hover:bg-hover-soft hover:text-foreground"
                  disabled={aiBusy}
                  onClick={() => void handleAiImprove("regenerate")}
                >
                  Gerar nova descrição
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        ) : null}
      </div>
      <EditorContent editor={editor} />
      <div
        id={statusId}
        className={cn(
          "min-h-4 text-right text-xs text-muted-foreground",
          isAtCharacterLimit && "text-destructive",
        )}
      >
        {aiBusy ? "Processando texto..." : characterStatus}
      </div>
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {accessibleStatus}
      </span>
    </div>
  );
}
