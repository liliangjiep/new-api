"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bot, Clapperboard, Home, Images, LayoutDashboard, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * 原站 1:1 骨架（susu.da-ai.cc 运行时实测 + chunk 79807/39302 逆向）：
 *
 *  workspace-shell (h-[calc(100vh-...)])
 *   └─ workspace-main-shell            ← 主区（含左侧 52px 图标轨 + 内容）
 *       ├─ aside (52px 图标轨)          图标 36×36，纵向排列
 *       └─ workspace-main-content
 *           └─ section (px-4 sm:px-6 lg:px-10, max-w-[calc(100%-56px)])
 *               └─ toolbox-workspace-layout
 *                   └─ genify-toolbox-3col  三栏栅格
 *                        col1 编辑区  551px  (minmax(386px,0.51fr))
 *                        col2 预览区 1020px  (minmax(0,1fr))
 *                        col3 最近    202px  (minmax(150px,0.18fr))
 */

/* 79807.J / 79807.TN：三栏栅格列宽定义 */
const GRID = {
  base: "genify-toolbox-3col grid min-h-0 w-full flex-1 gap-3 grid-rows-[minmax(0,1fr)] items-stretch overflow-hidden max-lg:grid-cols-1 max-lg:grid-rows-none max-lg:overflow-visible",
  expanded:
    "grid-cols-[var(--toolbox-expanded-columns,minmax(386px,0.51fr)_minmax(0,1fr)_minmax(150px,0.18fr))]",
  collapsed:
    "grid-cols-[var(--toolbox-collapsed-columns,minmax(386px,0.51fr)_minmax(0,1fr)_minmax(0,0.07fr))]",
} as const;

/* 79807.JH：编辑区面板（rounded-2xl 无边框 backdrop-blur-lg p-2 sm:p-2.5） */
export const PANEL = "toolbox-editor-panel-root rounded-2xl border-0 shadow-premium backdrop-blur-lg relative flex min-h-0 min-w-0 flex-col gap-4 p-2 sm:p-2.5 lg:h-full lg:min-h-0 lg:flex-1 !border !shadow-none";
/* 79807.Oc：面板头 */
export const PANEL_HEADER = "toolbox-editor-panel-header relative z-[1] shrink-0 backdrop-blur-sm";
/* 79807.d：面板体 */
export const PANEL_BODY = "relative min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-y-contain scrollbar-none";
/* 79807._3：内容区 */
export const PANEL_CONTENT =
  "relative flex min-h-0 flex-1 flex-col px-2 flex w-full min-h-0 flex-col max-lg:h-[min(66vh,34rem)] max-lg:min-h-[22rem] lg:flex-1";
/* 79807.Su：预览面板 */
export const PREVIEW_PANEL =
  "toolbox-preview-panel relative flex min-h-0 min-w-0 flex-col overflow-hidden p-3 sm:p-4 lg:h-full lg:min-h-0 lg:flex-1 !border !shadow-none";

const RAIL = [
  { href: "/", label: "首页", Icon: Home },
  { href: "/agent-cloud", label: "Agent", Icon: Bot },
  { href: "/toolbox/video-generation", label: "AI视频", Icon: Clapperboard },
  { href: "/toolbox/image-generation", label: "AI图片", Icon: ImageIcon },
  { href: "/canvas", label: "画布", Icon: LayoutDashboard },
  { href: "/assets", label: "资产", Icon: Images },
];

/**
 * 原站工具页统一头部（toolbox-editor-panel-header 实测）：
 *   [返回 32×32] │ <当前工具名>            [＋ 新建]
 * 「返回」为浮层返回键，「新建」为 accent-deep 文字按钮。
 */
export function ToolHeader({
  title,
  onBack,
  onNew,
  newLabel = "新建",
}: {
  title: string;
  onBack?: () => void;
  onNew?: () => void;
  newLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <nav aria-label="当前位置" className="flex min-w-0 items-center gap-2 text-xs font-semibold">
        <div className="flex shrink-0 flex-nowrap items-center gap-2 overflow-visible whitespace-nowrap">
          <button
            type="button"
            onClick={onBack}
            aria-label="返回"
            className="pointer-events-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition hover:bg-surface-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              aria-hidden
              className="h-[18px] w-[18px]"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
        </div>
        <span className="h-4 w-px shrink-0 bg-line-strong" aria-hidden />
        <span className="min-w-0 truncate text-xs font-semibold leading-tight tracking-tight text-fg">
          {title}
        </span>
      </nav>
      <button
        type="button"
        onClick={onNew}
        aria-label={newLabel}
        className="ui-button ui-button-ghost inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold !text-accent-deep disabled:opacity-40"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden
          className="h-3 w-3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        {newLabel}
      </button>
    </div>
  );
}

/**
 * 原站左侧 52px 图标轨（workspace-sidebar 实测）：
 *  - aside 宽 52px，nav 内每个 item 36×36，垂直间距 16px（y: 8/60/112/164/216/268）
 *  - 当前页 item 有 aria-current=page 高亮底色
 */
export function WorkspaceRail() {
  const pathname = usePathname();
  const railActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(`${href}?`);

  return (
    <aside
      aria-label="工作台导航"
      className="workspace-sidebar relative z-40 flex h-full w-[52px] min-w-[52px] shrink-0 flex-col items-center justify-center"
    >
      <div className="workspace-sidebar-nav-viewport relative flex min-h-0 w-full flex-1 justify-center overflow-hidden">
        <nav className="workspace-sidebar-nav scrollbar-none flex min-h-0 w-full flex-1 flex-col items-center overflow-x-hidden overflow-y-auto">
          <div className="workspace-sidebar-nav-content flex w-full flex-col items-center px-[6px] pt-2">
            {RAIL.map((r) => {
              const active = railActive(r.href);
              return (
                <Link
                  key={r.href}
                  href={r.href}
                  title={r.label}
                  aria-label={r.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "workspace-sidebar-item group mb-4 flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl bg-transparent p-0 text-center transition-colors duration-200",
                    active ? "bg-interaction text-fg" : "text-fg hover:bg-interaction hover:text-fg"
                  )}
                >
                  <div className="workspace-sidebar-item-icon flex h-[22px] w-[22px] shrink-0 items-center justify-center transition-colors duration-200">
                    <r.Icon className="h-[22px] w-[22px]" strokeWidth={1.25} aria-hidden />
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
}

export function ToolboxShell({
  editor,
  preview,
  queue,
  rightCollapsed,
}: {
  editor: React.ReactNode;
  preview: React.ReactNode;
  queue?: React.ReactNode;
  rightCollapsed?: boolean;
}) {
  return (
    <div className="workspace-shell relative flex h-[calc(100vh-var(--global-open-panel-height,0px))] min-h-0 min-w-0 flex-row bg-bg-subtle">
      <WorkspaceRail />
      <div className="workspace-main-shell relative flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden rounded-l-3xl bg-bg">
        <main className="workspace-main-content flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto max-lg:pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]">
          {/* 原站实测：section px-4 sm:px-6 lg:px-10，max-width calc(100% - 56px) 居中 */}
          <section className="relative z-[1] mx-auto w-full max-w-[calc(100%-56px)] bg-bg px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6">
            <div className="toolbox-workspace-layout flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-lg:overflow-visible">
              <div className={cn(GRID.base, rightCollapsed ? GRID.collapsed : GRID.expanded)}>
                <div
                  aria-label="编辑区"
                  className="toolbox-edit-region flex min-h-0 min-w-[386px] max-lg:min-w-0 flex-col lg:col-start-1 lg:row-start-1 lg:z-[25] lg:h-full lg:min-h-0 lg:overflow-hidden"
                >
                  {editor}
                </div>
                <div
                  aria-label="预览区"
                  className="toolbox-preview-region min-h-0 min-w-0 lg:col-start-2 lg:row-start-1 lg:z-10 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden"
                >
                  {preview}
                </div>
                <div
                  aria-label="最近任务"
                  className={cn(
                    "toolbox-queue-region min-h-0",
                    rightCollapsed ? "min-w-0" : "min-w-[150px]",
                    "max-lg:min-w-0 lg:col-start-3 lg:row-start-1 lg:z-10 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden"
                  )}
                >
                  {queue}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/**
 * 原站提交条（toolbox-generation-submit-button 实测）：
 *  - 容器 relative z-[1] shrink-0 space-y-1.5 pt-1
 *  - 按钮 ui-button-primary + flex-wrap gap-x-5 gap-y-1 rounded-md py-1.5 text-xs
 *  - 内含 generation-submit-title（图标 + label）与 generation-submit-credit（预计 -- 积分）
 */
export function SubmitBar({
  label,
  credits,
  disabled,
  onClick,
  loading,
  icon,
}: {
  label: string;
  credits?: number | null;
  disabled?: boolean;
  onClick: () => void;
  loading?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative z-[1] shrink-0 space-y-1.5 pt-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        className="ui-button ui-button-primary toolbox-generation-submit-button relative w-full flex-wrap gap-x-5 gap-y-1 rounded-md py-1.5 text-xs"
      >
        <span className="generation-submit-title flex min-w-0 max-w-full items-center justify-center gap-2 truncate text-center">
          {icon}
          <span className="generation-submit-label truncate">{loading ? "提交中…" : label}</span>
        </span>
        <span className="generation-submit-credit pointer-events-none inline-flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-1 text-[10px] font-normal leading-snug">
          预计 {credits != null && credits > 0 && !loading ? credits : "--"} 积分
        </span>
      </button>
    </div>
  );
}

/** 中栏预览区通用外壳：toolbox-preview-panel + Tabs 头 + 面板内容 */
export function PreviewPanel({
  tabs,
  activeTab,
  onTabChange,
  headerAction,
  children,
}: {
  tabs: { key: string; label: string; panel: React.ReactNode; panelClassName?: string }[];
  activeTab: string;
  onTabChange: (k: string) => void;
  headerAction?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className={PREVIEW_PANEL}>
      <div className="toolbox-preview-panel-body flex min-h-0 flex-1 flex-col gap-3 lg:overflow-hidden">
        <div className="toolbox-preview-panel-header relative flex shrink-0 flex-row flex-wrap items-end gap-x-4 gap-y-1">
          <div role="tablist" className="flex items-center gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                type="button"
                aria-selected={activeTab === t.key}
                onClick={() => onTabChange(t.key)}
                className={cn(
                  "toolbox-preview-tab relative pb-2 text-xs tracking-tight transition-colors",
                  activeTab === t.key ? "text-fg" : "text-fg-muted hover:text-fg"
                )}
              >
                {t.label}
                {activeTab === t.key && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-fg" aria-hidden />
                )}
              </button>
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
                className={cn(
                  "toolbox-preview-panel-pane min-h-0 flex-1",
                  on ? (t.panelClassName ?? "flex h-full min-h-0 flex-col") : "hidden"
                )}
              >
                {t.panel}
              </div>
            );
          })}
          {children}
        </div>
      </div>
    </div>
  );
}

/** 右栏：最近任务（原站 toolbox-queue-*，标题 41×24） */
export function QueuePanel({ children }: { children?: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="toolbox-queue-shell group/toolbox-queue flex min-h-0 min-w-0 flex-col lg:h-full lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <div className="toolbox-queue-header toolbox-editor-panel-header relative z-[1] shrink-0 backdrop-blur-sm">
        <div className="toolbox-queue-header-row flex items-center justify-between gap-2">
          <h2 className="toolbox-queue-title text-sm font-medium">最近</h2>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label="收起最近任务"
            aria-expanded={!collapsed}
            className="toolbox-queue-heading-toggle group inline-flex h-6 items-center gap-1.5 bg-transparent p-0 text-left text-[11px] text-muted"
          >
            {collapsed ? "展开" : "收起"}
          </button>
        </div>
      </div>
      {collapsed ? null : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">{children}</div>
      )}
    </div>
  );
}

/** 126575 参考示例轮播（result-example-display） */
export function ExampleCarousel({
  title,
  description,
  images,
}: {
  title: string;
  description: string;
  images: { src: string; alt: string }[];
}) {
  const [idx, setIdx] = useState(0);
  const cur = images[idx];
  return (
    <div className="result-example-display flex h-full min-h-0 w-full flex-col items-center justify-center gap-5 overflow-y-auto px-4 py-6 text-center">
      <div className="result-example-heading flex max-w-2xl flex-col items-center gap-3">
        <h2 className="result-example-title text-xl font-bold leading-none text-foreground">{title}</h2>
        <div className="result-example-description text-sm leading-none text-muted">{description}</div>
      </div>
      <div className="relative flex w-full max-w-[560px] items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cur.src}
          alt={cur.alt}
          className="max-h-[52vh] w-auto max-w-full rounded-2xl border border-line object-contain"
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {images.map((im, i) => (
          <button
            key={im.src}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`查看示例 ${i + 1}`}
            aria-current={i === idx ? "true" : undefined}
            className={cn(
              "size-8 rounded-lg border text-xs tabular-nums transition-colors",
              i === idx
                ? "border-accent bg-accent-soft/30 text-fg"
                : "border-line text-fg-muted hover:border-line-strong"
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
