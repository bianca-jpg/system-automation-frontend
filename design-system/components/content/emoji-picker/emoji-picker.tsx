"use client";

import { useState, useCallback, lazy, Suspense } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import { Smile } from "lucide-react";

import { cn } from "../../../lib/utils";
import { useTheme } from "../../providers/theme-context";
import { Button } from "../../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { Skeleton } from "../../ui/skeleton";

// Lazy load the heavy emoji picker component.
//
// `emoji-picker-panel` é a ÚNICA fronteira com `emoji-picker-react`: os enums
// `Theme`/`Categories`/`EmojiStyle` são valores de runtime e, importados aqui
// estaticamente ao lado do `lazy()`, faziam o bundler emitir
// `[INEFFECTIVE_DYNAMIC_IMPORT]` e desistir do code-split. Deste arquivo só sai
// `import type`, que a compilação apaga.
const EmojiPickerPanel = lazy(() => import("./emoji-picker-panel"));

/** Inline skeleton — preserves the same loading shape as the picker for layout stability. */
function EmojiPickerSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border ds-border-surface bg-background shadow-lg"
      style={{ width: 320, height: 400 }}
    >
      <div className="border-b ds-border-skeleton p-3">
        <Skeleton className="h-9 rounded-lg" />
      </div>
      <div className="grid grid-cols-8 gap-1 p-3">
        {Array.from({ length: 40 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-8 w-8 rounded"
            style={{ animationDelay: `${index * 20}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}

export function EmojiPickerButton({
  onEmojiSelect,
  disabled = false,
  className,
}: EmojiPickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const { resolvedTheme } = useTheme();

  // Pre-load picker on first hover (optimistic loading)
  const handleMouseEnter = useCallback(() => {
    if (!hasOpened) {
      setHasOpened(true);
    }
  }, [hasOpened]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open && !hasOpened) {
        setHasOpened(true);
      }
    },
    [hasOpened],
  );

  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      onEmojiSelect(emojiData.emoji);
      setIsOpen(false);
    },
    [onEmojiSelect],
  );

  const isDark = resolvedTheme === "dark";

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onMouseEnter={handleMouseEnter}
          disabled={disabled}
          data-slot="emoji-picker-button"
          className={cn(
            "rounded-full text-muted-foreground hover:text-foreground hover:bg-hover-soft",
            "disabled:opacity-40",
            className,
          )}
          aria-label="Escolher emoji"
        >
          <Smile className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        data-slot="emoji-picker-popover"
        className="w-auto rounded-xl border-none bg-transparent p-0 shadow-none"
      >
        <Suspense fallback={<EmojiPickerSkeleton />}>
          <EmojiPickerPanel isDark={isDark} onEmojiClick={handleEmojiClick} />
        </Suspense>
      </PopoverContent>

      {/* Hidden preload when hovered but not opened yet */}
      {hasOpened && !isOpen && (
        <div className="hidden" data-slot="emoji-picker-preload">
          <Suspense fallback={null}>
            <EmojiPickerPanel isDark={isDark} onEmojiClick={handleEmojiClick} />
          </Suspense>
        </div>
      )}
    </Popover>
  );
}
