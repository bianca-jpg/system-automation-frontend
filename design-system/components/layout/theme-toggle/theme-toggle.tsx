"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { useTheme } from "../../providers/theme-context";
import { Button } from "../../ui/button";
import { Typography } from "../../data-display/typography";

export function SimpleThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      onClick={() => toggleTheme()}
      data-slot="simple-theme-toggle"
      className="relative flex justify-start rounded-full transition-all p-0 h-fit"
    >
      {theme == "dark" ? (
        <div className="flex items-center">
          <Typography variant="small" as="span">
            Tema escuro{" "}
          </Typography>
          <Moon className="h-[1.2rem] w-[1.2rem] ml-4" />
        </div>
      ) : (
        <div className="flex items-center">
          <Typography variant="small" as="span">
            Tema claro{" "}
          </Typography>
          <Sun className="h-[1.3rem] w-[1.3rem] ml-4" />
        </div>
      )}
    </Button>
  );
}
