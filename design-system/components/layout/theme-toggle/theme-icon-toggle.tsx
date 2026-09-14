"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { useTheme } from "../../providers/theme-context";
import { Button } from "../../ui/button";

interface ThemeIconToggleProps {
  className?: string;
}

export function ThemeIconToggle({ className }: ThemeIconToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={className}
        disabled
        data-slot="theme-icon-toggle"
        aria-label="Carregando tema"
      >
        <Sun className="h-5 w-5 opacity-50" />
      </Button>
    );
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={className}
      data-slot="theme-icon-toggle"
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
    >
      {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  );
}
