"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * 原站 Popover 选择器（toolbox-selector-trigger 实测 class 逐字复刻）：
 *  - 触发器 h-[52px] rounded-xl border px-2 py-2 text-[11px]
 *    ├── toolbox-selector-icon  h-7 w-7 rounded-md（图标）
 *    ├── toolbox-selector-text  min-w-0 flex-1
 *    │     ├── toolbox-selector-label  block text-[10px] font-semibold text-muted（标签）
 *    │     └── 当前值（model-summary-text / summary）
 *    └── toolbox-selector-chevron h-3 w-3 text-muted
 *  - 面板浮层：选项列表，hover 高亮
 *  - 选项：{ value, label, description? }
 */
export function PopoverSelect({
  label,
  value,
  options,
  onChange,
  align = "start",
  className,
  summary,
  triggerClassName,
  disabled,
  ariaLabel,
  icon,
  compact,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; description?: string }[];
  onChange: (v: string) => void;
  align?: "start" | "end";
  className?: string;
  summary?: React.ReactNode;
  triggerClassName?: string;
  disabled?: boolean;
  ariaLabel?: string;
  icon?: React.ReactNode;
  /** 32px 高的紧凑变体（原站 inline options：图片文案 / 图片比例） */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cur = options.find((o) => o.value === value);

  if (compact) {
    return (
      <div ref={ref} className={cn("relative min-w-0", className)}>
        <button
          type="button"
          aria-label={ariaLabel ?? label}
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "toolbox-selector-trigger relative flex h-8 w-full min-w-0 cursor-pointer list-none items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs font-medium text-fg transition hover:border-line-strong hover:bg-surface-2",
            triggerClassName
          )}
        >
          {summary ?? (
            <>
              <span className="shrink-0 text-muted">{label}</span>
              <span className="min-w-0 truncate font-semibold">{cur?.label ?? value}</span>
            </>
          )}
          <Chevron />
        </button>

        {open && (
          <div
            role="listbox"
            className={cn(
              "absolute top-[calc(100%+4px)] z-[320] min-w-full overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-dialog",
              align === "end" ? "right-0" : "left-0"
            )}
          >
            {options.map((o) => (
              <Option
                key={o.value}
                option={o}
                selected={o.value === value}
                onSelect={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        aria-label={ariaLabel ?? (cur ? `${label} ${cur.label}` : label)}
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "toolbox-selector-trigger flex h-[52px] w-full cursor-pointer list-none items-center gap-2 rounded-xl border px-2 py-2 text-left text-[11px] font-medium text-fg shadow-none outline-none ring-0 transition hover:border-line-strong hover:bg-surface-2 data-[open=true]:border-line-strong data-[open=true]:bg-surface-2",
          triggerClassName
        )}
      >
        {icon !== undefined && (
          <span className="toolbox-selector-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted shadow-none" aria-hidden>
            {icon}
          </span>
        )}
        <span className="toolbox-selector-text min-w-0 flex-1 text-left">
          <span className="toolbox-selector-label block text-[10px] font-semibold leading-tight text-muted">{label}</span>
          {summary ?? (
            <span className="mt-px flex min-w-0 items-baseline gap-1.5">
              <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(8px,2.2vw,10px)] font-semibold leading-snug text-fg">
                {cur?.label ?? value}
              </span>
            </span>
          )}
        </span>
        <Chevron />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute top-[calc(100%+4px)] z-[320] min-w-full overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-dialog",
            align === "end" ? "right-0" : "left-0"
          )}
        >
          {options.map((o) => (
            <Option
              key={o.value}
              option={o}
              selected={o.value === value}
              onSelect={() => {
                onChange(o.value);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Chevron() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
      className="toolbox-selector-chevron h-3 w-3 shrink-0 text-muted transition-transform duration-200"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function Option({
  option,
  selected,
  onSelect,
}: {
  option: { value: string; label: string; description?: string };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-1.5 text-left transition-colors",
        selected ? "bg-surface-2" : "hover:bg-surface-2"
      )}
    >
      <span className="text-xs font-medium">{option.label}</span>
      {option.description && <span className="text-[10px] text-muted">{option.description}</span>}
    </button>
  );
}

/** 原站 52px 高的模型/设置选择器 */
export function TallPopoverSelect(props: React.ComponentProps<typeof PopoverSelect>) {
  return <PopoverSelect {...props} />;
}
