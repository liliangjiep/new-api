"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/layout/TopNav";
import { Button, Input, Label, Select } from "@/components/ui/primitives";
import { Card, CardBody, CardHeader, CardTitle, Badge, Table, Th, Td } from "@/components/ui/surfaces";
import { Modal } from "@/components/ui/overlays";
import { useToast } from "@/components/features/ToastHost";
import { PRICING_TABLE, RECHARGE_PACKAGES } from "@/lib/domain";
import { ArrowRight, Calculator, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

// M1-28b 定价页：售价表 + 测算器 + 充值套餐 + FAQ
// 行内注释1：公开页，口径与工具页 QuotePanel 共用 PRICING_TABLE
// 行内注释2：测算器 = 选计费项 × 数量 × 模型折扣（mock 0.75 快档），实时算合计
// TODO(API): 接入 GET /model-routes/public 与 GET /recharge/packages
const FAQS = [
  { q: "积分和人民币怎么换算？", a: "1 积分锚定 ¥1。充值套餐含赠送，赠送部分同样 2 年有效，不可提现/转赠。" },
  { q: "生成失败扣费吗？", a: "不扣。提交前返回报价快照并冻结，成功才结算，失败/超时全额退回，流水里记一笔“退回”。" },
  { q: "报价有效期多久？", a: "报价指纹 15 分钟内有效，改参数需重新报价，防止前后台口径不一致。" },
  { q: "可以开发票吗？", a: "可以。充值后在账户中心申请开票，人工审核 1~3 个工作日开具（P1 暂不支持自动开票）。" },
  { q: "批量任务怎么计费？", a: "按条/按张累加，批次内单条失败只退那一条，其余正常结算，可在任务中心单独重试失败条。" },
];

export default function PricingPage() {
  const { push } = useToast();
  // 行内注释3：测算器状态
  const [itemIdx, setItemIdx] = useState(3);
  const [qty, setQty] = useState(1);
  const [fast, setFast] = useState(false);
  const item = PRICING_TABLE[itemIdx];
  const estimate = useMemo(() => Math.round(item.points * qty * (fast ? 0.75 : 1)), [item, qty, fast]);

  // 行内注释4：充值套餐选择 + 确认弹窗（mock 下单）
  const [pkg, setPkg] = useState("standard");
  const [payOpen, setPayOpen] = useState(false);
  const chosen = RECHARGE_PACKAGES.find((p) => p.code === pkg);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return PRICING_TABLE;
    return PRICING_TABLE.filter((p) => `${p.capability}${p.label}${p.spec}${p.model}`.toLowerCase().includes(s));
  }, [q]);

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <Badge tone="accent" className="mb-4">明码标价 · 生成前先报价</Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">积分定价</h1>
          <p className="mt-3 text-[15px] text-fg-muted">1 积分锚定 ¥1。提交前返回报价快照，失败全额退回，不成功不扣费。</p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader><CardTitle>售价积分表（共 {PRICING_TABLE.length} 项）</CardTitle><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索能力 / 规格 / 模型" aria-label="搜索计费项" className="max-w-56" /></CardHeader>
            <CardBody className="p-0">
              <Table>
                <thead><tr><Th>能力域</Th><Th>计费项</Th><Th>规格</Th><Th>售价积分</Th><Th>主用模型</Th></tr></thead>
                <tbody>
                  {rows.map((p, i) => (
                    <tr key={`${p.label}-${p.spec}-${i}`}>
                      <Td className="whitespace-nowrap text-fg-muted">{p.capability}</Td>
                      <Td>{p.label}</Td>
                      <Td className="tabular whitespace-nowrap text-fg-muted">{p.spec}</Td>
                      <Td className="tabular text-accent">{p.points}</Td>
                      <Td className="text-fg-subtle">{p.model}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {rows.length === 0 && <p className="p-6 text-center text-sm text-fg-muted">没有匹配的计费项</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="size-4 text-accent" aria-hidden />费用测算</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              <div><Label htmlFor="calc-item" className="mb-1.5 block">计费项</Label>
                <Select id="calc-item" value={String(itemIdx)} onChange={(e) => setItemIdx(Number(e.target.value))}>
                  {PRICING_TABLE.map((p, i) => <option key={i} value={i}>{p.label} · {p.spec} · {p.points}分</option>)}
                </Select></div>
              <div><Label htmlFor="calc-qty" className="mb-1.5 block">数量（条/张）</Label>
                <Input id="calc-qty" type="number" min={1} max={100} value={qty} onChange={(e) => setQty(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} className="tabular" /></div>
              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-sm border border-line bg-surface-2 px-3 py-2.5 text-sm">
                <span>使用快档模型（约 7.5 折）</span>
                <button type="button" role="switch" aria-checked={fast} aria-label="快档折扣" onClick={() => setFast((v) => !v)} className={cn("relative h-5 w-9 rounded-full transition-colors", fast ? "bg-accent" : "bg-surface-3")}><span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-all", fast ? "left-4.5" : "left-0.5")} /></button>
              </label>
              <div className="rounded-sm border border-line bg-surface-2 p-3">
                <p className="text-xs text-fg-subtle">预计消耗</p>
                <p className="tabular mt-1 text-3xl font-semibold text-accent">{estimate}<span className="ml-1 text-xs font-normal text-fg-subtle">积分 ≈ ¥{estimate}</span></p>
                <p className="tabular mt-1 text-[11px] text-fg-subtle">{item.label} × {qty}{fast ? " · 快档 7.5 折" : ""}</p>
              </div>
              <Link href="/toolbox"><Button className="w-full">去工具箱生成<ArrowRight className="size-3.5" aria-hidden /></Button></Link>
            </CardBody>
          </Card>
        </div>

        <h2 className="mb-4 mt-12 text-xl font-semibold tracking-tight">充值套餐</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RECHARGE_PACKAGES.map((p) => (
            <Card key={p.code} className={cn(pkg === p.code && "border-accent")}>
              <CardBody>
                <div className="flex items-center justify-between"><p className="text-sm font-medium">{p.name}</p>{p.bonusRate > 0 && <Badge tone="accent">+{Math.round(p.bonusRate * 100)}%</Badge>}</div>
                <p className="tabular mt-2 text-3xl font-semibold">¥{p.amount.toLocaleString()}</p>
                <p className="tabular mt-1 text-xs text-fg-muted">到账 {p.credits.toLocaleString()} 积分</p>
                <p className="mt-1 text-[11px] text-fg-subtle">{p.audience}</p>
                <Button size="sm" className="mt-4 w-full" variant={pkg === p.code ? "primary" : "secondary"} onClick={() => { setPkg(p.code); setPayOpen(true); }}>选择{p.name}</Button>
              </CardBody>
            </Card>
          ))}
        </div>

        <h2 className="mb-4 mt-12 text-xl font-semibold tracking-tight">常见问题</h2>
        <div className="space-y-2">
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <Card key={f.q}>
                <button type="button" onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                  <span className="text-sm text-fg">{f.q}</span>
                  <ChevronDown className={cn("size-4 shrink-0 text-fg-subtle transition-transform", open && "rotate-180")} aria-hidden />
                </button>
                {open && <div className="border-t border-line px-4 py-3"><p className="text-sm leading-relaxed text-fg-muted">{f.a}</p></div>}
              </Card>
            );
          })}
        </div>
      </main>
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="确认充值" description="积分 2 年有效，不可提现" footer={<><Button variant="secondary" onClick={() => setPayOpen(false)}>取消</Button><Button onClick={() => { setPayOpen(false); push({ tone: "success", title: "充值成功", description: `${chosen?.name}已到账 ${chosen?.credits}积分` }); }}>确认支付 ¥{chosen?.amount}</Button></>}>
        <p className="text-sm text-fg">套餐：{chosen?.name} · 到账 {chosen?.credits} 积分</p>
        <p className="tabular mt-1 text-xs text-fg-subtle">订单号 ord_{Date.now().toString().slice(-8)}</p>
      </Modal>
    </div>
  );
}
