import { cva } from "class-variance-authority";

export const selectTriggerVariants = cva(
  "flex h-12 w-full items-center justify-between gap-2 rounded-md border ds-border-control bg-background px-3 py-2 text-left text-sm data-placeholder:text-muted-foreground focus-visible:outline-none  focus-visible:ds-focus-ring  disabled:cursor-not-allowed disabled:opacity-50 [&>span]:flex-1 [&>span]:line-clamp-1 [&>span]:text-left cursor-pointer",
);

export const selectScrollButtonVariants = cva(
  "flex cursor-pointer items-center justify-center py-1 hover:bg-accent/50 transition-colors",
);

export const selectContentVariants = cva(
  "relative z-50 max-h-(--radix-select-content-available-height) min-w-32 overflow-y-auto overflow-x-hidden rounded-md border ds-border-surface bg-[color:var(--background-elevated)] text-popover-foreground shadow-[var(--shadow-popover)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:pointer-events-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin) cursor-pointer",
);

export const selectLabelVariants = cva("py-1.5 pl-8 pr-2 text-sm font-bold");

export const selectItemVariants = cva(
  "relative flex w-full select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 cursor-pointer hover:bg-hover-soft",
);

export const selectSeparatorVariants = cva("-mx-1 my-1 h-px bg-muted");
