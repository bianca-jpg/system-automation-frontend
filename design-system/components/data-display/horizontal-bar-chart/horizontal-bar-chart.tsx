import { Info } from "lucide-react";

import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";

export interface HorizontalBarData {
  name: string;
  value: number;
  color?:
    | "blue"
    | "sky"
    | "cyan"
    | "indigo"
    | "slate"
    | "emerald"
    | "rose"
    | "amber"
    | undefined;
  tooltip?:
    | {
        title: string;
        description: string;
      }
    | undefined;
}

interface HorizontalBarChartProps {
  data: HorizontalBarData[];
  showValues?: boolean;
  className?: string;
}

// Legacy public color names map to the semantic analytics palette. Keeping the
// names avoids a consumer migration while every bar follows color-theme + mode.
const chartColors = [
  "var(--analytics-chart-primary)",
  "var(--analytics-chart-secondary)",
  "var(--analytics-chart-tertiary)",
];

const colorMap: Record<string, string> = {
  blue: "var(--analytics-chart-primary)",
  sky: "var(--analytics-chart-secondary)",
  cyan: "var(--analytics-chart-tertiary)",
  indigo: "var(--analytics-chart-categorical-4)",
  slate: "var(--analytics-chart-neutral)",
  emerald: "var(--analytics-chart-success)",
  rose: "var(--analytics-chart-danger)",
  amber: "var(--analytics-chart-warning)",
};

function normalizePercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

// Componente de label com ícone de info e tooltip
function LabelWithInfo({ item }: { item: HorizontalBarData }) {
  return (
    <div
      data-slot="horizontal-bar-chart-label"
      className="flex min-w-0 items-center gap-[var(--space-control-gap)]"
    >
      <span className="truncate text-xs font-medium text-foreground">
        {item.name}
      </span>
      {item.tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-8 w-8 shrink-0 text-muted-foreground"
              aria-label={`Mais informações sobre ${item.name}`}
            >
              <Info className="size-3" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent variant="info" side="right" className="max-w-xs">
            <p className="font-medium text-foreground">{item.tooltip.title}</p>
            <p className="text-muted-foreground text-xs mt-1">
              {item.tooltip.description}
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export function HorizontalBarChart({
  data,
  showValues = true,
  className,
}: HorizontalBarChartProps) {
  return (
    <div
      data-slot="horizontal-bar-chart"
      className={cn("w-full select-none", className)}
    >
      <div className="flex flex-col gap-[var(--space-control-gap)]">
        {data.map((item, index) => {
          const percentage = normalizePercentage(item.value);
          const barColor = item.color
            ? colorMap[item.color]
            : chartColors[index % chartColors.length];

          return (
            <div
              key={index}
              data-slot="horizontal-bar-chart-row"
              className="space-y-1"
            >
              {/* Label row */}
              <div className="flex items-center justify-between gap-2">
                <LabelWithInfo item={item} />
                {showValues && (
                  <span
                    className="text-xs font-medium text-foreground tabular-nums"
                    aria-hidden="true"
                  >
                    {percentage.toFixed(1)}%
                  </span>
                )}
              </div>

              {/* Bar */}
              <div
                data-slot="horizontal-bar-chart-track"
                className="relative h-2.5 w-full rounded-[var(--radius-round)] bg-(--chart-track)"
              >
                <div
                  data-slot="horizontal-bar-chart-bar"
                  role="progressbar"
                  aria-label={`${item.name}: ${percentage.toFixed(1)}%`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percentage}
                  className="absolute inset-y-0 left-0 rounded-[var(--radius-round)] transition-all duration-slow ease-standard"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
