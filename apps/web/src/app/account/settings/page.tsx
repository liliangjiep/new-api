"use client";

/**
 * 账号设置 —— 把已实现的各个面板接到真实路由上。
 * 行内注释1：为什么要有这个页 ——
 *             ProfilePanel / SecurityPanel / CreditsPanel / LedgerPanel / OrdersPanel
 *             此前都写好了（且后端接口都通），但没有任何路由入口，
 *             导致 GET /users/me、GET /auth/sessions、POST /users/me/password、
 *             POST /auth/password/login、GET /points/ledger 等接口在 UI 上完全触达不到。
 * 行内注释2：分 Tab 而非独立路由 —— 与原站「我的积分 / 发票管理」的设置页形态一致，
 *             避免为每个面板再造一条 URL（后端契约不变）。
 */

import Link from "next/link";
import { useState } from "react";
import { WorkspaceShell } from "@/components/features/WorkspaceShell";
import { cn } from "@/lib/cn";
import { ProfilePanel, SecurityPanel, CreditsPanel } from "../panels-a";
import { LedgerPanel, OrdersPanel } from "../panels-b";

const TABS = [
  { key: "profile", label: "基本资料", desc: "昵称 / 邮箱 / 公司 / 头像" },
  { key: "security", label: "登录安全", desc: "密码 / 二次验证 / 登录设备" },
  { key: "credits", label: "积分充值", desc: "余额 / 套餐 / 下单" },
  { key: "ledger", label: "积分流水", desc: "充值 / 消耗 / 退回明细" },
  { key: "orders", label: "充值订单", desc: "历史订单与状态" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AccountSettingsPage() {
  const [tab, setTab] = useState<TabKey>("profile");

  return (
    <WorkspaceShell>
      <section className="mx-auto flex w-full max-w-shell flex-col gap-6 bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6">
        <header className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-base font-semibold sm:text-lg">账号设置</h1>
            <p className="mt-1 text-xs text-muted">
              <Link href="/account" className="underline underline-offset-2">我的积分</Link>
              {" / "}
              <Link href="/account/invoices" className="underline underline-offset-2">发票管理</Link>
              {" / 账号设置"}
            </p>
          </div>
        </header>

        {/* —— Tab 条 —— */}
        <nav aria-label="账号设置分组" className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                tab === t.key
                  ? "bg-accent-muted text-accent-deep"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {tab === "profile" && <ProfilePanel />}
          {tab === "security" && <SecurityPanel />}
          {tab === "credits" && <CreditsPanel />}
          {tab === "ledger" && <LedgerPanel />}
          {tab === "orders" && <OrdersPanel />}
        </div>
      </section>
    </WorkspaceShell>
  );
}
