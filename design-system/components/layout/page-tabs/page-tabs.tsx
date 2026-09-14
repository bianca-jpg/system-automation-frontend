"use client";

import {
  createContext,
  useContext,
  useDeferredValue,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { cn } from "../../../lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";

export type PageTabsProps = ComponentPropsWithoutRef<typeof Tabs>;

export type PageTabsListProps = Omit<
  ComponentPropsWithoutRef<typeof TabsList>,
  "variant"
>;

export type PageTabsTriggerProps = ComponentPropsWithoutRef<typeof TabsTrigger>;

export type PageTabsContentProps = ComponentPropsWithoutRef<typeof TabsContent>;

export interface PageTabItem<Value extends string = string> {
  value: Value;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  /** Contagem exibida em um chip ao lado do label (ex.: total de registros da aba). */
  count?: number | string | null;
}

export interface PageTabsBarProps<Value extends string = string>
  extends Omit<PageTabsListProps, "children"> {
  items: readonly PageTabItem<Value>[];
  triggerClassName?: string;
}

type PageTabsRenderContextValue = {
  activeValue?: string | undefined;
  renderedValue?: string | undefined;
};

const pageTabsRenderContext = createContext<PageTabsRenderContextValue | null>(
  null,
);

export function PageTabs({ className, value, ...props }: PageTabsProps) {
  const renderedValue = useDeferredValue(value);

  return (
    <pageTabsRenderContext.Provider
      value={
        typeof value === "string"
          ? {
              activeValue: value,
              renderedValue:
                typeof renderedValue === "string" ? renderedValue : undefined,
            }
          : null
      }
    >
      <Tabs
        data-slot="page-tabs"
        className={cn("w-full min-w-0 space-y-6", className)}
        {...(value !== undefined ? { value } : {})}
        {...props}
      />
    </pageTabsRenderContext.Provider>
  );
}

export function PageTabsList({ className, ...props }: PageTabsListProps) {
  return (
    <TabsList
      data-slot="page-tabs-list"
      variant="pill"
      className={cn(
        "w-fit max-w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    />
  );
}

export function PageTabsTrigger({ className, ...props }: PageTabsTriggerProps) {
  return (
    <TabsTrigger
      data-slot="page-tabs-trigger"
      className={cn("gap-2", className)}
      {...props}
    />
  );
}

export function PageTabsContent({
  className,
  forceMount,
  value,
  ...props
}: PageTabsContentProps) {
  const renderState = useContext(pageTabsRenderContext);
  const activeValue = renderState?.activeValue;
  const renderedValue = renderState?.renderedValue;
  const canDeferContent =
    !forceMount &&
    typeof value === "string" &&
    typeof activeValue === "string" &&
    typeof renderedValue === "string";

  if (!canDeferContent) {
    return (
      <TabsContent
        data-slot="page-tabs-content"
        className={cn("mt-0", className)}
        {...(forceMount !== undefined ? { forceMount } : {})}
        value={value}
        {...props}
      />
    );
  }

  if (renderedValue !== value) {
    return null;
  }

  return (
    <TabsContent
      data-slot="page-tabs-content"
      className={cn("mt-0", className)}
      {...(forceMount !== undefined ? { forceMount } : {})}
      value={activeValue}
      {...props}
    />
  );
}

export function PageTabsBar<Value extends string = string>({
  items,
  className,
  triggerClassName,
  ...props
}: PageTabsBarProps<Value>) {
  return (
    <PageTabsList className={className} {...props}>
      {items.map((item) => (
        <PageTabsTrigger
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          className={cn("group/page-tab", triggerClassName)}
        >
          {item.icon ? (
            <span
              data-slot="page-tabs-trigger-icon"
              className="flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4"
            >
              {item.icon}
            </span>
          ) : null}
          <span data-slot="page-tabs-trigger-label" className="truncate">
            {item.label}
          </span>
          {item.count !== undefined && item.count !== null ? (
            <span
              data-slot="page-tabs-trigger-count"
              className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-background/80 px-1.5 text-[11px] font-medium tabular-nums text-foreground transition-colors group-data-[state=active]/page-tab:bg-secondary/15"
            >
              {item.count}
            </span>
          ) : null}
        </PageTabsTrigger>
      ))}
    </PageTabsList>
  );
}
