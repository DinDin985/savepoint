"use client"

import { useState } from "react"
import { ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type MultiSelectOption = { readonly value: string; readonly label: string; readonly count?: number }

/** Popover + Command multi-select with checkboxes and per-option counts. */
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  hint,
  className,
}: {
  label: string
  options: readonly MultiSelectOption[]
  selected: readonly string[]
  onChange: (values: string[]) => void
  hint?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selectedSet = new Set(selected)
  // Hide empty categories unless they're already selected (e.g. from a shared URL).
  const visible = options.filter((o) => o.count === undefined || o.count > 0 || selectedSet.has(o.value))

  const toggle = (value: string) => {
    const next = selectedSet.has(value) ? selected.filter((v) => v !== value) : [...selected, value]
    // keep the option order stable regardless of click order
    onChange(options.map((o) => o.value).filter((v) => next.includes(v)))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={`${label} filter${selected.length ? `, ${selected.length} selected` : ""}`}
          className={cn(
            "h-9 justify-between gap-1.5 px-3",
            selected.length > 0 && "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary dark:border-primary/50 dark:bg-primary/10 dark:hover:bg-primary/15",
            className,
          )}
        >
          {label}
          {selected.length > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-primary-foreground tabular-nums">
              {selected.length}
            </span>
          )}
          <ChevronDownIcon
            data-icon="inline-end"
            className={cn("text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder={`Filter ${label.toLowerCase()}…`} />
          <CommandList>
            <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
            <CommandGroup>
              {visible.map((option) => {
                const checked = selectedSet.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggle(option.value)}
                    aria-checked={checked}
                    className="cursor-pointer gap-2.5 transition-colors [&>svg:last-child]:hidden"
                  >
                    <Checkbox checked={checked} tabIndex={-1} aria-hidden className="pointer-events-none" />
                    <span className={cn("flex-1 truncate", checked && "font-medium text-foreground")}>{option.label}</span>
                    {option.count !== undefined && (
                      <span className="text-xs text-muted-foreground tabular-nums">{option.count}</span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
          {(hint || selected.length > 0) && (
            <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
              <span className="text-[11px] text-muted-foreground">{hint}</span>
              {selected.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => onChange([])} className="h-8 hover:text-primary">
                  Clear
                </Button>
              )}
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
