import React from "react";

import { cn } from "../../../lib/utils";
import {
  chartToneClasses,
  chartTrackClass,
} from "../../../lib/semantic-tokens";
import { Typography } from "../typography";

type RadialChartTone = keyof typeof chartToneClasses;

type RadialChartProps = {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: RadialChartTone;
  showLabel?: boolean;
  labelFormatter?: (value: number, max: number) => React.ReactNode;
  labelClassName?: string;
  labelStyle?: React.CSSProperties;
  /** Accessible name for the progress ring. */
  ariaLabel?: string;
};

/**
 * Round the ring percentage for the default label, but never let a non-zero
 * value display as "0%" or a sub-max value display as "100%" — that would imply
 * an empty/full ring the data does not support. In those boundary cases fall
 * back to one decimal, rounding AWAY from the boundary (ceil near 0, floor near
 * 100) so e.g. 0.04% shows "0.1%" and 99.96% shows "99.9%" — plain toFixed
 * would re-round 99.96 to "100.0".
 */
function formatRingPercentage(percentage: number): string {
  const rounded = Math.round(percentage);
  // toFixed(6) strips float noise (0.3 * 10 === 3.0000000000000004) before
  // ceil/floor so 0.3% stays "0.3%" instead of drifting to "0.4%".
  const tenths = Number((percentage * 10).toFixed(6));
  if (rounded === 0 && percentage > 0) {
    return (Math.ceil(tenths) / 10).toFixed(1);
  }
  if (rounded === 100 && percentage < 100) {
    return (Math.floor(tenths) / 10).toFixed(1);
  }
  return String(rounded);
}

const RadialChart = ({
  value = 75,
  max = 100,
  size = 200,
  strokeWidth = 20,
  color = "info",
  showLabel = true,
  labelFormatter,
  labelClassName,
  labelStyle,
  ariaLabel = "Progresso",
}: RadialChartProps) => {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const safeSize = Number.isFinite(size) && size > 0 ? size : 200;
  const safeStrokeWidth =
    Number.isFinite(strokeWidth) && strokeWidth > 0
      ? Math.min(strokeWidth, safeSize)
      : Math.min(20, safeSize);
  const numericValue = Number.isFinite(value) ? value : 0;
  const normalizedValue = Math.min(safeMax, Math.max(0, numericValue));
  const percentage = (normalizedValue / safeMax) * 100;
  const radius = (safeSize - safeStrokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const resolvedColor: RadialChartTone =
    color && chartToneClasses[color] ? color : "info";
  const ringColorClass = chartToneClasses[resolvedColor];
  const label =
    typeof labelFormatter === "function"
      ? labelFormatter(normalizedValue, safeMax)
      : `${formatRingPercentage(percentage)}%`;

  return (
    <div
      data-slot="radial-chart"
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={normalizedValue}
      aria-valuetext={`${formatRingPercentage(percentage)}%`}
      className="relative"
      style={{ width: safeSize, height: safeSize }}
    >
      <svg
        width={safeSize}
        height={safeSize}
        className="transform -rotate-90"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          data-slot="radial-chart-track"
          cx={safeSize / 2}
          cy={safeSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={safeStrokeWidth}
          className={chartTrackClass}
          style={{ color: "var(--chart-track)" }}
        />
        <circle
          data-slot="radial-chart-ring"
          cx={safeSize / 2}
          cy={safeSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={safeStrokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            ringColorClass,
            "transition-all duration-1000 ease-out",
          )}
        />
      </svg>

      {showLabel && (
        <div
          data-slot="radial-chart-label"
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <Typography
            as="span"
            variant="caption"
            className={cn("flex flex-col items-center", labelClassName)}
            style={labelStyle}
          >
            {label}
          </Typography>
        </div>
      )}
    </div>
  );
};

export default RadialChart;
