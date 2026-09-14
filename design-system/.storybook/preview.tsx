import type { Preview } from "@storybook/nextjs-vite";
import { withThemeByClassName } from "@storybook/addon-themes";
import { useEffect, type ReactNode } from "react";

import { COLOR_THEMES, DEFAULT_COLOR_THEME } from "../lib/theme-registry";
import "../storybook.css";

const STORYBOOK_DOCUMENT_TITLE = "Design System";

function StoryDocumentMetadata({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = "pt-BR";
    document.title = STORYBOOK_DOCUMENT_TITLE;
  }, []);

  return children;
}

// Two independent theme axes:
//  - MODE (light/dark) → `.light`/`.dark` class, via addon-themes (globals.theme).
//  - PALETTE (data-theme) → custom `palette` global + decorator below.
// The addon-themes helpers all read `globals.theme`, so a second addon decorator
// would clash on the same global — hence the custom palette control.
// Both the class and the attribute land on <html> so the dark-palette compound
// selector `.dark[data-theme="…"]` matches (needs both on the same element).
const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    a11y: {
      element: "#storybook-root",
      manual: false,
    },
  },
  initialGlobals: {
    palette: DEFAULT_COLOR_THEME,
  },
  globalTypes: {
    palette: {
      description: "Paleta de cor (data-theme)",
      toolbar: {
        title: "Paleta",
        icon: "paintbrush",
        items: COLOR_THEMES.map((theme) => ({
          value: theme.id,
          title: theme.label,
        })),
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    withThemeByClassName({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
      parentSelector: "html",
    }),
    (Story, context) => {
      if (typeof document !== "undefined") {
        const palette =
          (context.globals.palette as string | undefined) ??
          DEFAULT_COLOR_THEME;
        document.documentElement.setAttribute("data-theme", palette);
      }
      return (
        <StoryDocumentMetadata>
          <Story />
        </StoryDocumentMetadata>
      );
    },
  ],
};

export default preview;
