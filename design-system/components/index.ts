// Plan 38-6 Task 2 — DS L2 reorganization (D-l2-defer-01).
// Composites are organized into L2 categories: data-display, layout, feedback, content.
// form/ + providers/ + ui/ remain at root.
// Named exports per Pitfall #7 (no `export *`).

export { EmojiPickerButton } from "./content/emoji-picker";
export {
  ConfirmCodeScreen,
  formatCodeCountdown,
  type ConfirmCodeScreenProps,
} from "./content/confirm-code-screen";
export { ErrorCard, type ErrorCardProps } from "./feedback/error-card";
export { EmptyState, type EmptyStateProps } from "./feedback/empty-state";
export {
  FeatureBoundary,
  type FeatureBoundaryProps,
  type RecoveryAction,
  type ErrorFallbackComponent,
} from "./feedback/feature-boundary";
export {
  SecurityVerificationDialog,
  type SecurityVerificationDialogProps,
} from "./feedback/security-verification-dialog";
export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
  useFormField,
} from "./form";
export {
  HorizontalBarChart,
  type HorizontalBarData,
} from "./data-display/horizontal-bar-chart";
export { LogoWithTitle } from "./content/logo-with-title";
export { Markdown } from "./content/markdown";
export { MetricCard, type MetricCardProps } from "./data-display/metric-card";
export {
  MessageReceipt,
  type MessageReceiptProps,
  type MessageReceiptStatus,
} from "./data-display/message-receipt";
export { AuthParticleField } from "./layout/auth-showcase";
export { PageHeader, type PageHeaderProps } from "./layout/page-header";
export { PageShell, type PageShellProps } from "./layout/page-shell";
export {
  BackButton,
  type BackButtonMode,
  type BackButtonProps,
} from "./navigation/back-button";
export { SkipLink, type SkipLinkProps } from "./navigation/skip-link";
export {
  PageTabs,
  PageTabsBar,
  PageTabsContent,
  PageTabsList,
  PageTabsTrigger,
  type PageTabItem,
  type PageTabsBarProps,
  type PageTabsContentProps,
  type PageTabsListProps,
  type PageTabsProps,
  type PageTabsTriggerProps,
} from "./layout/page-tabs";
export { default as RadialChart } from "./data-display/radial-chart";
export { SelectSearch } from "./content/select-with-search";
export {
  DynamicTable,
  type Action,
  type ColumnConfig,
  type DynamicTableProps,
  type DynamicTableSortingState,
  type FilterConfig,
} from "./data-display/table";
export { ThemeIconToggle } from "./layout/theme-toggle/theme-icon-toggle";
export {
  Typography,
  type HeadingTypographyVariant,
  type SupportingTypographyVariant,
  type TypographyColor,
  type TypographyVariant,
} from "./data-display/typography";
