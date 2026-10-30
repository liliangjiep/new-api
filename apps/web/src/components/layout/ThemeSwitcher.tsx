"use client";

import { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";
import { THEMES } from "@/lib/theme";
import { useThemeStore } from "@/stores";
import { Dropdown, DropdownItem } from "@/components/ui/overlays";
import { cn } from "@/lib/cn";

export function ThemeSwitcher() {
  const { theme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <Dropdown
      trigger={
        <button
          type="button"
          aria-label="切换主题"
          className="flex size-8 items-center justify-center rounded-xs text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <Palette className="size-4" />
        </button>
      }
    >
      <div className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
        主题
      </div>
      {THEMES.map((t) => (
        <DropdownItem key={t.id} onClick={() => setTheme(t.id)}>
          <span
            className="size-3.5 shrink-0 rounded-xs border border-line-strong"
            style={{ background: t.swatch }}
            aria-hidden
          />
          <span className="flex-1">{t.label}</span>
          {mounted && theme === t.id && (
            <Check className="size-3.5 text-accent" aria-hidden />
          )}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

export function ThemeSwatchRow() {
  const { theme, setTheme } = useThemeStore();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTheme(t.id)}
          aria-pressed={theme === t.id}
          className={cn(
            "flex items-center gap-2 rounded-xs border px-2 py-1 text-xs transition-colors",
            theme === t.id
              ? "border-accent text-fg"
              : "border-line text-fg-muted hover:border-line-strong"
          )}
        >
          <span
            className="size-3 rounded-xs border border-line-strong"
            style={{ background: t.swatch }}
            aria-hidden
          />
          {t.label}
        </button>
      ))}
    </div>
  );
}
