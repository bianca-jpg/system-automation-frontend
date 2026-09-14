import { cva } from "class-variance-authority";

export const commandVariants = cva(
  "flex h-full w-full flex-col overflow-hidden rounded-md bg-[color:var(--background-elevated)] text-popover-foreground",
);

export const commandInputWrapperVariants = cva(
  "flex items-center border-b ds-border-divider px-3",
);

export const commandInputVariants = cva(
  "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
);

export const commandListVariants = cva(
  "max-h-[300px] overflow-y-auto overflow-x-hidden",
);

export const commandEmptyVariants = cva("py-6 text-center text-sm");

export const commandGroupVariants = cva(
  "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
);

export const commandSeparatorVariants = cva("-mx-1 h-px bg-border");

export const commandItemVariants = cva(
  "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected='true']:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
);

export const commandShortcutVariants = cva(
  "ml-auto text-xs tracking-widest text-muted-foreground",
);
