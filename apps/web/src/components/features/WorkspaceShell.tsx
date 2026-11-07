"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { titleForPath } from "@/lib/page-titles";
import { useLoginModalStore } from "@/stores";
import { LoginModal } from "@/components/features/LoginModal";
import { useToast } from "@/components/features/ToastHost";
import {
  ASSETS_ICON,
  FLOATING_NAV,
  RAIL_ITEMS,
  type NavSection,
} from "@/lib/workspace-nav";

export type { NavSection };
export { ASSETS_ICON, RAIL_ITEMS, FLOATING_NAV };

/**
 * 原站 new-ai 工作台外壳（2026-10-30 实测逐字复刻）
 *
 * body
 *  └─ div.workspace-shell  flex-row
 *     ├─ aside.workspace-sidebar                       52px 图标轨
 *     └─ div.workspace-main-shell                       rounded-l-3xl
 *        ├─ aside.workspace-pinned-navigation            248px（技能页固定面板）
 *        ├─ aside.workspace-floating-navigation ×3      hover 图标轨时弹出
 *        └─ main.workspace-main-content
 *  └─ nav.workspace-mobile-bottombar                    移动端底部栏
 *
 * 实测结论（1600×900）：
 *  - 浮动导航恒为 3 个（Agent / AI 视频 / AI 图片），顺序固定。
 *  - 固定导航仅在技能页出现（AI 图片 / AI 视频 / Agent / Agent 对话）。
 *  - 移动端底部栏在所有页面常驻。
 */

const PIN_ICON = (
  <g transform="scale(1.2)">
    <path d="M14.5 2.877a3.665 3.665 0 0 1 3.665 3.665v6.917a3.665 3.665 0 0 1-3.665 3.665h-9a3.665 3.665 0 0 1-3.665-3.665V6.542A3.665 3.665 0 0 1 5.5 2.877zM8.165 15.794H14.5a2.335 2.335 0 0 0 2.335-2.335V6.542A2.335 2.335 0 0 0 14.5 4.207H8.165zM5.5 4.207a2.335 2.335 0 0 0-2.335 2.335v6.917A2.335 2.335 0 0 0 5.5 15.794h1.335V4.207z" />
  </g>
);

/* ================================================================== *
 * 导航列表内部内容（Pinned / Floating 共用）
 * ================================================================== */
export function NavigationContent({
  sections,
}: {
  sections: NavSection[];
}) {
  return (
    <div
      className="workspace-navigation-content flex flex-col"
      style={{ padding: "8px 6px 16px" }}
    >
      <div className="generation-skills-navigation-list flex min-h-0 flex-col gap-5">
        {sections.map((sec) => (
          <section
            key={sec.title}
            className="workspace-navigation-section group/navigation-section flex shrink-0 flex-col"
          >
            <h3 className="workspace-navigation-section-heading">
              <span className="workspace-navigation-section-label flex w-full items-center gap-1.5 px-2.5 py-2 text-left text-sm font-medium text-subtle">
                <span className="workspace-navigation-section-title min-w-0 truncate">
                  {sec.title}
                </span>
              </span>
            </h3>
            <div
              aria-hidden="false"
              className="workspace-navigation-section-content grid transition-[grid-template-rows,opacity] duration-150 ease-out motion-reduce:transition-none grid-rows-[1fr] opacity-100"
            >
              <div className="workspace-navigation-section-clip min-h-0 overflow-hidden">
                <div className="workspace-navigation-section-items flex flex-col gap-[1px]">
                  {sec.items.map((item) => (
                    <div
                      key={item.href + item.label}
                      className="navigation-section-item group/navigation-item min-w-0 shrink-0 [&_.option-item-action]:py-1.5 [&_.option-item-label]:flex-1"
                    >
                      <div className="option-item flex min-w-0 w-full shrink-0 items-center rounded-lg bg-transparent text-sm font-normal text-foreground transition-colors hover:bg-interaction data-[selected=true]:bg-interaction data-[disabled=true]:text-subtle">
                        <Link
                          href={item.href}
                          className="option-item-action flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left cursor-pointer"
                        >
                          <span className="option-item-label min-w-0 truncate">
                            <span className="generation-skill-card-layout flex w-full min-w-0 gap-2.5 items-center">
                              <span className="generation-skill-card-image inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg p-1 h-9 w-9 bg-transparent">
                                {item.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.imageUrl}
                                    alt=""
                                    draggable={false}
                                    className="generation-skills-navigation-list-thumbnail h-full w-full rounded object-contain"
                                  />
                                ) : (
                                  <span className="h-7 w-7 rounded bg-surface-2" />
                                )}
                              </span>
                              <span className="generation-skill-card-content min-w-0 flex-1 gap-0.5 min-h-9">
                                <span className="generation-skills-navigation-list-title block truncate text-[13px] font-base leading-5">
                                  {item.label}
                                </span>
                                {item.description ? (
                                  <span className="generation-skills-navigation-list-description block truncate text-[10px] leading-4 text-muted">
                                    {item.description}
                                  </span>
                                ) : null}
                              </span>
                            </span>
                          </span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * 原站实测：滚动条 thumb 的高度/位移由运行时 JS 计算并写入 inline style：
 *   orig: style="height: 848px; transform: translateY(0px);"
 * 我们之前没有写 inline style → 高度恒为 0（几何差异，全站每个页面都命中）。
 * 规则（原站 .recon/static/js 行为）：
 *   thumbH = viewportH * (viewportH / contentH)   （最小 24px）
 *   translateY = scrollTop * (viewportH / contentH)
 */
function NavigationScrollbar({ scrollId }: { scrollId: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const thumb = ref.current;
    const view = document.getElementById(scrollId);
    if (!thumb || !view) return;

    const update = () => {
      const vh = view.clientHeight;
      const ch = view.scrollHeight;
      const ratio = ch > vh ? vh / ch : 1;
      const h = Math.max(24, vh * ratio);
      thumb.style.height = `${h}px`;
      thumb.style.transform = `translateY(${view.scrollTop * ratio}px)`;
    };

    update();
    view.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(view);
    const mo = new MutationObserver(update);
    mo.observe(view, { childList: true, subtree: true });
    window.addEventListener("resize", update);
    return () => {
      view.removeEventListener("scroll", update);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [scrollId]);

  return (
    <div className="workspace-navigation-scrollbar-track group/navigation-scrollbar absolute inset-y-0 right-0 z-10 w-[6px] pointer-events-none">
      <div
        ref={ref}
        role="scrollbar"
        aria-label="导航列表滚动条"
        aria-controls={scrollId}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={0}
        aria-valuenow={0}
        aria-hidden
        tabIndex={-1}
        className="workspace-navigation-scrollbar absolute right-0 top-0 touch-none select-none rounded-full transition-[width,opacity,background-color] duration-200 ease-out motion-reduce:transition-none group-hover/navigation-scrollbar:w-[6px] group-hover/navigation-scrollbar:bg-[var(--color-scrollbar-hover)] opacity-0 w-1 bg-[var(--color-scrollbar)]"
      />
    </div>
  );
}

/* ================================================================== *
 * Agent 导航内容（新任务 + 最近）—— 浮动与固定面板共用
 * ================================================================== */
export function AgentNavigationContent() {
  const { push } = useToast();
  const [recentOpen, setRecentOpen] = useState(true);
  return (
    <div
      className="workspace-navigation-content flex flex-col"
      style={{ padding: "8px 6px 16px" }}
    >
      <section className="agent-conversation-list flex min-h-0 flex-col gap-5">
        <div className="option-item flex min-w-0 w-full shrink-0 items-center rounded-lg bg-transparent text-sm font-normal text-foreground transition-colors hover:bg-interaction data-[selected=true]:bg-interaction data-[disabled=true]:text-subtle">
          <button
            type="button"
            onClick={() => push({ tone: "neutral", title: "已新建对话（演示）", description: "前端复刻演示，无需后端即可交互。" })}
            className="option-item-action flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left cursor-pointer"
          >
            <span
              aria-hidden="true"
              className="option-item-icon flex h-5 w-5 shrink-0 items-center justify-center [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.25]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden
                data-slot="icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                />
              </svg>
            </span>
            <span className="option-item-label min-w-0 truncate">新任务</span>
          </button>
        </div>
        <section className="workspace-navigation-section group/navigation-section flex shrink-0 flex-col">
          <h3 className="workspace-navigation-section-heading">
            <button
              type="button"
              aria-expanded={recentOpen}
              onClick={() => setRecentOpen((v) => !v)}
              className="workspace-navigation-section-toggle flex w-full items-center gap-1.5 px-2.5 py-2 text-left text-sm font-medium text-subtle"
            >
              <span className="workspace-navigation-section-title min-w-0 truncate">
                最近
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden
                data-slot="icon"
                className="workspace-navigation-section-chevron pointer-events-none h-3 w-3 shrink-0 transition-[transform,opacity] duration-200 ease-linear motion-reduce:transition-none rotate-0 opacity-0 group-hover/navigation-section:opacity-100"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>
          </h3>
          <div
            aria-hidden={!recentOpen}
            className={`workspace-navigation-section-content grid transition-[grid-template-rows,opacity] duration-150 ease-out motion-reduce:transition-none ${recentOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          >
            <div className="workspace-navigation-section-clip min-h-0 overflow-hidden">
              <div className="workspace-navigation-section-items flex flex-col gap-[1px]">
                <p className="agent-conversation-list-empty px-2 py-2 text-xs text-muted">
                  暂无历史对话
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}

/* ================================================================== *
 * 浮动导航（hover 图标轨时弹出）
 * ================================================================== */
export function FloatingNavigation({
  id,
  title,
  sections,
  open,
  variant = "skills",
}: {
  id: string;
  title: string;
  sections: NavSection[];
  open: boolean;
  variant?: "skills" | "agent";
}) {
  const { push } = useToast();
  const titleId = `workspace-floating-navigation-${id}-title`;
  const scrollId = `workspace-floating-navigation-${id}-scrollview`;
  return (
    <aside
      aria-labelledby={titleId}
      aria-hidden={!open}
      inert={!open ? true : undefined}
      className="workspace-floating-navigation absolute z-[600] shrink-0 border border-line bg-background shadow-[0_0_6px_-3px_rgba(0,0,0,0.1)] ease-out motion-reduce:transition-none max-lg:hidden transition-[top,height,width,transform,opacity,border-top-right-radius,border-bottom-right-radius]"
      style={{
        visibility: open ? "visible" : "hidden",
        top: "4px",
        left: "0px",
        height: "calc(100% - 8px)",
        width: "244px",
        transform: "translateX(0px)",
        opacity: open ? 1 : 0,
        transitionDuration: "180ms",
        borderRadius: "16px",
      }}
    >
      <span
        aria-hidden="true"
        className="workspace-floating-navigation-hover-bridge absolute inset-y-0"
        style={{ left: "-5px", width: "5px" }}
      />
      <div className="workspace-floating-navigation-surface h-full w-full overflow-hidden rounded-[inherit]">
        <div className="workspace-navigation flex h-full min-h-0 w-full flex-col overflow-hidden">
          <header className="workspace-navigation-header relative flex h-[52px] shrink-0 items-center px-1.5">
            <div className="workspace-navigation-header-row flex h-9 w-full items-center justify-between gap-3 pl-2.5">
              <h2
                id={titleId}
                className="workspace-navigation-title min-w-0 truncate text-[17px] font-medium"
              >
                {title}
              </h2>
              <span className="ui-hover-tooltip-trigger inline-flex items-center justify-center outline-none ">
                <button
                  type="button"
                  aria-label="固定面板"
                  className="workspace-navigation-toggle flex mr-1 h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
                  onClick={() => push({ tone: "neutral", title: "已固定面板（演示）" })}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                    className="workspace-navigation-toggle-icon pointer-events-none workspace-navigation-toggle-icon h-5 w-5 text-muted"
                  >
                    {PIN_ICON}
                  </svg>
                </button>
              </span>
            </div>
            <div
              aria-hidden="true"
              className="workspace-navigation-divider pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[var(--color-line)] transition-opacity duration-200 motion-reduce:transition-none opacity-0"
            />
          </header>
          <div className="workspace-navigation-scroll-area relative min-h-0 flex-1">
            <div
              id={scrollId}
              tabIndex={0}
              aria-label="导航列表"
              className="workspace-navigation-scrollview scrollbar-none h-full overflow-y-auto"
            >
              {variant === "agent" ? (
                <AgentNavigationContent />
              ) : (
                <NavigationContent sections={sections} />
              )}
            </div>
            <NavigationScrollbar scrollId={scrollId} />
          </div>
        </div>
      </div>
    </aside>
  );
}

const NAV_ICON_CLASS =
  "workspace-nav-icon pointer-events-none relative z-[1] h-[22px] w-[22px] shrink-0";

/* ================================================================== *
 * 52px 图标轨
 * ================================================================== */
export function WorkspaceRail({
  activePanel,
  onPanelHover,
}: {
  activePanel?: string | null;
  onPanelHover?: (panel: string | null) => void;
}) {
  const pathname = usePathname();
  const openLogin = useLoginModalStore((s) => s.show);
  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const itemClass = (active: boolean) =>
    `workspace-sidebar-item group mb-4 flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl bg-transparent p-0 text-center transition-colors duration-200 hover:bg-interaction hover:text-[#0f1419] aria-[current=page]:bg-interaction aria-[expanded=true]:bg-interaction ${
      active ? "text-[#0f1419]" : "text-foreground"
    }`;

  const iconClass = () =>
    "workspace-sidebar-item-icon flex h-[22px] w-[22px] shrink-0 items-center justify-center text-foreground transition-colors duration-200 group-hover:text-[#111111] group-aria-[current=page]:text-[#111111]";

  const renderItem = (r: (typeof RAIL_ITEMS)[number]) => {
    const active = isActive(r.href);
    const link = (
      <Link
        key={r.href}
        href={r.href}
        aria-label={r.label}
        aria-current={active ? "page" : undefined}
        aria-expanded={r.panel ? activePanel === r.panel : undefined}
        className={itemClass(active)}
        onMouseEnter={() => onPanelHover?.(r.panel ?? null)}
      >
        <div className={iconClass()}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            className={NAV_ICON_CLASS}
          >
            {r.svg}
          </svg>
        </div>
      </Link>
    );
    // 原站实测：只有无浮动面板的入口（首页 / 画布 / 资产）包裹在 tooltip trigger 内；
    // Agent / AI视频 / AI图片 三个有 `panel` 的入口，.workspace-sidebar-item 直接是
    // .workspace-sidebar-nav-content 的子节点（没有任何包裹元素）。
    if (r.panel) return link;
    return (
      <span
        key={r.href}
        className="ui-hover-tooltip-trigger inline-flex items-center justify-center outline-none "
        onMouseEnter={() => onPanelHover?.(r.panel ?? null)}
      >
        {link}
      </span>
    );  };

  return (
    <aside
      data-workspace-sidebar="true"
      className="workspace-sidebar relative z-40 flex h-full w-[52px] min-w-[52px] shrink-0 flex-col items-center justify-between overflow-hidden max-lg:hidden"
    >
      <div className="workspace-sidebar-top flex min-h-0 w-full flex-1 flex-col items-center">
        <div className="workspace-sidebar-nav-viewport relative flex min-h-0 w-full flex-1 justify-center overflow-hidden">
          <nav
            aria-label="工作台导航"
            className="workspace-sidebar-nav scrollbar-none flex min-h-0 w-full flex-1 flex-col items-center overflow-x-hidden overflow-y-auto"
          >
            <div className="workspace-sidebar-nav-content flex w-full flex-col items-center px-[6px] pt-2">
              {RAIL_ITEMS.map(renderItem)}
              <Link
                key="assets"
                href="/assets"
                aria-label="资产"
                aria-current={pathname === "/assets" ? "page" : undefined}
                className={`workspace-sidebar-item group mb-4 flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl bg-transparent p-0 text-center transition-colors duration-200 hover:bg-interaction hover:text-[#0f1419] aria-[current=page]:bg-interaction aria-[expanded=true]:bg-interaction ${
                  pathname === "/assets" ? "text-[#0f1419]" : "text-foreground"
                }`}
                onMouseEnter={() => onPanelHover?.(null)}
              >
                <div className="workspace-sidebar-item-icon flex h-[22px] w-[22px] shrink-0 items-center justify-center text-foreground transition-colors duration-200 group-hover:text-[#111111] group-aria-[current=page]:text-[#111111]">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                    className={NAV_ICON_CLASS}
                  >
                    {ASSETS_ICON}
                  </svg>
                </div>
              </Link>
              {/* 行内注释4：任务中心入口 —— GET /tasks 在此前没有任何 UI 入口，
                             用户看不到自己的生成记录，也无法取消/重试任务。 */}
              <Link
                key="tasks"
                href="/tasks"
                aria-label="任务"
                aria-current={pathname === "/tasks" ? "page" : undefined}
                className={`workspace-sidebar-item group mb-4 flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl bg-transparent p-0 text-center transition-colors duration-200 hover:bg-interaction hover:text-[#0f1419] aria-[current=page]:bg-interaction aria-[expanded=true]:bg-interaction ${
                  pathname === "/tasks" ? "text-[#0f1419]" : "text-foreground"
                }`}
                onMouseEnter={() => onPanelHover?.(null)}
              >
                <div className="workspace-sidebar-item-icon flex h-[22px] w-[22px] shrink-0 items-center justify-center text-foreground transition-colors duration-200 group-hover:text-[#111111] group-aria-[current=page]:text-[#111111]">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                    className={NAV_ICON_CLASS}
                  >
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 8v4l2.5 2" />
                  </svg>
                </div>
              </Link>
            </div>
          </nav>
        </div>
      </div>
      <div className="workspace-sidebar-account-container w-full shrink-0 px-[6px] pb-4">
        <div className="workspace-sidebar-account flex w-full shrink-0 flex-col items-center gap-4">
          <div className="header-user-guest relative">
            <button
              type="button"
              aria-label="登录"
              aria-haspopup="menu"
              aria-expanded={false}
              onClick={openLogin}
              className="header-user-login flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-xs font-semibold text-foreground"
            >
              登录
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ================================================================== *
 * 移动端底部导航
 * ================================================================== */
export function MobileBottombar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href;

  const itemClass = (active: boolean) =>
    `workspace-mobile-bottombar-item relative flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-2 text-center transition-colors duration-200 ${
      active ? "text-foreground" : "hover:text-foreground"
    }`;

  const iconClass =
    "workspace-nav-icon pointer-events-none workspace-mobile-bottombar-icon h-[1.35rem] w-[1.35rem] shrink-0";

  // 原站：当前激活项的 label 用 font-bold，其余用 font-semibold
  const labelClass = (active: boolean) =>
    `workspace-mobile-bottombar-label max-w-full whitespace-nowrap text-[0.6875rem] leading-none ${
      active ? "font-bold" : "font-semibold"
    }`;

  return (
    <nav
      aria-label="工作台导航"
      className="workspace-mobile-bottombar fixed bottom-0 left-0 right-0 z-50 hidden max-lg:block border-t pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-2xl backdrop-saturate-150"
      style={{ backgroundColor: "var(--workspace-mobile-bottombar-bg)" }}
    >
      <div className="workspace-mobile-bottombar-items mx-auto flex w-full max-w-shell items-stretch justify-between px-3 max-sm:px-1.5">
        <Link
          href="/"
          aria-current={isActive("/") ? "page" : undefined}
          className={itemClass(isActive("/"))}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            className={iconClass}
          >
            <path d="M3.5 10.5a2 2 0 0 1 .8-1.6l6.5-4.875a2 2 0 0 1 2.4 0L19.7 8.9a2 2 0 0 1 .8 1.6V18a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18Z" fill="currentColor" />
            <path d="M12 14v4" stroke="var(--color-bg)" />
          </svg>
          <span className={labelClass(isActive("/"))}>
            首页
          </span>
        </Link>
        <Link
          href="/toolbox/video-generation"
          aria-current={isActive("/toolbox/video-generation") ? "page" : undefined}
          className={itemClass(isActive("/toolbox/video-generation"))}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            className={iconClass}
          >
            <path d="m16.5 10 4-3a.5.5 0 0 1 .8.4v9.2a.5.5 0 0 1-.8.4l-4-3" fill="none" />
            <rect x="2.5" y="5.5" width="14" height="13" rx="2.5" fill="none" />
            <rect x="6" y="9" width="6" height="3" rx="1.5" stroke="currentColor" />
          </svg>
          <span className={labelClass(isActive("/toolbox/video-generation"))}>
            AI视频
          </span>
        </Link>
        <Link
          href="/toolbox/image-generation"
          aria-current={isActive("/toolbox/image-generation") ? "page" : undefined}
          className={itemClass(isActive("/toolbox/image-generation"))}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            className={iconClass}
          >
            <rect x="3.5" y="5" width="17" height="14" rx="2.5" fill="none" />
            <circle cx="9" cy="10" r="1.5" stroke="currentColor" />
            <path d="m8 19 6.5-6.5a1.5 1.5 0 0 1 1.8-.25l4.2 2.25" stroke="currentColor" />
          </svg>
          <span className={labelClass(isActive("/toolbox/image-generation"))}>
            AI图片
          </span>
        </Link>
        <Link href="/assets" aria-current={isActive("/assets") ? "page" : undefined} className={itemClass(isActive("/assets"))}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            className={iconClass}
          >
            {ASSETS_ICON}
          </svg>
          <span className={labelClass(isActive("/assets"))}>
            资产
          </span>
        </Link>
        <Link
          href="/account"
          aria-current={isActive("/account") ? "page" : undefined}
          className={cn(
            "header-user-tab-trigger",
            itemClass(isActive("/account")),
            "w-full"
          )}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            className="workspace-nav-icon pointer-events-none h-[1.35rem] w-[1.35rem] shrink-0"
          >
            <circle cx="12" cy="12" r="8.5" fill="none" />
            <circle cx="12" cy="8.5" r="3" stroke="currentColor" />
            <path d="M6.5 18.5c.7-3 2.6-4.5 5.5-4.5s4.8 1.5 5.5 4.5" stroke="currentColor" />
          </svg>
          <span className="max-w-full whitespace-nowrap text-[0.6875rem] font-semibold leading-none">
            我的
          </span>
        </Link>
      </div>
    </nav>
  );
}

/* ================================================================== *
 * 统一外壳：图标轨 + 固定/浮动导航 + 内容 + 底部栏
 * ================================================================== */
export interface WorkspaceShellProps {
  children: React.ReactNode;
  /** 固定导航（技能页 / Agent 页） */
  pinned?: {
    id: string;
    title: string;
    sections: NavSection[];
    variant?: "skills" | "agent";
  };
  /** 浮动导航面板（默认恒为 Agent / AI 视频 / AI 图片 三块） */
  floating?: {
    id: string;
    title: string;
    sections: NavSection[];
    variant?: "skills" | "agent";
  }[];
  className?: string;
  contentClassName?: string;
}

export function WorkspaceShell({
  children,
  pinned,
  floating = FLOATING_NAV,
  className,
  contentClassName,
}: WorkspaceShellProps) {
  const [hoverPanel, setHoverPanel] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  // 原站：<title> 随路由变化（实测各页标题，见 lib/page-titles.ts）
  // React 19 元数据提升：SSR 阶段即输出正确的 <title>
  const pathname = usePathname();
  const pageTitle = titleForPath(pathname);

  const onPanelHover = useCallback((panel: string | null) => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (panel) {
      setHoverPanel(panel);
    } else {
      closeTimer.current = window.setTimeout(() => setHoverPanel(null), 160);
    }
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    []
  );

  return (
    <>
      {pageTitle ? <title>{pageTitle}</title> : null}
      <div
        className={cn(
          "workspace-shell relative flex h-[calc(100vh-var(--global-operation-notice-height))] min-h-0 min-w-0 flex-row bg-subtle max-lg:h-auto max-lg:min-h-[calc(100vh-var(--global-operation-notice-height))] max-lg:bg-transparent",
          className
        )}
      >
        <WorkspaceRail activePanel={hoverPanel} onPanelHover={onPanelHover} />
        <div className="workspace-main-shell relative flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden rounded-l-3xl bg-background shadow-[-2px_0_6px_-3px_rgba(0,0,0,0.1)] max-lg:rounded-none max-lg:bg-transparent max-lg:shadow-none">
          {pinned ? <PinnedNavigation {...pinned} /> : null}
          {floating.map((f) => (
            <FloatingNavigation
              key={f.id}
              id={f.id}
              title={f.title}
              sections={f.sections}
              variant={f.variant}
              open={hoverPanel === f.id}
            />
          ))}
          <main
            className={cn(
              "workspace-main-content flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto max-lg:pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]",
              contentClassName
            )}
          >
            {children}
          </main>
        </div>
      </div>
      <MobileBottombar />
      <GlobalLoginModal />
    </>
  );
}

/* 全局登录弹窗：侧栏「登录」按钮触发 */
function GlobalLoginModal() {
  const open = useLoginModalStore((s) => s.open);
  const hide = useLoginModalStore((s) => s.hide);
  if (!open) return null;
  return <LoginModal onClose={hide} />;
}

/* ================================================================== *
 * 248px 固定导航面板（原站 workspace-pinned-navigation）
 * ================================================================== */
export function PinnedNavigation({
  id,
  title,
  sections,
  variant = "skills",
}: {
  id: string;
  title: string;
  sections: NavSection[];
  variant?: "skills" | "agent";
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <aside
      id={id}
      aria-labelledby={`workspace-pinned-navigation-${id}-title`}
      data-expanded={expanded}
      data-layout-expanded={expanded}
      data-animate-layout="true"
      style={{ width: expanded ? 248 : 0, transitionDuration: "250ms" }}
      className="workspace-pinned-navigation relative z-20 h-full shrink-0 transition-[width] ease-out motion-reduce:transition-none max-lg:hidden"
    >
      <div
        className="workspace-pinned-navigation-surface absolute inset-y-0 left-0 overflow-hidden border-r border-line bg-background transition-[transform,opacity] duration-[180ms] ease-out motion-reduce:transition-none translate-x-0 opacity-100"
        style={{ width: 248 }}
      >
        <div className="workspace-navigation flex h-full min-h-0 w-full flex-col overflow-hidden">
          <header className="workspace-navigation-header relative flex h-[52px] shrink-0 items-center px-1.5">
            <div className="workspace-navigation-header-row flex h-9 w-full items-center justify-between gap-3 pl-2.5">
              <h2
                id={`workspace-pinned-navigation-${id}-title`}
                className="workspace-navigation-title min-w-0 truncate text-[17px] font-medium"
              >
                {title}
              </h2>
              <span className="ui-hover-tooltip-trigger inline-flex items-center justify-center outline-none ">
                <button
                  type="button"
                  aria-label={expanded ? "收起面板" : "展开面板"}
                  onClick={() => setExpanded((v) => !v)}
                  className="workspace-navigation-toggle flex mr-1 h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                    className="workspace-navigation-toggle-icon pointer-events-none workspace-navigation-toggle-icon h-5 w-5 text-muted"
                  >
                    {PIN_ICON}
                  </svg>
                </button>
              </span>
            </div>
            <div
              aria-hidden="true"
              className="workspace-navigation-divider pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[var(--color-line)] transition-opacity duration-200 motion-reduce:transition-none opacity-0"
            />
          </header>
          <div className="workspace-navigation-scroll-area relative min-h-0 flex-1">
            <div
              id={`workspace-pinned-navigation-${id}-scrollview`}
              tabIndex={0}
              aria-label="导航列表"
              className="workspace-navigation-scrollview scrollbar-none h-full overflow-y-auto"
            >
              {variant === "agent" ? (
                <AgentNavigationContent />
              ) : (
                <NavigationContent sections={sections} />
              )}
            </div>
            <NavigationScrollbar
              scrollId={`workspace-pinned-navigation-${id}-scrollview`}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
