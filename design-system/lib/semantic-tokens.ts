export type AccentTone = "amber" | "blue" | "purple" | "green" | "rose" | "red";

type AccentToneTokens = {
  icon: string;
  soft: string;
  emphasisText: string;
  gradient?: string;
  strongGradient?: string;
  swatch?: string;
  badge?: string;
  brandGradient?: string;
};

export const accentToneTokens: Record<AccentTone, AccentToneTokens> = {
  amber: {
    icon: "bg-warning/10 text-warning-text",
    soft: "bg-warning/10 ds-border-warning text-warning-text",
    emphasisText: "text-warning-text",
    gradient:
      "bg-gradient-to-br from-warning/5 to-warning/15 ds-border-warning text-warning-text",
    strongGradient:
      "bg-gradient-to-br from-warning/10 to-warning/20 ds-border-warning-strong text-warning-text",
    swatch: "bg-warning ds-border-warning-strong",
    badge: "bg-warning/10 text-warning-text",
  },
  blue: {
    icon: "bg-info/10 text-info-text",
    soft: "bg-info/10 ds-border-accent-blue text-info-text",
    emphasisText: "text-info-text",
    gradient:
      "bg-gradient-to-br from-info/5 to-info/15 ds-border-accent-blue text-info-text",
    strongGradient:
      "bg-gradient-to-br from-info/10 to-info/20 ds-border-accent-blue-strong text-info-text",
    swatch: "bg-info ds-border-accent-blue-strong",
    badge: "bg-info/10 text-info-text",
  },
  purple: {
    icon: "bg-accent-purple/10 text-foreground",
    soft: "bg-accent-purple/10 ds-border-accent-purple text-foreground",
    emphasisText: "text-foreground",
    gradient:
      "bg-gradient-to-br from-accent-purple/5 to-accent-purple/15 ds-border-accent-purple text-foreground",
    strongGradient:
      "bg-gradient-to-br from-accent-purple/10 to-accent-purple/20 ds-border-accent-purple-strong text-foreground",
    brandGradient:
      "ds-border-accent-purple bg-linear-to-br from-accent-purple/5 to-secondary/10 text-foreground",
    swatch: "bg-accent-purple ds-border-accent-purple-strong",
    badge: "bg-accent-purple/10 text-foreground",
  },
  green: {
    icon: "bg-success/10 text-success-text",
    soft: "bg-success/10 ds-border-success text-success-text",
    emphasisText: "text-success-text",
    gradient:
      "bg-gradient-to-br from-success/5 to-success/15 ds-border-success text-success-text",
    strongGradient:
      "bg-gradient-to-br from-success/10 to-success/20 ds-border-success-strong text-success-text",
    swatch: "bg-success ds-border-success-strong",
    badge: "bg-success/10 text-success-text",
  },
  rose: {
    icon: "bg-destructive/10 text-destructive-text",
    soft: "bg-destructive/10 ds-border-destructive text-destructive-text",
    emphasisText: "text-destructive-text",
    gradient:
      "bg-gradient-to-br from-destructive/5 to-destructive/15 ds-border-destructive text-destructive-text",
    strongGradient:
      "bg-gradient-to-br from-destructive/10 to-destructive/20 ds-border-destructive-strong text-destructive-text",
    swatch: "bg-destructive ds-border-destructive-strong",
    badge: "bg-destructive/10 text-destructive-text",
  },
  red: {
    icon: "bg-destructive/10 text-destructive-text",
    soft: "bg-destructive/10 ds-border-destructive text-destructive-text",
    emphasisText: "text-destructive-text",
    badge: "bg-destructive/10 text-destructive-text",
  },
};

export const codeBlockTokens = {
  container: "bg-[var(--surface-code)] text-[var(--surface-code-foreground)]",
  header:
    "bg-[var(--surface-code-header)] text-[var(--surface-code-foreground)]",
  border: "border ds-border-surface",
  lineNumbers: "var(--surface-code-number)",
};

export const chartTrackClass = "opacity-100";

export const chartToneClasses: Record<
  "info" | "success" | "warning" | "destructive" | "muted",
  string
> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

// ============================================
// Chart Configuration Tokens
// Centralized configuration for dashboard charts
// ============================================

/** RadialChart default configuration */
export const radialChartConfig = {
  /** Standard size for dashboard cards */
  size: 120,
  /** Standard stroke width */
  strokeWidth: 12,
  /** Default color (info = blue) */
  color: "info" as const,
} as const;

/** Chart color palette - professional blue tones */
export type ChartColor = "blue" | "sky" | "cyan" | "indigo" | "slate";

/** Pre-defined chart data color sequences for consistent visualization */
export const chartColorSequence = {
  /** For 3-item charts (e.g., scores breakdown) */
  triple: ["blue", "sky", "cyan"] as ChartColor[],
};
