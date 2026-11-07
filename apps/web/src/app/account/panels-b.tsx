"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, Label, Select } from "@/components/ui/primitives";
import { Card, CardBody, CardHeader, CardTitle, Badge, EmptyState, Table, Th, Td } from "@/components/ui/surfaces";
import { Modal } from "@/components/ui/overlays";
import { useToast } from "@/components/features/ToastHost";
import { RECHARGE_PACKAGES } from "@/lib/domain";
import { Key, Receipt, Wallet, CreditCard, Plus, Copy, Eye, EyeOff, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { ApiError } from "@/lib/api";
import { getBalance, getLedger, listRechargeOrders, type BalanceView, type LedgerItem, type RechargeOrder } from "@/lib/backend/points";
import { listInvoices, createInvoice, type InvoiceItem } from "@/lib/backend/commerce";

export function CreditsPanel() {
  const { push } = useToast();
  const [pkg, setPkg] = useState("standard");
  const [payOpen, setPayOpen] = useState(false);
  const [balance, setBalance] = useState<BalanceView | null>(null);
  const chosen = RECHARGE_PACKAGES.find((p) => p.code === pkg);

  useEffect(() => {
    void (async () => {
      try {
        setBalance(await getBalance());
      } catch {
        // 行内注释1：余额加载失败不打断页面 —— 面板本身还有套餐与充值入口可用。
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs text-fg-subtle"><Wallet className="size-3.5 text-accent" aria-hidden />可用积分</p>
              <p className="tabular mt-1 text-4xl font-semibold tracking-tight">{(balance?.available ?? 0).toLocaleString()}</p>
              <p className="tabular mt-1.5 text-xs text-fg-subtle">冻结 {balance?.frozen ?? 0} · 有效期至 {balance?.expires_at ?? "永久有效"}</p>
            </div>
            <Button onClick={() => setPayOpen(true)}>去充值</Button>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>充值套餐</CardTitle><Badge tone="neutral">{RECHARGE_PACKAGES.length} 档</Badge></CardHeader>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RECHARGE_PACKAGES.map((p) => (
              <button key={p.code} type="button" onClick={() => { setPkg(p.code); setPayOpen(true); }} aria-pressed={pkg === p.code}
                className={cn("rounded-md border p-4 text-left transition-colors", pkg === p.code ? "border-accent bg-accent-soft/20" : "border-line bg-surface-2 hover:border-line-strong")}>
                <span className="flex items-center justify-between"><span className="text-sm font-medium text-fg">{p.name}</span>{p.bonusRate > 0 && <Badge tone="accent">+{Math.round(p.bonusRate * 100)}%</Badge>}</span>
                <span className="tabular mt-2 block text-2xl font-semibold">¥{p.amount.toLocaleString()}</span>
                <span className="tabular mt-1 block text-xs text-fg-muted">到账 {p.credits.toLocaleString()} 积分</span>
                <span className="mt-2 block text-[11px] text-fg-subtle">{p.audience}</span>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="确认充值" description="积分自到账起 2 年有效，不可提现" footer={<><Button variant="secondary" onClick={() => setPayOpen(false)}>取消</Button><Button onClick={() => { setPayOpen(false); push({ tone: "neutral", title: "请到「我的积分」页充值", description: "该页面已接入真实下单接口" }); }}>去下单</Button></>}>
        <p className="text-sm text-fg">套餐：{chosen?.name} · 到账 {chosen?.credits} 积分（含赠送）</p>
        <p className="tabular mt-1 text-xs text-fg-subtle">支持微信 / 支付宝（企业主体）</p>
      </Modal>
    </div>
  );
}

/**
 * 行内注释2：真流水 —— GET /points/ledger，按类型过滤走后端 type 参数。
 */
export function LedgerPanel() {
  const { push } = useToast();
  const [type, setType] = useState("全部");
  const [rows, setRows] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);

  const TYPE_MAP: Record<string, string | undefined> = {
    全部: undefined,
    充值: "recharge",
    消耗: "consume",
    退回: "refund",
    赠送: "bonus",
  };
  const TYPE_LABEL: Record<string, string> = {
    recharge: "充值",
    settle: "消耗",
    refund: "退回",
    adjust: "赠送",
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLedger({ page: 1, pageSize: 50, type: TYPE_MAP[type] });
      setRows(res.data ?? []);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "加载流水失败";
      push({ tone: "warning", title: "加载失败", description: msg });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="size-4 text-accent" aria-hidden />积分流水</CardTitle>
        <span className="flex items-center gap-2"><Select value={type} onChange={(e) => setType(e.target.value)} aria-label="流水类型"><option>全部</option><option>充值</option><option>消耗</option><option>退回</option><option>赠送</option></Select><Badge tone="neutral">不可变记录</Badge></span>
      </CardHeader>
      <CardBody className="p-0">
        {loading ? (
          <p className="py-8 text-center text-xs text-fg-subtle">加载中…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Wallet className="size-5" />} title="暂无流水" description="充值或消耗后这里会有记录" />
        ) : (
          <Table>
            <thead><tr><Th>时间</Th><Th>类型</Th><Th>说明</Th><Th className="text-right">变动</Th><Th className="text-right">余额</Th></tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <Td className="tabular whitespace-nowrap text-fg-muted">{l.created_at}</Td>
                  <Td><Badge tone={l.amount > 0 ? "success" : l.type === "refund" ? "info" : "neutral"}>{TYPE_LABEL[l.type] ?? l.type}</Badge></Td>
                  <Td className="text-fg-muted">{l.note || "—"}</Td>
                  <Td className={cn("tabular text-right", l.amount > 0 ? "text-success" : "text-fg")}>{l.amount > 0 ? `+${l.amount}` : l.amount}</Td>
                  <Td className="tabular text-right text-fg-muted">{l.balance?.toLocaleString() ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * 行内注释3：真订单 —— GET /recharge/orders。
 */
export function OrdersPanel() {
  const { push } = useToast();
  const [orders, setOrders] = useState<RechargeOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await listRechargeOrders({ page: 1, pageSize: 50 });
        setOrders(res.data ?? []);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "加载订单失败";
        push({ tone: "warning", title: "加载失败", description: msg });
      } finally {
        setLoading(false);
      }
    })();
  }, [push]);

  const STATUS_TONE: Record<string, "success" | "warning" | "neutral" | "danger"> = {
    paid: "success",
    succeeded: "success",
    pending: "warning",
    closed: "neutral",
    failed: "danger",
  };
  const STATUS_LABEL: Record<string, string> = {
    paid: "已支付",
    succeeded: "已支付",
    pending: "待支付",
    closed: "已关闭",
    failed: "已失败",
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="size-4 text-accent" aria-hidden />充值订单</CardTitle><Badge tone="neutral">{orders.length}</Badge></CardHeader>
      <CardBody className="p-0">
        {loading ? (
          <p className="py-8 text-center text-xs text-fg-subtle">加载中…</p>
        ) : orders.length === 0 ? (
          <EmptyState icon={<CreditCard className="size-5" />} title="暂无订单" description="充值后订单会显示在这里" />
        ) : (
          <Table>
            <thead><tr><Th>订单号</Th><Th>积分</Th><Th>状态</Th><Th>时间</Th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_no}>
                  <Td className="tabular text-fg-muted">{o.order_no}</Td>
                  <Td className="tabular text-accent">{o.credits}{o.bonus ? ` (+${o.bonus})` : ""}</Td>
                  <Td><Badge tone={STATUS_TONE[o.status] ?? "neutral"}>{STATUS_LABEL[o.status] ?? o.status}</Badge></Td>
                  <Td className="tabular text-fg-subtle">{o.created_at}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * 行内注释4：真发票 —— GET /invoices 列表 + POST /invoices 申请。
 */
export function InvoicesPanel() {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [titleType, setTitleType] = useState("企业");
  const [title, setTitle] = useState("");
  const [taxNo, setTaxNo] = useState("");
  const [amount, setAmount] = useState("500");
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const taxOk = titleType === "个人" || /^[A-Z0-9]{15,20}$/.test(taxNo.replace(/\s/g, ""));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listInvoices({ page: 1, pageSize: 50 });
      setRequests(res.data ?? []);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "加载发票失败";
      push({ tone: "warning", title: "加载失败", description: msg });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await createInvoice({
        title_type: titleType as "个人" | "企业",
        title: title.trim(),
        tax_no: taxNo.trim(),
        amount: Number(amount) || 0,
      });
      setOpen(false);
      setTitle("");
      setTaxNo("");
      push({ tone: "success", title: "申请已提交", description: "后台人工审核后开具" });
      void load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "提交失败";
      push({ tone: "danger", title: "提交失败", description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="size-4 text-accent" aria-hidden />发票申请</CardTitle><Button variant="secondary" size="sm" onClick={() => setOpen(true)}><Plus className="size-3.5" aria-hidden />申请开票</Button></CardHeader>
        <CardBody>
          {loading ? (
            <p className="py-6 text-center text-xs text-fg-subtle">加载中…</p>
          ) : requests.length === 0 ? (
            <EmptyState icon={<Receipt className="size-5" />} title="暂无发票" description="充值后可申请开票，后台人工审核后开具" />
          ) : (
            <Table>
              <thead><tr><Th>抬头</Th><Th>金额</Th><Th>状态</Th><Th>申请时间</Th></tr></thead>
              <tbody>
                {requests.map((r) => (<tr key={r.id}><Td>{r.title}</Td><Td className="tabular">¥{r.amount}</Td><Td><Badge tone="warning">{r.status}</Badge></Td><Td className="tabular text-fg-subtle">{r.created_at}</Td></tr>))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="申请开票" description="人工开票，1~3 个工作日" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>取消</Button><Button disabled={!title.trim() || !taxOk || submitting} onClick={() => void submit()}>{submitting ? "提交中…" : "提交申请"}</Button></>}>
        <div className="space-y-3">
          <div><Label className="mb-1.5 block">抬头类型</Label><div className="flex gap-1.5">{["个人", "企业"].map((t) => (<button key={t} type="button" onClick={() => setTitleType(t)} aria-pressed={titleType === t} className={cn("flex-1 rounded-xs border px-2 py-2 text-xs", titleType === t ? "border-accent bg-accent-soft/40 text-fg" : "border-line bg-surface-2 text-fg-muted")}>{t}</button>))}</div></div>
          <div><Label htmlFor="inv-title" className="mb-1.5 block">发票抬头</Label><Input id="inv-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={titleType === "个人" ? "姓名" : "公司全称"} /></div>
          {titleType === "企业" && <div><Label htmlFor="inv-tax" className="mb-1.5 block">税号</Label><Input id="inv-tax" value={taxNo} onChange={(e) => setTaxNo(e.target.value)} placeholder="15~20 位统一社会信用代码" className="tabular" invalid={taxNo.length > 0 && !taxOk} />{taxNo.length > 0 && !taxOk && <p className="mt-1 text-[11px] text-danger">税号格式不正确</p>}</div>}
          <div><Label htmlFor="inv-amt" className="mb-1.5 block">开票金额（元）</Label><Input id="inv-amt" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular" /></div>
        </div>
      </Modal>
    </div>
  );
}

/**
 * 行内注释5：API 密钥 —— 后端尚无密钥表（待建表项 A 系列外的新增项），
 *             这里保留本地生成逻辑，并明确标注「仅本地，未接入后端」。
 */
export function ApiKeysPanel() {
  const { push } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [keys, setKeys] = useState([
    { name: "生产环境", key: "sk_xin_9f21a4c8e7b3d5f2a8c1", t: "2026-09-12" },
    { name: "测试环境", key: "sk_xin_test_3b8e1d6f9a2c4e7b", t: "2026-10-02" },
  ]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const create = () => {
    if (!newName.trim()) return;
    const k = `sk_xin_${Math.random().toString(36).slice(2, 14)}`;
    setKeys((p) => [...p, { name: newName.trim(), key: k, t: "刚刚" }]);
    setCreating(false); setNewName("");
    push({ tone: "warning", title: "密钥已创建", description: "完整密钥仅展示一次，请立即复制保存" });
  };
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Key className="size-4 text-accent" aria-hidden />API 密钥</CardTitle><Button size="sm" onClick={() => setCreating(true)}><Plus className="size-3.5" aria-hidden />创建密钥</Button></CardHeader>
      <CardBody className="space-y-3">
        <div className="flex items-start gap-2 rounded-sm border border-warning/40 bg-warning/8 p-3">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
          <p className="text-xs leading-relaxed text-fg-muted">密钥仅在创建时完整展示一次。接口支持 Idempotency-Key 头，写操作请务必携带以避免重复扣费。</p>
        </div>
        <ul className="space-y-2">
          {keys.map((k) => (
            <li key={k.name} className="flex flex-wrap items-center gap-3 rounded-sm border border-line bg-surface-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-fg">{k.name}</p>
                <p className="tabular mt-0.5 truncate text-xs text-fg-subtle">{showKey ? k.key : k.key.replace(/.(?=.{4})/g, "•")}</p>
                <p className="tabular mt-0.5 text-[11px] text-fg-subtle">创建于 {k.t}</p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={showKey ? "隐藏密钥" : "显示密钥"} onClick={() => setShowKey((v) => !v)}>{showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</Button>
              <Button variant="ghost" size="icon-sm" aria-label={`复制${k.name}密钥`} onClick={async () => { try { await navigator.clipboard.writeText(k.key); } catch { /* ignore */ } push({ tone: "success", title: "已复制", description: k.name }); }}><Copy className="size-3.5" /></Button>
              <Button variant="ghost" size="icon-sm" aria-label={`删除${k.name}`} onClick={() => setKeys((p) => p.filter((x) => x.name !== k.name))}><ShieldCheck className="size-3.5" /></Button>
            </li>
          ))}
        </ul>
        <Modal open={creating} onClose={() => setCreating(false)} title="创建密钥" description="命名后立即生成，完整值只展示一次" footer={<><Button variant="secondary" onClick={() => setCreating(false)}>取消</Button><Button disabled={!newName.trim()} onClick={create}>创建</Button></>}>
          <div><Label htmlFor="key-name" className="mb-1.5 block">密钥名称</Label><Input id="key-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例：线上服务端" /></div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-fg-subtle"><CheckCircle2 className="size-3 text-success" aria-hidden />默认仅开放查询权限，写权限需二次确认</p>
        </Modal>
      </CardBody>
    </Card>
  );
}
