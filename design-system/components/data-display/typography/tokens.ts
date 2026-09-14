export const TYPOGRAPHY_COLOR_CLASSES = {
  primary: "text-foreground",
  secondary: "text-info-text",
  white: "text-white",
  soft: "text-muted-foreground",
  info: "text-info-text",
  background: "text-background",
  destructive: "text-destructive-text",
} as const;

export type TypographyColor = keyof typeof TYPOGRAPHY_COLOR_CLASSES;

export const TYPOGRAPHY_ROLE_CLASSES = {
  h1: "font-heading text-[2rem] leading-[1.2] font-bold md:text-[2.5rem]",
  h2: "font-heading text-[1.75rem] leading-[1.25] font-bold md:text-[2rem]",
  h3: "font-heading text-[1.375rem] leading-[1.3] font-bold md:text-[1.5rem]",
  h4: "font-heading text-[1.125rem] leading-[1.35] font-bold md:text-[1.25rem]",
  // Corpo em `font-medium` (500) para acompanhar o peso base do <body>: sem
  // isso, texto via <Typography> ficaria 400 enquanto o resto da tela vai a
  // 500. Satoshi só tem 400/500/700 — 500 é o único degrau acima de regular.
  lead: "font-sans text-[1rem] leading-[1.6] font-medium md:text-[1.125rem]",
  body: "font-sans text-[1rem] leading-[1.5] font-medium",
  small: "font-sans text-[0.875rem] leading-[1.4] font-medium",
  caption: "font-sans text-[0.75rem] leading-[1.4] font-medium",
} as const;

export type TypographyVariant = keyof typeof TYPOGRAPHY_ROLE_CLASSES;
export type HeadingTypographyVariant = Extract<
  TypographyVariant,
  "h1" | "h2" | "h3" | "h4"
>;
export type SupportingTypographyVariant = Extract<
  TypographyVariant,
  "lead" | "body" | "small" | "caption"
>;
