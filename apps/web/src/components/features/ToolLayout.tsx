"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StudioShell } from "@/components/layout/StudioShell";

/**
 * 工具页统一骨架：左参数区 + 右结果区
 * 所有 9 个工具页复用，保证交互一致性
 */
export function ToolLayout({
  title,
  description,
  breadcrumbs,
  params,
  results,
  aside,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbs: { label: string; href?: string }[];
  params: React.ReactNode;
  results: React.ReactNode;
  aside?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <StudioShell
      title={title}
      description={description}
      actions={actions}
    >
      <nav aria-label="面包屑" className="mb-4">
        <ol className="flex items-center gap-1.5 text-xs text-fg-subtle">
          {breadcrumbs.map((b, i) => (
            <li key={b.label} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              {b.href ? (
                <Link href={b.href} className="hover:text-fg-muted hover:underline">
                  {b.label}
                </Link>
              ) : (
                <span className="text-fg-muted">{b.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">{params}</div>
        <div className="min-w-0 space-y-4">{results}</div>
        {aside}
      </div>
    </StudioShell>
  );
}

export function BackToToolbox() {
  return (
    <Link
      href="/toolbox"
      className="inline-flex items-center gap-1 text-xs text-fg-subtle hover:text-fg-muted"
    >
      <ArrowLeft className="size-3" aria-hidden />
      返回工具箱
    </Link>
  );
}
