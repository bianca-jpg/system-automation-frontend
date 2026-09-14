"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";

import { cn } from "../../../lib/utils";
import {
  commandEmptyVariants,
  commandGroupVariants,
  commandInputVariants,
  commandInputWrapperVariants,
  commandItemVariants,
  commandListVariants,
  commandSeparatorVariants,
  commandShortcutVariants,
  commandVariants,
} from "./variants";

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(commandVariants(), className)}
      {...props}
    />
  );
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className={commandInputWrapperVariants()}
      cmdk-input-wrapper=""
    >
      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(commandInputVariants(), className)}
        {...props}
      />
    </div>
  );
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(commandListVariants(), className)}
      {...props}
    />
  );
}

function CommandEmpty({
  className,
  children,
  role = "option",
  "aria-disabled": ariaDisabled = true,
  ...props
}: Omit<React.ComponentProps<typeof CommandPrimitive.Empty>, "asChild">) {
  return (
    <CommandPrimitive.Empty asChild>
      <div
        data-slot="command-empty"
        role={role}
        aria-disabled={ariaDisabled}
        className={cn(commandEmptyVariants(), className)}
        {...props}
      >
        {children}
      </div>
    </CommandPrimitive.Empty>
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(commandGroupVariants(), className)}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  alwaysRender,
  role = "presentation",
  ...props
}: Omit<React.ComponentProps<typeof CommandPrimitive.Separator>, "asChild">) {
  return (
    <CommandPrimitive.Separator
      {...(alwaysRender !== undefined ? { alwaysRender } : {})}
      asChild
    >
      <div
        data-slot="command-separator"
        role={role}
        className={cn(commandSeparatorVariants(), className)}
        {...props}
      />
    </CommandPrimitive.Separator>
  );
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(commandItemVariants(), className)}
      {...props}
    />
  );
}

function CommandShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(commandShortcutVariants(), className)}
      {...props}
    />
  );
}

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
