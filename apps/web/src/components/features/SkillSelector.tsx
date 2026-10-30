"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * 原站技能选择器（generation-skill-trigger / generation-skill-selector）：
 *  - 触发器：h-[52px] rounded-xl px-0，左侧 44px 渐变图标块 + 技能名 + chevron
 *  - 浮层：fixed，宽度跟随 .generation-root（268~ 最大 460），maxHeight 跟随视口
 *  - 面板：标题「你想创作什么？」/ 副标题 / 分类 tabs（推荐 + 各 category）/ 搜索 / 技能卡片网格
 *  - 未登录时触发器 disabled
 */
export interface SkillItem {
  id: string;
  label: string;
  description: string;
  category: { key: string; label: string };
  isRecommended?: boolean;
  imageUrl?: string;
}

const ALL = "__all__";
const REC = "__rec__";

export function SkillSelector({
  items,
  selectedId,
  onChange,
  ariaLabel,
  defaultLabel = "图片创作",
  panelTitle = "你想创作什么？",
  panelSubtitle = "让每一个想法，都能成为画面",
  className,
  disabled,
  triggerVisual,
}: {
  items: SkillItem[];
  selectedId: string | null;
  onChange: (id: string) => void;
  ariaLabel: string;
  defaultLabel?: string;
  panelTitle?: string;
  panelSubtitle?: string;
  className?: string;
  disabled?: boolean;
  triggerVisual?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<string>(ALL);
  const [q, setQ] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cats = Array.from(new Map(items.map((i) => [i.category.key, i.category])).values());
  const hasRec = items.some((i) => i.isRecommended);
  const filtered = items.filter((i) => {
    if (cat === REC && !i.isRecommended) return false;
    if (cat !== ALL && cat !== REC && i.category.key !== cat) return false;
    if (!q.trim()) return true;
    return [i.label, i.description, i.category.label]
      .join(" ")
      .toLowerCase()
      .includes(q.trim().toLowerCase());
  });
  const selected = items.find((i) => i.id === selectedId);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "generation-skill-trigger group relative inline-flex h-[52px] min-w-0 items-center gap-2 rounded-xl px-0 text-left",
          "bg-[linear-gradient(to_right,var(--color-bg-subtle-action)_44px,transparent_100%)]",
          "disabled:cursor-not-allowed disabled:opacity-45",
          className
        )}
      >
        <span className="generation-skill-trigger-visual relative z-[1] flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-subtle-action p-1 text-foreground">
          {triggerVisual ?? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected?.imageUrl ?? ""}
              alt=""
              draggable={false}
              className="relative z-[1] h-full w-full rounded-lg object-contain"
            />
          )}
        </span>
        <span className="generation-skill-trigger-content relative z-[1] flex shrink-0 items-center gap-1.5">
          <span className="generation-skill-trigger-text inline-flex w-max shrink-0 flex-col items-start">
            <span className="generation-skill-trigger-label block whitespace-nowrap text-[14px] font-bold leading-[17px] tracking-tight text-fg">
              {selected ? selected.label : defaultLabel}
            </span>
            {selected && (
              <span className="generation-skill-trigger-desc mt-1 block whitespace-nowrap text-[10px] leading-3 text-muted">
                {selected.description}
              </span>
            )}
          </span>
          <span className="generation-skill-trigger-switch inline-flex size-6 shrink-0 items-center justify-center text-fg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
              className={cn(
                "generation-skill-trigger-chevron h-3.5 w-3.5 shrink-0 stroke-2 transition-transform",
                open && "rotate-90"
              )}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </span>
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={ariaLabel}
          className="fixed left-1/2 top-28 z-[420] w-[min(92vw,460px)] -translate-x-1/2 rounded-2xl border border-line bg-surface p-4 shadow-xl"
        >
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold">{panelTitle}</h3>
            <p className="text-[11px] text-muted">{panelSubtitle}</p>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1">
            {hasRec && (
              <button
                type="button"
                onClick={() => setCat(REC)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px]",
                  cat === REC ? "bg-surface-3 text-fg" : "text-muted hover:text-fg"
                )}
              >
                推荐
              </button>
            )}
            {cats.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCat(c.key)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px]",
                  cat === c.key ? "bg-surface-3 text-fg" : "text-muted hover:text-fg"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索技能"
            aria-label="搜索技能"
            className="mt-2.5 w-full rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs outline-none"
          />
          <ul className="mt-2.5 grid max-h-[52vh] grid-cols-2 gap-2 overflow-y-auto">
            {filtered.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(i.id);
                    setOpen(false);
                  }}
                  aria-current={selectedId === i.id ? "true" : undefined}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-xl border p-2 text-left",
                    selectedId === i.id
                      ? "border-accent/60 bg-accent-soft/10"
                      : "border-line bg-surface-2 hover:border-line-strong"
                  )}
                >
                  {i.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.imageUrl} alt="" className="h-16 w-full rounded-lg object-cover" />
                  )}
                  <span className="text-[12px] font-medium">{i.label}</span>
                  <span className="line-clamp-2 text-[10px] text-muted">{i.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
