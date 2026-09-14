"use client";

import { useTheme } from "../../providers/theme-context";
import { DropdownMenuItem } from "../../ui/dropdown-menu";
import { Switch } from "../../ui/switch";

export function ThemeToggleMenuItem() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenuItem
      data-slot="theme-toggle-menu-item"
      className="flex items-center justify-between cursor-pointer w-full"
      onSelect={(e) => {
        e.preventDefault();
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      }}
    >
      <span className="text-sm">Tema escuro</span>
      <Switch
        checked={resolvedTheme === "dark"}
        size="sm"
        className="pointer-events-none"
      />
    </DropdownMenuItem>
  );
}
