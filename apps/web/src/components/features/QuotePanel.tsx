"use client";

import { useMemo, useState } from "react";
import { Coins, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/surfaces";
import { cn } from "@/lib/cn";

export interface QuoteLine {
  label: string;
  spec?: string;
  points: number;
  discount?: string;
}

export interface QuoteResult {
  estimatedCredits: number;
  lines: QuoteLine[];
  /** 报价指纹，后端据此防止前端篡改 */
  fingerprint?: string;
  expiresAt?: string;
}

export function QuotePanel({
  quote,
  balance,
  loading,
  onConfirm,
  confirmText = "确认生成",
  disabled,
}: {
  quote: QuoteResult | null;
  balance: number;
  loading?: boolean;
  onConfirm?: () => void;
  confirmText?: string;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const discounted = useMemo(
    () => quote?.lines.filter((l) => l.discount) ?? [],
    [quote]
  );

  if (loading) {
    return (
      <div className="rounded-md border border-line bg-surface p-4">
        <div className="skeleton h-4 w-28 rounded-xs" />
        <div className="skeleton mt-3 h-7 w-36 rounded-xs" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="rounded-md border border-dashed border-line bg-surface/50 p-4">
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <Info className="size-3.5" aria-hidden />
          填写参数后自动报价，确认后才会扣费
        </p>
      </div>
    );
  }

  const insufficient = quote.estimatedCredits > balance;

  return (
    <div className="rounded-md border border-line bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
        <p className="text-sm font-medium text-fg">预计消耗</p>
        <p className="tabular text-lg font-semibold text-accent">
          {quote.estimatedCredits}
          <span className="ml-1 text-xs font-normal text-fg-subtle">积分</span>
        </p>
      </div>

      <ul className="divide-y divide-line/60">
        {quote.lines.map((line, i) => (
          <li
            key={`${line.label}-${i}`}
            className="flex items-center justify-between gap-3 px-4 py-2"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-fg">{line.label}</span>
              {line.spec && (
                <span className="tabular block text-xs text-fg-subtle">
                  {line.spec}
                </span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {line.discount && <Badge tone="accent">{line.discount}</Badge>}
              <span className="tabular text-sm text-fg-muted">{line.points}</span>
            </span>
          </li>
        ))}
      </ul>

      {discounted.length > 0 && (
        <div className="border-t border-line px-4 py-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-fg-subtle underline-offset-4 hover:text-fg-muted hover:underline"
          >
            {expanded ? "收起折扣说明" : "查看折扣明细"}
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1">
              {discounted.map((line, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-xs text-fg-subtle"
                >
                  <span>{line.label} 原价</span>
                  <span className="tabular">
                    {Math.round(line.points / (1 - (parseFloat(line.discount ?? "0") || 0)))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs text-fg-muted">
          <Coins className="size-3.5 text-accent" aria-hidden />
          当前余额
          <span className="tabular text-fg">{balance}</span>
        </p>
        {onConfirm && (
          <Button
            onClick={onConfirm}
            disabled={disabled || insufficient}
            size="sm"
          >
            {insufficient ? "积分不足" : confirmText}
          </Button>
        )}
      </div>

      {insufficient && (
        <p
          role="alert"
          className="flex items-center gap-2 border-t border-danger/30 bg-danger/8 px-4 py-2.5 text-xs text-danger"
        >
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          还差 {quote.estimatedCredits - balance} 积分，去充值后再生成
        </p>
      )}
    </div>
  );
}

/** 通用参数区容器 */
export function FieldGroup({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-md border border-line bg-surface", className)}>
      <div className="border-b border-line px-4 py-3">
        <h3 className="text-sm font-medium text-fg">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-fg-subtle">{description}</p>
        )}
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

/** 步骤指示器 */
export function Steps({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto" aria-label="流程步骤">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex shrink-0 items-center gap-1">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-xs text-[11px] font-medium",
                done && "bg-accent text-accent-fg",
                active && "bg-accent-soft text-accent ring-1 ring-accent/40",
                !done && !active && "bg-surface-3 text-fg-subtle"
              )}
              aria-hidden
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "text-xs",
                active ? "text-fg" : "text-fg-subtle"
              )}
            >
              {s}
            </span>
            {i < steps.length - 1 && (
              <span className="mx-1 h-px w-4 bg-line" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
