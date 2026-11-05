"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Coins, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { Button } from "@/components/ui/primitives";
import { PUBLIC_ROUTES } from "@/lib/domain";

export function TopNav({ variant = "public" }: { variant?: "public" | "studio" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span
            className="flex size-7 items-center justify-center rounded-xs bg-accent text-[13px] font-bold text-accent-fg"
            aria-hidden
          >
            x
          </span>
          <span className="text-[15px] font-semibold tracking-tight">new-ai</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
          {PUBLIC_ROUTES.map((r) => {
            const active = pathname === r.href;
            return (
              <Link
                key={r.href}
                href={r.href}
                className={cn(
                  "rounded-xs px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "text-fg"
                    : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                )}
              >
                {r.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/account"
            className="hidden items-center gap-1.5 rounded-xs border border-line px-2.5 py-1.5 text-sm text-fg-muted transition-colors hover:border-line-strong hover:text-fg sm:flex"
          >
            <Coins className="size-3.5 text-accent" aria-hidden />
            <span className="tabular">2,480</span>
          </Link>

          <ThemeSwitcher />

          {variant === "public" ? (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  登录
                </Button>
              </Link>
              <Link href="/register" className="hidden sm:block">
                <Button size="sm">
                  <Plus className="size-3.5" aria-hidden />
                  开始创作
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/workbench">
              <Button size="sm">进入工作台</Button>
            </Link>
          )}

          <button
            type="button"
            aria-label={open ? "关闭菜单" : "打开菜单"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex size-8 items-center justify-center rounded-xs text-fg-muted hover:bg-surface-2 hover:text-fg md:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="border-t border-line bg-surface px-4 py-2 md:hidden"
          aria-label="移动端导航"
        >
          {PUBLIC_ROUTES.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              onClick={() => setOpen(false)}
              className="block rounded-xs px-2 py-2 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
            >
              {r.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
