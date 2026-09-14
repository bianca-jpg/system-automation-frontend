"use client";

import * as React from "react";
import type { Control, FieldError, FieldValues, Path } from "react-hook-form";
import { Controller } from "react-hook-form";

import { cn, normalizeForSearch } from "../../../lib/utils";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface Option {
  label: string;
  value: string;
}

interface FormSelectSearchProps<T extends FieldValues> {
  label?: string;
  name: Path<T>;
  control: Control<T>;
  error?: FieldError;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  options: Option[];
  disabled?: boolean;
}

export function SelectSearch<T extends FieldValues>({
  label,
  name,
  control,
  error,
  placeholder = "Selecione uma opção...",
  searchPlaceholder = "Pesquisar...",
  emptyMessage = "Nenhum resultado encontrado.",
  className,
  options,
  disabled = false,
}: FormSelectSearchProps<T>) {
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const generatedId = React.useId();
  const triggerId = `${generatedId}-trigger`;
  const searchId = `${generatedId}-search`;
  const errorId = `${generatedId}-error`;
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const animationFrame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [open]);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;

    const searchNorm = normalizeForSearch(search);

    return options.filter((option) => {
      const labelNorm = normalizeForSearch(option.label);
      const valueNorm = normalizeForSearch(option.value);
      return labelNorm.includes(searchNorm) || valueNorm.includes(searchNorm);
    });
  }, [options, search]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearch("");
    }
  };

  return (
    <div data-slot="select-with-search" className="flex flex-col w-full">
      {label && (
        <Label
          htmlFor={triggerId}
          data-slot="select-with-search-label"
          className="mb-1 text-muted-foreground"
        >
          {label}
        </Label>
      )}

      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            onValueChange={field.onChange}
            value={field.value}
            disabled={disabled}
            open={open}
            onOpenChange={handleOpenChange}
          >
            <SelectTrigger
              id={triggerId}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={cn(className, error && "ds-border-destructive-strong")}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>

            <SelectContent className="max-h-64 overflow-y-auto">
              <div
                data-slot="select-with-search-input-wrapper"
                className="px-2 pb-2"
              >
                <Input
                  ref={searchInputRef}
                  id={searchId}
                  type="search"
                  aria-label={searchPlaceholder}
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(event) => {
                    // Keep typing/navigation inside the search field, but let
                    // Escape reach Radix so the popup remains dismissible.
                    if (event.key !== "Escape") event.stopPropagation();
                  }}
                />
              </div>

              {filteredOptions.length === 0 ? (
                <div
                  data-slot="select-with-search-empty"
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      />

      {error && (
        <span
          id={errorId}
          role="alert"
          data-slot="select-with-search-error"
          className="text-destructive text-xs mt-1"
        >
          {error.message}
        </span>
      )}
    </div>
  );
}
