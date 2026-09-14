// Fonte única do `cn`: o helper vive no design system (`lib/utils.ts`, exposto
// pelo subpath `@system-automation/design-system/lib`). Manter uma cópia local aqui
// significaria que qualquer ajuste futuro no `twMerge` do DS — por exemplo um
// `extendTailwindMerge` ensinando os grupos de token (`rounded-control`,
// `shadow-card`) — valeria para os componentes do DS e não para o `className`
// escrito no app, e a divergência apareceria como override que "às vezes pega".
export { cn } from "@system-automation/design-system/lib";
