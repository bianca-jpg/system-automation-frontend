import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-[var(--space-control-gap)] whitespace-nowrap rounded-[var(--radius-interactive)] text-sm font-medium transition-all duration-fast ease-standard disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none  focus-visible:ds-focus-ring  aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:ds-border-destructive-strong w-full cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-clip-padding bg-primary text-primary-foreground hover:ds-border-emphasis-strong hover:shadow-control",
        destructive:
          "border border-transparent bg-clip-padding bg-destructive text-destructive-foreground-strong hover:ds-border-destructive-strong hover:shadow-control",
        outline:
          "border ds-border-control bg-background text-foreground shadow-xs hover:ds-border-neutral hover:bg-hover-soft dark:hover:bg-hover-soft",
        secondary:
          "border border-transparent bg-clip-padding bg-secondary text-secondary-foreground-strong hover:ds-border-emphasis-strong hover:shadow-control",
        ghost: "",
        link: "text-info-text underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-[calc(var(--radius-interactive)_-_2px)] gap-1.5 px-3",
        lg: "h-11 rounded-[calc(var(--radius-interactive)_+_2px)] px-6",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
