"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { VariantProps } from "class-variance-authority";

import { useRippleEffect } from "../../../hooks/use-ripple-effect";
import { cn } from "../../../lib/utils";
import { composeEventHandlers, RippleLayer } from "../ripple-effect";
import { tabsListVariants, tabsTriggerVariants } from "./variants";

type TabsVariant = "default" | "pill";

const tabsStyleContext = React.createContext<{
  variant: TabsVariant;
} | null>(null);

type TabsRootProps = Omit<
  React.ComponentProps<typeof TabsPrimitive.Root>,
  "value" | "defaultValue"
> & {
  value?: string | undefined;
  defaultValue?: string | undefined;
};

function Tabs({ value, defaultValue, ...props }: TabsRootProps) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      {...props}
    />
  );
}

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants> & {
    variant?: TabsVariant;
  }) {
  return (
    <tabsStyleContext.Provider value={{ variant }}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        className={cn(tabsListVariants({ variant }), className)}
        {...props}
      />
    </tabsStyleContext.Provider>
  );
}

function TabsTrigger({
  children,
  className,
  variant,
  disabled,
  onPointerDown,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> &
  VariantProps<typeof tabsTriggerVariants> & {
    variant?: TabsVariant;
  }) {
  const inheritedStyle = React.useContext(tabsStyleContext);
  const resolvedVariant = variant ?? inheritedStyle?.variant ?? "default";
  const { ripples, createRipple } = useRippleEffect({
    disabled,
  });

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        tabsTriggerVariants({ variant: resolvedVariant }),
        className,
      )}
      disabled={disabled}
      {...props}
      onPointerDown={composeEventHandlers(onPointerDown, createRipple)}
    >
      <RippleLayer ripples={ripples} rippleClassName="bg-secondary/30" />
      <span className="relative z-10 inline-flex min-w-0 max-w-full items-center justify-center gap-2">
        {children}
      </span>
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ds-focus-ring  ",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
export { tabsListVariants, tabsTriggerVariants } from "./variants";
