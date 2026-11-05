"use client";

import Link from "next/link";
import { useState } from "react";
import { WorkspaceShell } from "@/components/features/WorkspaceShell";
import { useToast } from "@/components/features/ToastHost";

/*
 * 原站 /account（实测 1:1，2026-10-30）
 *
 *  main.workspace-main-content
 *   └─ section.relative.z-[1].mx-auto.w-full.max-w-shell.bg-background.px-4.py-4.sm:px-6.sm:py-5.lg:px-10.lg:py-6.flex.flex-col.gap-6
 *      ├─ header.max-w-3xl.shrink-0
 *      │   └─ h1.text-xl.font-semibold.tracking-tight.text-foreground.sm:text-2xl「我的积分」
 *      └─ div.flex.min-w-0.flex-col.gap-6.pb-8
 *          ├─ div.account-balance-card.min-w-0.rounded-xl.border.bg-surface.p-5.sm:p-6
 *          │   └─ div.flex.flex-col.gap-5.lg:flex-row.lg:items-center.lg:justify-between
 *          │       ├─ div.min-w-0
 *          │       │   ├─ p.text-xs.font-medium.text-muted「可用积分」
 *          │       │   └─ div.mt-1.5.flex.flex-wrap.items-baseline.gap-x-3
 *          │       │       ├─ span.credit-value「—」.text-2xl.font-credit.font-semibold.sm:text-3xl
 *          │       │       └─ span.credit-value「= 订阅积分 0.00 + 充值积分 0.00」.text-xs.font-credit.tabular-nums.text-subtle
 *          │       └─ div.flex.flex-wrap.items-end.gap-x-8.gap-y-4.sm:flex-nowrap.sm:items-center
 *          │           ├─ 订阅积分 / 充值积分 两组
 *          │           └─ div.account-balance-actions  （兑换充值卡 / 订阅 / 充值）
 *          └─ section.account-ledger-section.flex.min-w-0.flex-col.gap-4
 *              ├─ div.account-ledger-header.flex.min-w-0.items-center.justify-between.gap-3
 *              │   ├─ h2.account-ledger-title「积分明细」.text-sm.font-semibold
 *              │   └─ div → a.account-invoice-link「发票管理」
 *              ├─ div.shrink-0.rounded-xl.p-3.sm:p-4   （类型 / 工具 筛选）
 *              └─ div.rounded-xl.border.border-dashed.px-3.py-8.text-center「没有匹配的明细」
 */

const LEDGER_TYPES = [
  "全部",
  "消耗",
  "退款",
  "积分充值",
  "佣金兑换积分",
  "积分失效",
  "充值卡制卡扣款",
  "充值卡兑换入账",
  "充值卡积分归还",
  "退款/撤销扣回",
  "迁出",
];

const LEDGER_TOOLS = [
  "全部工具",
  "对话 Token",
  "智能编导",
  "视频生成",
  "视频片段重拍",
  "图片生成",
  "视频拆条",
  "字幕擦除",
  "画质增强",
  "提示词生成",
];

export default function AccountPage() {
  const { push } = useToast();
  const [selType, setSelType] = useState(0);
  const [selTool, setSelTool] = useState(0);
  return (
    <WorkspaceShell>
      <section className="relative z-[1] mx-auto flex w-full max-w-shell flex-col gap-6 bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6">
        <header className="max-w-3xl shrink-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            我的积分
          </h1>
        </header>

        <div className="flex min-w-0 flex-col gap-6 pb-8">
          {/* —— 余额卡 —— */}
          <div className="account-balance-card min-w-0 rounded-xl border bg-surface p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">可用积分</p>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3">
                  <span className="credit-value text-2xl font-credit font-semibold tracking-tight text-foreground sm:text-3xl">
                    —
                  </span>
                  <span className="credit-value text-xs font-credit tabular-nums text-subtle">
                    = 订阅积分 0.00 + 充值积分 0.00
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-x-8 gap-y-4 sm:flex-nowrap sm:items-center">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted">订阅积分</p>
                  <p className="credit-value mt-1 font-credit text-lg font-semibold tabular-nums text-foreground">
                    0.00
                  </p>
                  <p className="mt-0.5 text-[10px] text-subtle">-</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted">充值积分</p>
                  <p className="credit-value mt-1 font-credit text-lg font-semibold tabular-nums text-foreground">
                    0.00
                  </p>
                  <p className="mt-0.5 text-[10px] text-subtle">-</p>
                </div>
                <div className="account-balance-actions flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => push({ tone: "neutral", title: "请输入兑换码（演示）", description: "前端复刻演示：弹窗/跳转无需后端。" })}
                    className="account-redeem-action inline-flex h-9 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold text-foreground"
                  >
                    兑换充值卡
                  </button>
                  <button
                    type="button"
                    onClick={() => push({ tone: "neutral", title: "订阅 / 充值（演示）", description: "前端复刻演示：收银台跳转无需后端。" })}
                    className="account-recharge-action inline-flex h-9 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    订阅 / 充值
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* —— 明细 —— */}
          <section className="account-ledger-section flex min-w-0 flex-col gap-4">
            <div className="account-ledger-header flex min-w-0 items-center justify-between gap-3">
              <h2 className="account-ledger-title text-sm font-semibold text-foreground">
                积分明细
              </h2>
              <div className="flex shrink-0 items-center gap-4">
                <Link
                  href="/account/invoices"
                  className="account-invoice-link inline-flex h-9 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-deep"
                >
                  <span className="account-invoice-link-label">发票管理</span>
                </Link>
              </div>
            </div>

            <div className="shrink-0 rounded-xl p-3 sm:p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[11px] font-semibold text-muted">类型</span>
                  {LEDGER_TYPES.map((t, i) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelType(i)}
                      aria-pressed={selType === i}
                      className={
                        selType === i
                          ? "rounded-full bg-accent-muted px-3 py-1.5 text-[11px] font-semibold text-accent-deep transition-colors"
                          : "rounded-full px-3 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-foreground"
                      }
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[11px] font-semibold text-muted">工具</span>
                  {LEDGER_TOOLS.map((t, i) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelTool(i)}
                      aria-pressed={selTool === i}
                      className={
                        selTool === i
                          ? "rounded-full bg-accent-muted px-3 py-1.5 text-[11px] font-semibold text-accent-deep transition-colors"
                          : "rounded-full px-3 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-foreground"
                      }
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-dashed px-3 py-8 text-center text-xs text-muted sm:text-sm">
              没有匹配的明细
            </div>
          </section>
        </div>
      </section>
    </WorkspaceShell>
  );
}
