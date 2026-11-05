"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { STUDIO_ROUTES, ADMIN_SECTIONS } from "@/lib/domain";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { Button } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/surfaces";
import {
  LayoutDashboard,
  Wrench,
  Images,
  Network,
  MessagesSquare,
  ListChecks,
  Wallet,
  ShieldCheck,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  PanelLeft,
  X,
} from "lucide-react";

const STUDIO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/workbench": LayoutDashboard,
  "/toolbox": Wrench,
  "/assets": Images,
  "/canvas": Network,
  "/agent-chat": MessagesSquare,
  "/tasks": ListChecks,
  "/account": Wallet,
};

/**
 * 可收起侧边栏：展开 224px / 收起 64px 图标模式。
 * collapsed 状态只影响桌面端；移动端走 Drawer。
 */
export function StudioShell({
  children,
  title,
  description,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* 桌面侧栏：可收起 */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-56"
        )}
        aria-label="工作台侧边栏"
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-line px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="new-ai 首页">
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-xs bg-accent text-[13px] font-bold text-accent-fg"
              aria-hidden
            >
              x
            </span>
            {!collapsed && (
              <span className="truncate text-[15px] font-semibold tracking-tight">new-ai</span>
            )}
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="收起侧边栏"
              title="收起侧边栏"
              className="ml-auto flex size-7 items-center justify-center rounded-xs text-fg-subtle hover:bg-surface-2 hover:text-fg"
            >
              <ChevronsLeft className="size-4" />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="工作台导航">
          {STUDIO_ROUTES.map((r) => {
            const Icon = STUDIO_ICONS[r.href] ?? Wrench;
            const active = pathname === r.href || pathname.startsWith(`${r.href}/`);
            return (
              <Link
                key={r.href}
                href={r.href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? r.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xs px-2.5 py-2 text-sm transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-surface-3 text-fg"
                    : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && r.label}
              </Link>
            );
          })}

          {!collapsed && (
            <div className="px-2.5 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
              运营后台
            </div>
          )}
          <Link
            href="/admin"
            title={collapsed ? "后台总览" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-xs px-2.5 py-2 text-sm transition-colors",
              collapsed && "justify-center px-0",
              pathname.startsWith("/admin")
                ? "bg-surface-3 text-fg"
                : "text-fg-muted hover:bg-surface-2 hover:text-fg"
            )}
          >
            <ShieldCheck className="size-4 shrink-0" />
            {!collapsed && (
              <>
                后台总览
                <ChevronRight className="ml-auto size-3.5 opacity-60" />
              </>
            )}
          </Link>
        </nav>

        {collapsed ? (
          <div className="flex flex-col items-center gap-1 border-t border-line p-2">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="展开侧边栏"
              title="展开侧边栏"
              className="flex size-8 items-center justify-center rounded-xs text-fg-subtle hover:bg-surface-2 hover:text-fg"
            >
              <ChevronsRight className="size-4" />
            </button>
            <ThemeSwitcher />
          </div>
        ) : (
          <div className="border-t border-line p-2">
            <div className="flex items-center justify-between px-1.5 py-1.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-fg">张工</p>
                <p className="text-[11px] text-fg-subtle">专业版 · 2,480 积分</p>
              </div>
              <ThemeSwitcher />
            </div>
          </div>
        )}
      </aside>

      {/* 移动端抽屉 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="工作台导航">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-surface">
            <div className="flex h-14 items-center gap-2.5 border-b border-line px-4">
              <span
                className="flex size-7 items-center justify-center rounded-xs bg-accent text-[13px] font-bold text-accent-fg"
                aria-hidden
              >
                x
              </span>
              <span className="text-[15px] font-semibold tracking-tight">new-ai</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="关闭导航"
                className="ml-auto flex size-7 items-center justify-center rounded-xs text-fg-subtle hover:bg-surface-2 hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
              {STUDIO_ROUTES.map((r) => {
                const Icon = STUDIO_ICONS[r.href] ?? Wrench;
                const active = pathname === r.href || pathname.startsWith(`${r.href}/`);
                return (
                  <Link
                    key={r.href}
                    href={r.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xs px-2.5 py-2 text-sm",
                      active ? "bg-surface-3 text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {r.label}
                  </Link>
                );
              })}
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 rounded-xs px-2.5 py-2 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
              >
                <ShieldCheck className="size-4 shrink-0" />
                后台总览
              </Link>
            </nav>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="打开导航"
            className="flex size-8 items-center justify-center rounded-xs text-fg-muted hover:bg-surface-2 hover:text-fg lg:hidden"
          >
            <PanelLeft className="size-4" />
          </button>
          {/* 桌面端：在顶栏也可以一键展开/收起，呼应“左边工具栏可以点出来” */}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
            title={collapsed ? "展开侧边栏" : "收起侧边栏"}
            className="hidden size-8 items-center justify-center rounded-xs text-fg-muted hover:bg-surface-2 hover:text-fg lg:flex"
          >
            <PanelLeft className="size-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-fg">
              {title}
            </h1>
            {description && (
              <p className="truncate text-xs text-fg-subtle">{description}</p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {actions}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function AdminShell({
  children,
  title,
  description,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const groups = ADMIN_SECTIONS.reduce<Record<string, typeof ADMIN_SECTIONS>>(
    (acc, s) => {
      (acc[s.group] ??= []).push(s);
      return acc;
    },
    {}
  );

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-60"
        )}
        aria-label="后台侧边栏"
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-line px-4">
          <Link href="/workbench" className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-xs bg-danger/90 text-[13px] font-bold text-white"
              aria-hidden
            >
              x
            </span>
            {!collapsed && (
              <span className="truncate text-[15px] font-semibold tracking-tight">运营后台</span>
            )}
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="收起侧边栏"
              className="ml-auto flex size-7 items-center justify-center rounded-xs text-fg-subtle hover:bg-surface-2 hover:text-fg"
            >
              <ChevronsLeft className="size-4" />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3" aria-label="后台导航">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              {!collapsed && (
                <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                  {group}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((s) => {
                  const href = `/admin/${s.key}`;
                  const active = pathname === href;
                  return (
                    <li key={s.key}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? s.label : undefined}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-xs px-2 py-1.5 text-sm transition-colors",
                          collapsed && "justify-center",
                          active
                            ? "bg-surface-3 text-fg"
                            : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                        )}
                      >
                        <span className="truncate">{collapsed ? s.label.slice(0, 1) : s.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="展开侧边栏"
              className="flex size-8 w-full items-center justify-center rounded-xs text-fg-subtle hover:bg-surface-2 hover:text-fg"
            >
              <ChevronsRight className="size-4" />
            </button>
          ) : (
            <Link href="/workbench">
              <Button variant="secondary" size="sm" className="w-full">
                返回工作台
              </Button>
            </Link>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
            className="hidden size-8 items-center justify-center rounded-xs text-fg-muted hover:bg-surface-2 hover:text-fg lg:flex"
          >
            <PanelLeft className="size-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-fg">
              {title}
            </h1>
            {description && (
              <p className="truncate text-xs text-fg-subtle">{description}</p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {actions}
            <Badge tone="danger">管理员</Badge>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
