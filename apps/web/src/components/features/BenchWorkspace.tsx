"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Bot, Clapperboard, Home, Images, LayoutGrid, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { WorkspaceShell } from "@/components/features/WorkspaceShell";
import { useToast } from "@/components/features/ToastHost";

/**
 * 原站 1:1 骨架 —— new-ai
 *
 *  body
 *  └─ div.workspace-shell                       h-[calc(100vh-...)] flex-row bg-bg-subtle
 *     ├─ aside.workspace-sidebar                52px 图标轨
 *     └─ div.workspace-main-shell               flex-row rounded-l-3xl bg-background
 *        ├─ aside.workspace-pinned-navigation    248px（工具页）
 *        ├─ aside.workspace-floating-navigation  ×3（hover 浮层，隐藏）
 *        └─ main.workspace-main-content
 *           └─ div.toolbox-workspace-layout
 *              └─ section                        ← max-width 用 gutter 变量
 *                 └─ div.genify-toolbox-3col    ← 三栏栅格
 *                    ├─ div.toolbox-edit-region
 *                    ├─ div.toolbox-preview-region
 *                    └─ div.toolbox-queue-region
 */

/* ================================================================== *
 * 三栏栅格运行时算法
 * 逐字复刻原站 chunk 9993 模块 39302（已在 1280/1440/1600/1920/2200
 * 五个断点实测 inline style 完全一致）。
 * ================================================================== */
const GRID_CLASS =
  "genify-toolbox-3col [@media(min-width:1024px)]:[html[data-toolbox-queue-collapsed]_&]:!grid-cols-[var(--toolbox-collapsed-columns,minmax(386px,0.51fr)_minmax(0,1fr)_minmax(0,0.07fr))] grid min-h-0 w-full flex-1 gap-3 grid-rows-[minmax(0,1fr)] items-stretch overflow-hidden max-lg:grid-cols-1 max-lg:grid-rows-none max-lg:overflow-visible";

export function useToolboxColumns() {
  const gridRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const compute = () => {
      const shell = grid.closest(".workspace-main-shell");
      const n =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const gs = getComputedStyle(grid);
      const parent = grid.parentElement
        ? getComputedStyle(grid.parentElement)
        : null;
      const padding = parent
        ? parseFloat(parent.paddingLeft) + parseFloat(parent.paddingRight)
        : 0;
      const width =
        (shell
          ? shell.getBoundingClientRect().width
          : grid.getBoundingClientRect().width) -
        56 -
        padding;
      const available = Math.max(
        1,
        width - 2 * parseFloat(gs.columnGap || "12")
      );

      const vw = window.innerWidth;
      const xl = vw >= 2200;
      const lg = vw >= 1800;
      const minFr = (xl ? 32 : lg ? 30 : 29) * n;
      const ratio = xl ? 0.57 : lg ? 0.54 : 0.51;

      const expandedQueue = xl
        ? 12.5 * n
        : lg
          ? Math.min(12.75 * n, Math.max(10.5 * n, 0.105 * vw))
          : Math.min(12.25 * n, Math.max(10 * n, 0.11 * vw));
      const collapsedQueue = (lg ? 4.75 : 4.5) * n;

      const build = (queueFr: number, expanded: boolean) => {
        const editFr = Math.max(
          minFr,
          ((available - queueFr) * ratio) / (1 + ratio)
        );
        const previewFr = Math.max(1, available - queueFr - editFr);
        const mins = ["386px", "0", expanded ? "150px" : "0"];
        return [editFr, previewFr, queueFr]
          .map(
            (v, i) => `minmax(${mins[i]},${v.toFixed(3)}fr)`
          )
          .join(" ");
      };

      grid.style.setProperty(
        "--toolbox-expanded-columns",
        build(expandedQueue, true)
      );
      grid.style.setProperty(
        "--toolbox-collapsed-columns",
        build(collapsedQueue, false)
      );
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(grid);
    const shell = grid.closest(".workspace-main-shell");
    if (shell) ro.observe(shell);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, []);

  return gridRef;
}

/* ================================================================== *
 * 52px 图标轨
 * ================================================================== */
export { RAIL_ITEMS, ASSETS_ICON } from "@/lib/workspace-nav";
export { WorkspaceRail } from "@/components/features/WorkspaceShell";

/* ================================================================== *
 * 248px 固定导航面板（原站 workspace-pinned-navigation）
 * ================================================================== */
export interface NavSkill {
  label: string;
  description?: string;
  href: string;
  imageUrl?: string;
}

export type NavSection = import("@/lib/skills").NavSection;

export { PinnedNavigation } from "@/components/features/WorkspaceShell";

/* ================================================================== *
 * 工具页外壳
 * ================================================================== */
export function ToolboxShell({
  editor,
  preview,
  queue,
  nav,
  wrapEditor,
}: {
  editor: React.ReactNode;
  preview: React.ReactNode;
  queue?: React.ReactNode;
  nav?: { id: string; title: string; sections: NavSection[] };
  /** 原站部分工具页在编辑区内多包 2 层 div（image / video generation 实测） */
  wrapEditor?: boolean;
}) {
  const gridRef = useToolboxColumns();

  return (
    <WorkspaceShell pinned={nav}>
      <div className="toolbox-workspace-layout flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-lg:overflow-visible">
        <section className="relative z-[1] mx-auto w-full max-w-shell bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6 [--toolbox-section-gutter:56px] !max-w-[calc(100%-var(--toolbox-section-gutter))] [.workspace-main-shell:has(>.workspace-pinned-navigation[data-layout-expanded=true])_&]:[--toolbox-section-gutter:16px] duration-[250ms] ease-out motion-reduce:!transition-none max-lg:!max-w-[min(108rem,calc(100%-clamp(1.5rem,4vw,3.5rem)))] max-lg:!transition-none [.workspace-main-shell:has(>.workspace-pinned-navigation[data-animate-layout=true])_&]:[transition-property:max-width] flex min-h-0 flex-1 flex-col lg:overflow-hidden lg:!pl-2 lg:!pr-2">          <div
            ref={gridRef}
            className={cn(
              GRID_CLASS,
              "grid-cols-[var(--toolbox-expanded-columns,minmax(386px,0.51fr)_minmax(0,1fr)_minmax(150px,0.18fr))]"
            )}
          >
            <div
              aria-label="编辑区"
              className="toolbox-edit-region flex min-h-0 min-w-[386px] max-lg:min-w-0 flex-col lg:col-start-1 lg:row-start-1 lg:z-[25] lg:h-full lg:min-h-0 lg:overflow-hidden"
            >
              {wrapEditor ? (
                <div className="relative flex h-full min-h-0 min-w-0 flex-col lg:flex-1">
                  <div className="flex min-h-0 flex-1 flex-col">{editor}</div>
                </div>
              ) : (
                editor
              )}
            </div>
            <div
              aria-label="预览区"
              className="toolbox-preview-region min-h-0 min-w-0 lg:col-start-2 lg:row-start-1 lg:z-10 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden"
            >
              {preview}
            </div>
            <div
              aria-label="最近任务"
              className="toolbox-queue-region min-h-0 min-w-[150px] max-lg:min-w-0 [html[data-toolbox-queue-collapsed]_&]:min-w-0 lg:col-start-3 lg:row-start-1 lg:z-10 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden"
            >
              {queue}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}

/* ================================================================== *
 * 面板卡片
 * ================================================================== */
export const PANEL =
  "card rounded-3xl border-0 shadow-premium backdrop-blur-lg toolbox-editor-panel-root rounded-2xl border-0 shadow-premium backdrop-blur-lg relative flex min-h-0 min-w-0 flex-col gap-4 p-2 sm:p-2.5 lg:h-full lg:min-h-0 lg:flex-1 !border !shadow-none";
export const PANEL_HEADER =
  "toolbox-editor-panel-header relative z-[1] shrink-0 backdrop-blur-sm";
export const PANEL_BODY = "relative min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-y-contain scrollbar-none";
export const PANEL_CONTENT =
  "relative flex min-h-0 min-w-0 flex-1 flex-col px-2";
export const PREVIEW_PANEL =
  "card rounded-3xl border-0 shadow-premium backdrop-blur-lg toolbox-preview-panel relative flex min-h-0 min-w-0 flex-col overflow-hidden p-3 sm:p-4 lg:h-full lg:min-h-0 lg:flex-1 !border !shadow-none";

/**
 * 原站按钮基类（逐字复刻实测 class 串）
 */
export const BTN_BASE =
  "inline-flex items-center justify-center px-5 py-3 text-sm transition-all duration-200 disabled:pointer-events-none disabled:opacity-55 rounded-xl font-medium text-muted hover:bg-black/[0.035] hover:text-accent-deep";
export const BTN_GHOST = `ui-button ui-button-ghost ${BTN_BASE}`;
export const BTN_PRIMARY =
  "ui-button ui-button-primary inline-flex items-center justify-center px-5 py-3 text-sm transition-all duration-200 disabled:pointer-events-none disabled:opacity-55 rounded-xl border-0 bg-accent font-semibold tracking-wide text-on-accent shadow-glow";

/**
 * 面板头 A 型：返回 + 分隔线 + 标题 + 新建（32px）
 */
export function ToolHeader({
  title,
  onBack,
  onNew,
}: {
  title: string;
  onBack?: () => void;
  onNew?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <nav
        aria-label="当前位置"
        className="flex min-w-0 items-center gap-2 text-xs font-semibold"
      >
        <div className="canvas-page-back-float pointer-events-none z-30 flex shrink-0 flex-nowrap items-center gap-2 overflow-visible whitespace-nowrap">
          <button
            type="button"
            onClick={onBack}
            aria-label="返回"
            className="canvas-page-back-button pointer-events-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--canvas-text)] transition hover:bg-white/[0.58] hover:text-[var(--canvas-text)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
              data-slot="icon"
              className="h-[18px] w-[18px] stroke-[1.8]"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
              />
            </svg>
          </button>
        </div>
        <span
          className="canvas-topbar-divider h-4 w-px shrink-0 bg-[rgba(74,96,119,0.2)]"
          aria-hidden
        />
        <span className="toolbox-back-current min-w-0 truncate text-xs font-semibold leading-tight tracking-tight text-foreground">
          {title}
        </span>
      </nav>
      <button
        type="button"
        onClick={onNew}
        aria-label="新建"
        // 原站 resolved（实测）：80×32、padding 12px/20px、font 12px/600、
        // radius 10px、gap 4px、color rgb(24,24,24)、hover bg rgb(0,0,0,.035)。
        className={`${BTN_GHOST} inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold !text-accent-deep disabled:opacity-40`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden
          data-slot="icon"
          className="h-3 w-3"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        新建
      </button>
    </div>
  );
}

/**
 * 面板头 B 型：技能触发器（145×52）+ 新建
 */
export function SkillTrigger({
  label,
  imageUrl,
  desc,
  onClick,
  ariaLabel,
  width = 145,
  imageClassName,
  descClassName,
  chevronClassName,
}: {
  label: string;
  imageUrl?: string;
  desc?: string;
  onClick?: () => void;
  ariaLabel: string;
  width?: number;
  imageClassName?: string;
  descClassName?: string;
  chevronClassName?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      aria-expanded="false"
      onClick={onClick}
      style={{ width }}
      className="jsx-f5ae78e5cff69c4c generation-skill-trigger group relative inline-flex h-[52px] min-w-0 items-center gap-2 rounded-xl px-0 text-left bg-[linear-gradient(to_right,var(--color-bg-subtle-action)_44px,transparent_100%)] disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="jsx-f5ae78e5cff69c4c generation-skill-trigger-visual relative z-[1] inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-subtle-action p-1 text-foreground">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className={
              imageClassName ??
              "jsx-f5ae78e5cff69c4c relative z-[1] h-full w-full object-contain"
            }
          />
        ) : null}
      </span>
      <span className="jsx-f5ae78e5cff69c4c generation-skill-trigger-content relative z-[1] flex shrink-0 items-center gap-1.5">
        <span className="jsx-f5ae78e5cff69c4c generation-skill-trigger-text inline-flex w-max shrink-0 flex-col items-start">
          <span className="jsx-f5ae78e5cff69c4c generation-skill-trigger-label block whitespace-nowrap text-[14px] font-bold leading-[17px] tracking-tight text-[#3c3c3c]">
            {label}
          </span>
          {desc ? (
            <span
              className={
                descClassName ??
                "jsx-f5ae78e5cff69c4c generation-skill-trigger-desc block whitespace-nowrap text-[10px] leading-[13px] text-muted"
              }
            >
              {desc}
            </span>
          ) : null}
        </span>
        <span className="jsx-f5ae78e5cff69c4c generation-skill-trigger-switch inline-flex h-6 w-6 shrink-0 items-center justify-center text-[#3c3c3c]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden
            data-slot="icon"
            className={
              chevronClassName ??
              "generation-skill-trigger-chevron h-3.5 w-3.5 shrink-0 stroke-2 transition-transform"
            }
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
        </span>
      </span>
    </button>
  );
}

/**
 * 提交条：ui-button-primary + generation-submit-title / -credit
 */
export function SubmitBar({
  label,
  credits,
  disabled,
  onClick,
  loading,
  icon,
  buttonClassName,
  titleClassName,
  wrapperClassName,
  bare,
}: {
  label: string;
  credits?: number | null;
  disabled?: boolean;
  onClick: () => void;
  loading?: boolean;
  icon?: React.ReactNode;
  buttonClassName?: string;
  titleClassName?: string;
  wrapperClassName?: string;
  bare?: boolean;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
        // 原站 resolved 值（实测）：padding 12px/20px、font 12px/600、lh 16px、
        // radius 10px、gap 4px 20px、height 40px、bg rgb(39,39,39)、color rgb(250,250,250)、
        // shadow 0 4px 16px rgba(24,24,24,.14)。
        // 原站 class 里 py-1.5 / rounded-md 会被 px-5 / rounded-xl 覆盖（Tailwind v3 源码序），
        // 这里直接写最终生效值，避免依赖工具类覆盖顺序。
        className={
          buttonClassName ??
          "ui-button ui-button-primary inline-flex items-center justify-center px-5 py-3 text-sm transition-all duration-200 disabled:pointer-events-none disabled:opacity-55 rounded-xl border-0 bg-accent font-semibold tracking-wide text-on-accent shadow-glow toolbox-generation-submit-button relative w-full flex-wrap gap-x-5 gap-y-1 rounded-md py-1.5 text-xs"
        }
      >
        <span
          className={
            titleClassName ??
            "generation-submit-title flex min-w-0 max-w-full items-center justify-center gap-2 truncate text-center"
          }
        >
          {icon ?? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
              data-slot="icon"
              className="h-4 w-4 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
              />
            </svg>
          )}
          <span className="generation-submit-label truncate">
            {loading ? "提交中…" : label}
          </span>
        </span>
        <span className="generation-submit-credit font-credit pointer-events-none inline-flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-1 text-[10px] font-normal leading-snug [&_.credit-quote-price]:text-inherit">
          预计 {credits != null && credits > 0 && !loading ? credits : "--"} 积分
        </span>
      </button>
  );

  if (bare) return button;

  return (
    <div
      className={
        wrapperClassName ??
        "generation-controller-submit sticky bottom-0 z-[2] flex shrink-0 flex-col"
      }
    >
      {button}
    </div>
  );
}

/**
 * 中栏预览面板：tab「参考示例 | 收藏」
 */
export function PreviewPanel({
  tabs,
  activeTab,
  onTabChange,
  headerAction,
}: {
  tabs: { key: string; label: string; panel: React.ReactNode; panelClassName?: string }[];
  activeTab: string;
  onTabChange: (k: string) => void;
  headerAction?: React.ReactNode;
}) {
  return (
    <div className={PREVIEW_PANEL}>
      <div className="toolbox-preview-panel-body flex min-h-0 flex-1 flex-col gap-3 lg:overflow-hidden">
        <div className="toolbox-preview-panel-header relative flex shrink-0 flex-row flex-wrap items-end gap-x-4 gap-y-1">
          <div className="toolbox-preview-tabs-row flex flex-wrap items-center gap-0">
            {tabs.map((t, i) => (
              <div
                key={t.key}
                className="toolbox-preview-tab-wrap flex shrink-0 items-center"
              >
                {i > 0 && (
                  <span
                    className="toolbox-preview-tab-separator mx-3 h-4 w-px shrink-0 "
                    aria-hidden
                  />
                )}
                <button
                  type="button"
                  onClick={() => onTabChange(t.key)}
                  className={cn(
                    "toolbox-preview-tab relative pb-2 text-xs tracking-tight transition-colors",
                    activeTab === t.key
                      ? "font-semibold text-foreground"
                      : "font-normal  "
                  )}
                >
                  {t.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-[28%] bottom-0 h-0.5 rounded-full bg-foreground transition-opacity",
                      activeTab === t.key ? "opacity-100" : "opacity-0"
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
        {headerAction && (
          <div className="toolbox-preview-panel-header-action absolute right-4 top-2 max-sm:right-3">
            {headerAction}
          </div>
        )}
        <div className="toolbox-preview-panel-content flex min-h-0 flex-1 flex-col overflow-hidden overscroll-y-contain">
          {tabs.map((t) => {
            const on = activeTab === t.key;
            return (
              <div
                key={t.key}
                aria-hidden={!on}
                className={[
                  "toolbox-preview-panel-pane min-h-0 flex-1",
                  on
                    ? (t.panelClassName ?? "flex h-full min-h-0 flex-col")
                    : "hidden",
                ].join(" ")}
              >                {t.panel}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 右栏：最近任务（h2 > button）
 */
export function QueuePanel({
  children,
  headerAction,
  collapsedDraft,
}: {
  children?: React.ReactNode;
  headerAction?: React.ReactNode;
  collapsedDraft?: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const card =
    "card rounded-3xl border-0 shadow-premium backdrop-blur-lg relative flex min-h-0 min-w-0 flex-col overflow-visible p-2 sm:p-2.5 lg:h-full lg:min-h-0 lg:flex-1 lg:overflow-hidden !border !shadow-none";

  const collapsedCard =
    "card rounded-3xl border-0 shadow-premium backdrop-blur-lg relative min-h-0 min-w-0 lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col lg:items-center lg:justify-between lg:overflow-hidden lg:p-2 !border !shadow-none";

  const headerBlock = (extra = "") => (
    <div className={`toolbox-queue-header toolbox-editor-panel-header relative z-[1] shrink-0 backdrop-blur-sm ${extra}`}>
      <div className="toolbox-queue-header-row flex items-center justify-between gap-2">
        <h2 className="toolbox-queue-title mr-auto min-w-0 text-xs font-semibold tracking-tight text-foreground">
          <button
            type="button"
            aria-label="收起最近任务"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((v) => !v)}
            className="toolbox-queue-heading-toggle group inline-flex h-6 items-center gap-1.5 bg-transparent p-0 text-left max-lg:hidden"
          >
            最近
            <span className="toolbox-queue-collapse-icon inline-flex text-muted transition-colors group-hover:text-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden
                data-slot="icon"
                className="h-3 w-3 shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
            </span>
          </button>
          <span className="toolbox-queue-mobile-title hidden max-lg:inline">最近</span>
        </h2>
        {headerAction}
      </div>
    </div>
  );

  const list = (
    <div className="min-h-0 lg:flex-1 lg:overflow-y-auto lg:overflow-x-hidden lg:overscroll-y-contain scrollbar-none">
      <ul className="toolbox-queue-list mt-2 space-y-2">{children}</ul>
    </div>
  );

  return (
    <div
      data-collapsed={collapsed}
      className="toolbox-queue-shell group/toolbox-queue flex min-h-0 min-w-0 flex-col lg:h-full lg:min-h-0 lg:flex-1 lg:overflow-hidden"
    >
      {/* —— 移动端 —— */}
      <div className="lg:hidden">
        <div className={card}>
          {headerBlock()}
          {list}
        </div>
      </div>

      {/* —— 桌面展开 —— */}
      <div className="toolbox-queue-expanded-desktop flex flex-col overflow-hidden max-lg:!hidden group-data-[collapsed=true]/toolbox-queue:hidden [html[data-toolbox-queue-collapsed]_&]:hidden min-h-0 w-full min-w-0 flex-1 lg:min-h-0">
        <div className={card}>
          {headerBlock()}
          {list}
        </div>
      </div>

      {/* —— 桌面收起 —— */}
      <div className="toolbox-queue-collapsed-desktop hidden flex-col overflow-hidden max-lg:!hidden group-data-[collapsed=true]/toolbox-queue:flex [html[data-toolbox-queue-collapsed]_&]:flex min-h-0 w-full min-w-0 flex-1 lg:min-h-0">
        <div className={collapsedCard}>
          <button
            type="button"
            aria-label="展开最近任务"
            onClick={() => setCollapsed(false)}
            className="ui-button ui-button-ghost inline-flex items-center justify-center px-5 py-3 text-sm transition-all duration-200 disabled:pointer-events-none disabled:opacity-55 rounded-xl font-medium text-muted hover:bg-black/[0.035] hover:text-accent-deep  relative z-[1] mt-1 h-10 w-10 rounded-xl p-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
              data-slot="icon"
              className="h-3 w-3 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <div className="relative z-[1] flex w-full min-h-0 flex-1 flex-col gap-1.5 py-2">
            <div className="relative flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden overscroll-y-contain pt-0.5 scrollbar-none">
              {collapsedDraft}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QueueEmpty({ text }: { text: string }) {
  return (
    <li className="rounded-lg border border-dashed border-line p-3 text-xs text-muted">
      {text}
    </li>
  );
}

/** 草稿卡片（queue-draft-card：当前草稿(1) / 草稿(1) / 日期 / 时长 / 删除） */
export function QueueDraftCard({
  count = 1,
  date = "10/31",
  time = "10:05",
  label = "当前草稿",
  cover,
  onOpen,
  onDelete,
}: {
  count?: number;
  date?: string;
  time?: string;
  label?: string;
  cover?: string;
  onOpen?: () => void;
  onDelete?: () => void;
}) {
  const { push } = useToast();
  const open = onOpen ?? (() => push({ tone: "neutral", title: "已打开草稿" }));
  const remove = onDelete ?? (() => push({ tone: "neutral", title: "已删除草稿" }));
  return (
    <li data-queue-card-id="__draft__">
      <div className="queue-draft-card group/card relative overflow-hidden rounded-xl border bg-surface transition-[border-color,box-shadow,transform] duration-150 motion-safe:hover:-translate-y-px border-[rgba(88,104,124,0.42)] ">
        <button
          type="button"
          onClick={open}
          className="absolute inset-0 z-0 rounded-xl outline-none transition-colors"
          aria-label={`${label}(${count})`}
        />
        <div className="pointer-events-none relative z-10 flex gap-2 px-2.5 py-2.5">
          <div className="queue-draft-cover relative shrink-0 overflow-hidden bg-[#E8E8E8] h-[52px] w-[52px] rounded-lg">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="queue-draft-icon absolute inset-0 flex items-center justify-center text-muted"
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden
                  data-slot="icon"
                  className="h-6 w-6 shrink-0 opacity-85"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              <span className="queue-draft-status inline-flex w-fit max-w-full shrink-0 rounded-full text-[10px] font-semibold leading-tight text-accent-deep">
                草稿({count})
              </span>
            </div>
            <p className="queue-card-created-at flex flex-wrap gap-x-1 text-[10px] leading-tight tabular-nums text-muted">
              <span className="queue-card-created-date w-[5ch] shrink-0 whitespace-nowrap">
                {date}
              </span>
              <span className="queue-card-created-time w-[5ch] shrink-0 whitespace-nowrap">
                {time}
              </span>
            </p>
          </div>
        </div>
        <div
          className="ui-hover-action-delete-bar pointer-events-none absolute inset-x-0 bottom-0 z-[15] flex translate-y-full items-end justify-end gap-0.5 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-1 opacity-0 transition-[transform,opacity] duration-200 ease-out group-hover/card:translate-y-0 group-hover/card:opacity-100 h-7 pb-0.5 pt-1 rounded-b-xl overflow-hidden"
          role="presentation"
        >
          <button
            type="button"
            onClick={remove}
            className="hover-action-delete pointer-events-auto flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/95 transition-colors disabled:cursor-default "
            aria-label="删除"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
              data-slot="icon"
              className="h-3.5 w-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * 收起态草稿卡（queue-collapsed-card，44×44）
 */
export function QueueCollapsedDraft({
  count = 1,
  label = "当前草稿",
  cover,
  onOpen,
}: {
  count?: number;
  label?: string;
  cover?: string;
  onOpen?: () => void;
}) {
  const { push: pushCol } = useToast();
  return (
    <button
      type="button"
      onClick={onOpen ?? (() => pushCol({ tone: "neutral", title: "已展开草稿" }))}
      className="queue-collapsed-card group relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-[#E8E8E8] text-muted transition-[border-color,transform] duration-150 motion-safe:hover:-translate-y-px  border-[rgba(88,104,124,0.42)] "
      aria-label={`${label}(${count})`}
      data-queue-card-id="__draft__"
    >
      <div className="queue-draft-cover relative shrink-0 overflow-hidden bg-[#E8E8E8] h-full w-full">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="queue-draft-icon absolute inset-0 flex items-center justify-center text-muted"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
              data-slot="icon"
              className="h-4 w-4 shrink-0 opacity-85"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
              />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * 参考示例（原站 result-example-display）
 *
 * 原站逐页实测（2026-10-31）：
 *   /toolbox/image-generation  /toolbox/video-generation
 *   /toolbox/depth-video-clone  → 单帧 .result-example-single
 *   /toolbox/ecommerce-image-set → 轮播 .result-example-carousel + .result-example-track
 */
export function ExampleCarousel({
  title,
  description,
  images,
  descriptionNode,
  variant = "single",
}: {
  title: string;
  description: string;
  images: { src: string; alt: string }[];
  descriptionNode?: React.ReactNode;
  variant?: "single" | "carousel";
}) {
  /**
   * 原站（new-ai /toolbox/ecommerce-image-set 实测）轮播为「克隆首尾 + 无限循环」：
   *   - track 内共有 n+2 个 slide：[克隆最后一张, ...真实图片, 克隆第一张]
   *   - 初始 transform = translate3d(-100%, 0, 0) → 对齐 DOM 第 1 个（真实第 1 张）
   *   - 指示器数量 = 真实图片数（n），不计入克隆
   *   - 到末尾点「下一个」：先滑到尾部克隆，再无动画瞬移回真实第 1 张（视觉无差异）
   *   - 到开头点「上一个」：先滑到头部克隆，再瞬移到真实最后一张
   */
  const count = images.length;
  const [pos, setPos] = useState(1); // 当前可见 slide 在 track 中的 DOM 下标
  const [instant, setInstant] = useState(false); // 复位时关闭 transition，避免可见回滑
  const pendingReset = useRef<number | null>(null);

  // 真实图片在 track 中的位置为 1..count，头尾各一个克隆
  const slides = useMemo(
    () => (count > 1 ? [images[count - 1], ...images, images[0]] : images),
    [images, count]
  );

  const go = (d: number) => {
    setPos((p) => {
      const next = p + d;
      if (d > 0 && next === count + 1) {
        // 滑到尾部克隆 → 复位到真实第 1 张
        pendingReset.current = 1;
        return next;
      }
      if (d < 0 && next === 0) {
        // 滑到头部克隆 → 复位到真实最后一张
        pendingReset.current = count;
        return next;
      }
      return next;
    });
  };

  const jumpTo = (i: number) => {
    pendingReset.current = null;
    setPos(i + 1);
  };

  /** 克隆位复位：两帧内关掉 transition 再恢复（视觉上无位移） */
  const handleTransitionEnd = () => {
    const target = pendingReset.current;
    if (target == null) return;
    pendingReset.current = null;
    setInstant(true);
    setPos(target);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setInstant(false))
    );
  };

  const isCarousel = variant === "carousel" && count > 1;
  // 当前可见的「真实图片」下标（克隆位映射回 0..count-1）
  const active = count > 0 ? (((pos - 1) % count) + count) % count : 0;

  return (
    <div className="result-example-display flex h-full min-h-0 w-full flex-col items-center justify-center gap-5 overflow-y-auto px-4 py-6 text-center">
      <div className="result-example-heading flex max-w-2xl flex-col items-center gap-3">
        <h2 className="result-example-title text-xl font-bold leading-none text-foreground max-2xl:text-lg/none">
          {title}
        </h2>
        <div className="result-example-description text-sm leading-none text-muted max-xl:text-xs/none">
          {descriptionNode ?? (
            <p className="result-example-description-line">{description}</p>
          )}
        </div>
      </div>
      <div className="result-example-content relative aspect-video min-h-0 max-h-[70%] w-full max-w-5xl shrink-0">
        <div className="result-example-stage absolute inset-0 flex min-h-0 flex-col gap-3">
          {isCarousel ? (
            <div
              role="region"
              aria-roledescription="carousel"
              aria-label="结果示例轮播"
              className="result-example-carousel group/example-carousel relative flex min-h-0 w-full flex-1 flex-col items-center justify-center"
            >
              <button
                type="button"
                aria-label="上一个示例"
                onClick={() => go(-1)}
                className="result-example-prev group/example-handle invisible absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center opacity-0 transition-[visibility,opacity] duration-200 group-hover/example-carousel:visible group-hover/example-carousel:opacity-100"
              >
                <span className="result-example-prev-visual inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface/70 text-[#444] shadow-sm backdrop-blur-sm transition-[color,background-color] duration-200 group-hover/example-handle:bg-surface/90 group-hover/example-handle:text-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="result-example-prev-icon h-5 w-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </span>
              </button>

              <div className="result-example-viewport flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-2xl">
                <div
                  className="result-example-track flex h-full min-h-0 transition-transform duration-500 ease-out"
                  style={{
                    transform: `translate3d(-${pos * 100}%, 0px, 0px)`,
                    transitionDuration: instant ? "0ms" : undefined,
                  }}
                  onTransitionEnd={handleTransitionEnd}
                >
                  {slides.map((im, i) => {
                    const real = ((i - 1) % count + count) % count;
                    const isClone = i === 0 || i === count + 1;
                    return (
                      <div
                        key={`${im.src}-${i}`}
                        role="group"
                        aria-roledescription="slide"
                        aria-label={`${real + 1} / ${count}`}
                        className={cn(
                          "result-example-slide flex min-h-0 min-w-0 shrink-0 grow-0 basis-full items-center justify-center",
                          i !== pos && "pointer-events-none"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={im.src}
                          alt={im.alt}
                          loading={i === pos ? "eager" : "lazy"}
                          className="result-example-image min-h-0 max-h-full max-w-full rounded-2xl object-contain"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                aria-label="下一个示例"
                onClick={() => go(1)}
                className="result-example-next group/example-handle invisible absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center opacity-0 transition-[visibility,opacity] duration-200 group-hover/example-carousel:visible group-hover/example-carousel:opacity-100"
              >
                <span className="result-example-next-visual inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface/70 text-[#444] shadow-sm backdrop-blur-sm transition-[color,background-color] duration-200 group-hover/example-handle:bg-surface/90 group-hover/example-handle:text-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="result-example-next-icon h-5 w-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 19.5 15.75 12l-7.5-7.5" />
                  </svg>
                </span>
              </button>
            </div>
          ) : (
            <div className="result-example-single flex h-full min-h-0 w-full items-center justify-center">
              {images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[0].src}
                  alt={images[0].alt}
                  loading="eager"
                  className="result-example-image min-h-0 max-h-full max-w-full rounded-2xl object-contain"
                />
              ) : null}
            </div>
          )}
          {isCarousel ? (
            <div className="result-example-indicators flex shrink-0 items-center justify-center gap-1.5">
              {images.map((im, i) => (
                <button
                  key={im.src}
                  type="button"
                  onClick={() => jumpTo(i)}
                  aria-label={`查看示例 ${i + 1}`}
                  aria-current={i === active ? "true" : "false"}
                  className={cn(
                    "result-example-indicator h-1.5 rounded-full transition-all",
                    i === active ? "w-5 bg-accent-deep" : "w-1.5 bg-[#ccc] hover:bg-muted"
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** 客户端副作用安全包装 */
export function useIsomorphicEffect(
  fn: React.EffectCallback,
  deps?: React.DependencyList
) {
  const isClient = typeof window !== "undefined";
  useEffect(() => {
    if (!isClient) return;
    return fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
