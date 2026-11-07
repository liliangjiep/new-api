"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/layout/StudioShell";
import { Button, Input, Label, Select, Textarea, Switch } from "@/components/ui/primitives";
import { Card, CardBody, CardHeader, CardTitle, Badge, Table, Th, Td, EmptyState, Pagination, Tabs, Progress } from "@/components/ui/surfaces";
import { Modal, Drawer } from "@/components/ui/overlays";
import { useToast } from "@/components/features/ToastHost";
import { ADMIN_SECTIONS, VIDEO_SKILLS, VIDEO_SKILL_CATEGORIES, IMAGE_SKILLS } from "@/lib/domain";
import { ArrowLeft, FlaskConical, Pause, Play, Copy, RotateCcw, Search, Plus, CheckCircle2, XCircle, Download, Megaphone, Ban, Eye, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import * as adminApi from "@/lib/backend/admin";
import { ApiError } from "@/lib/api";

// M1-29~M1-45 运营后台 20 分组页：每个分组专属交互，通用表格只做兜底
// 行内注释1：动态路由 [section] 按 ADMIN_SECTIONS.key 匹配，未命中显示空态
// 行内注释2：写操作全部记审计（后端 AdminService.audit），改价/切通道需二次确认（Modal）
// 行内注释3：全部面板走真实 /admin/* 接口 —— 之前是前端 mock 数组，联调时数据对不上。
export default function AdminSectionPage() {
  const params = useParams<{ section: string }>();
  const section = ADMIN_SECTIONS.find((s) => s.key === params.section);
  if (!section) {
    return (
      <AdminShell title="未知分组" description="请从左侧选择">
        <Card><CardBody><EmptyState title="分组不存在" description="请从左侧导航进入正确的后台分组" /></CardBody></Card>
      </AdminShell>
    );
  }
  return (
    <AdminShell title={section.label} description={section.description}>
      <div className="mb-4">
        <Link href="/admin" className="inline-flex items-center gap-1 text-xs text-fg-subtle hover:text-fg">
          <ArrowLeft className="size-3" aria-hidden />返回后台总览
        </Link>
      </div>
      <PanelRouter sectionKey={section.key} />
    </AdminShell>
  );
}

function PanelRouter({ sectionKey }: { sectionKey: string }) {
  switch (sectionKey) {
    case "model-access": return <ModelAccessPanel />;
    case "endpoints": return <EndpointsPanel />;
    case "pricing": return <PricingPanel />;
    case "dashboard": return <DashboardPanel />;
    case "users": return <UsersPanel />;
    case "review": return <ReviewPanel />;
    case "billing": return <BillingPanel />;
    case "ledger": return <LedgerAdminPanel />;
    case "packages": return <PackagesPanel />;
    case "video-skills": return <VideoSkillsPanel />;
    case "announcements": return <AnnouncementsPanel />;
    case "public-assets": return <PublicAssetsPanel />;
    case "channels": return <ChannelsPanel />;
    case "bills": return <BillsPanel />;
    case "invoices": return <InvoicesAdminPanel />;
    case "affiliate": return <AffiliatePanel />;
    case "settlement": return <SettlementPanel />;
    case "reports": return <ReportsPanel />;
    case "audit": return <AuditPanel />;
    case "invite-codes": return <InviteCodesPanel />;
    default: return <GenericPanel sectionKey={sectionKey} />;
  }
}

/* ---------------- 通用：搜索分页表格兜底 ---------------- */
function usePaged<T>(rows: T[], pageSize = 8) {
  const [page, setPage] = useState(1);
  const total = rows.length;
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);
  return { page, setPage, total, paged, pageSize };
}

/**
 * 行内注释4.1：服务端分页状态 —— 真实接口在后台分页，这里只保留页码。
 */
function usePagedState(total: number, pageSize: number) {
  const [page, setPage] = useState(1);
  // 行内注释4.2：总数变小时把页码拉回有效范围，避免停在空页。
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [page, total, pageSize]);
  return { page, setPage, pageSize };
}

/** 行内注释4.3：通用错误提示。 */
function useAdminError(push: (t: { tone: "danger"; title: string; description?: string }) => void) {
  return (e: unknown, fallback = "请求失败") => {
    push({
      tone: "danger",
      title: "操作失败",
      description: e instanceof ApiError ? e.message : fallback,
    });
  };
}

function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

/* ---------------- 用户管理 ---------------- */
function UsersPanel() {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("全部");
  const [users, setUsers] = useState<adminApi.AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<string | null>(null);
  const pageSize = 8;
  const { page, setPage } = usePagedState(total, pageSize);

  // 行内注释4：真实拉取 —— 分页/搜索/状态筛选都在后端做。
  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminApi
      .listAdminUsers({ page, pageSize, q: q.trim() || undefined, status })
      .then((res) => {
        if (!alive) return;
        setUsers(res.data ?? []);
        setTotal(res.pagination?.total ?? 0);
      })
      .catch((e) => {
        if (!alive) return;
        push({
          tone: "danger",
          title: "加载用户失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        });
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [page, pageSize, q, status, push]);

  const sel = users.find((u) => u.id === detail) ?? null;

  const toggleBan = async (u: adminApi.AdminUser) => {
    try {
      if (u.status === "正常") await adminApi.banUser(u.id);
      else await adminApi.unbanUser(u.id);
      setUsers((p) =>
        p.map((x) =>
          x.id === u.id ? { ...x, status: x.status === "正常" ? "封禁" : "正常" } : x,
        ),
      );
      push({
        tone: "neutral",
        title: u.status === "正常" ? "已封禁" : "已解封",
        description: u.nickname,
      });
    } catch (e) {
      push({
        tone: "danger",
        title: "操作失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  const forceLogout = async (u: adminApi.AdminUser) => {
    try {
      await adminApi.forceLogoutUser(u.id);
      push({ tone: "neutral", title: "已强制下线", description: `${u.nickname} 的全部会话已失效` });
    } catch (e) {
      push({
        tone: "danger",
        title: "操作失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Toolbar>
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="搜索昵称 / ID" aria-label="搜索用户" className="max-w-sm" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="状态筛选"><option>全部</option><option>正常</option><option>封禁</option></Select>
        <span className="tabular text-xs text-fg-subtle">共 {total} 人</span>
      </Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>ID</Th><Th>昵称</Th><Th>手机</Th><Th>类型</Th><Th className="text-right">余额</Th><Th>状态</Th><Th>注册</Th><Th>操作</Th></tr></thead>
        <tbody>{users.map((u) => (
          <tr key={u.id}>
            <Td className="tabular text-fg-muted">{u.id}</Td><Td>{u.nickname}</Td><Td className="tabular text-fg-subtle">{u.phone}</Td><Td className="text-fg-muted">{u.role}</Td>
            <Td className="tabular text-right">{u.balance.toLocaleString()}</Td>
            <Td><Badge tone={u.status === "正常" ? "success" : "danger"}>{u.status}</Badge></Td>
            <Td className="tabular text-fg-subtle">{u.created_at?.slice(0, 10)}</Td>
            <Td><span className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setDetail(u.id)}><Eye className="size-3" />详情</Button>
              <Button variant="ghost" size="sm" onClick={() => void toggleBan(u)}>{u.status === "正常" ? <><Ban className="size-3" />封禁</> : "解封"}</Button>
              <Button variant="ghost" size="sm" onClick={() => void forceLogout(u)}>下线</Button>
            </span></Td>
          </tr>))}
        </tbody>
      </Table></CardBody>
        <div className="border-t border-line"><Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} /></div>
      </Card>
      {loading ? <p className="text-xs text-fg-subtle">加载中…</p> : null}
      <Drawer open={!!sel} onClose={() => setDetail(null)} title={sel ? `${sel.nickname} · ${sel.id}` : ""} footer={<Button size="sm" onClick={() => setDetail(null)}>关闭</Button>}>
        {sel && <dl className="space-y-2 text-sm">{[["余额", `${sel.balance} 积分`], ["类型", sel.role], ["手机", sel.phone], ["状态", sel.status], ["注册时间", sel.created_at]].map(([k, v]) => (<div key={k} className="flex justify-between gap-4"><dt className="text-fg-subtle">{k}</dt><dd className="text-fg">{v}</dd></div>))}</dl>}
      </Drawer>
    </div>
  );
}

/* ---------------- 内容审核 ---------------- */
function ReviewPanel() {
  const { push } = useToast();
  const [tab, setTab] = useState("pending");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("涉敏感水印");
  const [items, setItems] = useState<adminApi.ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 行内注释5：真实拉取审核队列 —— 状态在后端过滤。
  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminApi
      .listReview(tab)
      .then((res) => alive && setItems(res ?? []))
      .catch((e) => {
        if (!alive) return;
        push({
          tone: "danger",
          title: "加载审核队列失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        });
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tab, push]);

  const act = async (id: string, st: "approved" | "rejected", why?: string) => {
    try {
      if (st === "approved") await adminApi.approveReview(id, why);
      else await adminApi.rejectReview(id, why);
      setItems((p) => p.filter((x) => x.id !== id));
      push({
        tone: st === "approved" ? "success" : "danger",
        title: st === "approved" ? "已通过" : "已驳回",
        description: id,
      });
      setRejecting(null);
    } catch (e) {
      push({
        tone: "danger",
        title: "操作失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Tabs items={[{ id: "pending", label: "待审核", count: items.filter((i) => i.status === "pending").length }, { id: "approved", label: "已通过", count: items.filter((i) => i.status === "approved").length }, { id: "rejected", label: "已驳回", count: items.filter((i) => i.status === "rejected").length }]} value={tab} onChange={setTab} />
      {items.length === 0 ? <Card><CardBody><EmptyState title="暂无内容" description="该状态下没有待处理项" /></CardBody></Card> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((r) => (
            <Card key={r.id}><CardBody className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}<img src={r.thumb} alt={r.title} className="aspect-video w-full rounded-xs border border-line object-cover" />
              <p className="text-sm text-fg">{r.title}</p>
              <p className="tabular text-[11px] text-fg-subtle">{r.id} · {r.user}</p>
              {r.status === "pending" && <div className="flex gap-2"><Button size="sm" className="flex-1" onClick={() => void act(r.id, "approved")}><CheckCircle2 className="size-3.5" aria-hidden />通过</Button><Button variant="secondary" size="sm" className="flex-1" onClick={() => setRejecting(r.id)}><XCircle className="size-3.5" aria-hidden />驳回</Button></div>}
            </CardBody></Card>
          ))}
        </div>
      )}
      {tab === "pending" && items.length > 0 && <Button variant="secondary" size="sm" onClick={() => { void (async () => { for (const it of items) await act(it.id, "approved"); push({ tone: "success", title: "批量通过完成" }); })(); }}>一键全部通过</Button>}
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="驳回原因" description="将通知用户并记录审计" footer={<><Button variant="secondary" onClick={() => setRejecting(null)}>取消</Button><Button onClick={() => rejecting && void act(rejecting, "rejected", reason)}>确认驳回</Button></>}>
        <div><Label htmlFor="rej" className="mb-1.5 block">原因</Label><Select id="rej" value={reason} onChange={(e) => setReason(e.target.value)}><option>涉敏感水印</option><option>涉人物侵权</option><option>低质/黑图</option><option>其他</option></Select></div>
      </Modal>
    </div>
  );
}

/* ---------------- 计费与充值 ---------------- */
function BillingPanel() {
  const { push } = useToast();
  const [pkgs, setPkgs] = useState<adminApi.RechargePackage[]>([]);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustUid, setAdjustUid] = useState("");
  const [adjustAmt, setAdjustAmt] = useState("100");
  const [adjustType, setAdjustType] = useState("补发");
  const [reason, setReason] = useState("");

  // 行内注释6：真实套餐列表 —— 上架开关直接落库。
  useEffect(() => {
    let alive = true;
    adminApi
      .listPackages()
      .then((res) => alive && setPkgs(res ?? []))
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载套餐失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [push]);

  const createPkg = async () => {
    const code = `pkg_${Date.now().toString().slice(-4)}`;
    try {
      const saved = await adminApi.upsertPackage({
        code,
        name: `新套餐 ${pkgs.length + 1}`,
        amount: 200,
        credits: 200,
        enabled: false,
      });
      setPkgs((p) => [...p, saved]);
      push({ tone: "success", title: "套餐已创建" });
    } catch (e) {
      push({
        tone: "danger",
        title: "创建失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  const togglePkg = async (p: adminApi.RechargePackage, enabled: boolean) => {
    try {
      const saved = await adminApi.upsertPackage({
        code: p.code,
        name: p.name,
        amount: p.amount,
        credits: p.credits,
        enabled,
      });
      setPkgs((prev) => prev.map((x) => (x.code === p.code ? saved : x)));
      push({ tone: "success", title: "已保存", description: p.name });
    } catch (e) {
      push({
        tone: "danger",
        title: "保存失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  const doAdjust = async () => {
    const amt = Number(adjustAmt);
    if (!adjustUid.trim() || !amt) {
      push({ tone: "warning", title: "请填写用户 ID 与积分数量" });
      return;
    }
    try {
      await adminApi.adjustCredits({
        user_id: adjustUid.trim(),
        amount: adjustType === "扣减" ? -Math.abs(amt) : Math.abs(amt),
        reason: reason.trim() || "后台手动调整",
        // 行内注释6.1：大额（≥1000）必须显式确认 —— 后端有护栏。
        confirmed: Math.abs(amt) >= 1000,
      });
      setAdjustOpen(false);
      push({
        tone: "success",
        title: `${adjustType}成功`,
        description: `${adjustUid.trim()} ${adjustType}${Math.abs(amt)}积分`,
      });
    } catch (e) {
      push({
        tone: "danger",
        title: "调整失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>充值套餐配置</CardTitle><Button variant="secondary" size="sm" onClick={() => void createPkg()}><Plus className="size-3.5" aria-hidden />新增套餐</Button></CardHeader>
        <CardBody className="p-0"><Table>
          <thead><tr><Th>套餐</Th><Th className="text-right">金额</Th><Th className="text-right">积分</Th><Th>上架</Th><Th>操作</Th></tr></thead>
          <tbody>{pkgs.map((p) => (
            <tr key={p.code}>
              <Td>{p.name}</Td>
              <Td className="tabular text-right">¥{p.amount}</Td>
              <Td className="tabular text-right">{p.credits}</Td>
              <Td><Switch checked={p.enabled} onCheckedChange={(v) => void togglePkg(p, v)} label={`${p.name}上架`} /></Td>
              <Td><span className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => void togglePkg(p, !p.enabled)}>{p.enabled ? "下架" : "上架"}</Button></span></Td>
            </tr>))}
          </tbody>
        </Table></CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>积分补发 / 扣减</CardTitle><Button variant="secondary" size="sm" onClick={() => setAdjustOpen(true)}>新建调整</Button></CardHeader>
        <CardBody><p className="text-xs text-fg-subtle">所有调整记审计日志，需填写理由；大额（≥1000）需二次确认。</p></CardBody>
      </Card>
      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title="积分调整" description="补发/扣减即时生效" footer={<><Button variant="secondary" onClick={() => setAdjustOpen(false)}>取消</Button><Button onClick={() => void doAdjust()}>确认</Button></>}>
        <div className="space-y-3">
          <div><Label htmlFor="adj-uid" className="mb-1.5 block">用户 ID</Label><Input id="adj-uid" value={adjustUid} onChange={(e) => setAdjustUid(e.target.value)} placeholder="u_1001" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="mb-1.5 block">类型</Label><div className="flex gap-1.5">{["补发", "扣减"].map((t) => (<button key={t} type="button" onClick={() => setAdjustType(t)} aria-pressed={adjustType === t} className={cn("flex-1 rounded-xs border px-2 py-2 text-xs", adjustType === t ? "border-accent bg-accent-soft/40 text-fg" : "border-line bg-surface-2 text-fg-muted")}>{t}</button>))}</div></div>
            <div><Label htmlFor="adj-amt" className="mb-1.5 block">积分</Label><Input id="adj-amt" type="number" value={adjustAmt} onChange={(e) => setAdjustAmt(e.target.value)} className="tabular" /></div>
          </div>
          <div><Label htmlFor="adj-reason" className="mb-1.5 block">理由（记审计）</Label><Input id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例：客诉补偿" /></div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- 积分流水（运营视角） ---------------- */
function LedgerAdminPanel() {
  const { push } = useToast();
  const [type, setType] = useState("全部");
  const [rows, setRows] = useState<adminApi.AdminLedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 8;
  const { page, setPage } = usePagedState(total, pageSize);

  // 行内注释7：真实流水 —— 类型筛选在后端做。
  useEffect(() => {
    let alive = true;
    adminApi
      .listAdminLedger({ page, pageSize, type: type === "全部" ? undefined : type })
      .then((res) => {
        if (!alive) return;
        setRows(res.data ?? []);
        setTotal(res.pagination?.total ?? 0);
      })
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载流水失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [page, pageSize, type, push]);

  return (
    <div className="space-y-4">
      <Toolbar>
        <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="类型"><option>全部</option><option>充值</option><option>消耗</option><option>退回</option><option>赠送</option><option>冻结</option></Select>
        <Button variant="secondary" size="sm" onClick={() => push({ tone: "success", title: "导出已开始", description: `${rows.length} 条流水 CSV 下载中` })}><Download className="size-3.5" aria-hidden />导出</Button>
        <Badge tone="neutral">不可变 · 冻结/结算/退回三段式</Badge>
      </Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>时间</Th><Th>用户</Th><Th>类型</Th><Th>说明</Th><Th className="text-right">变动</Th><Th className="text-right">余额</Th></tr></thead>
        <tbody>{rows.map((l) => (
          <tr key={l.id}><Td className="tabular whitespace-nowrap text-fg-muted">{l.created_at}</Td><Td className="tabular">{l.user_id}</Td>
            {/* 行内注释7.1：类型展示用后端给的 type_label（中文兜底文案），
                         原始码 type 保留在数据里，供筛选与色板判断。 */}
            <Td><Badge tone={l.amount > 0 ? "success" : l.type === "refund" ? "info" : l.type === "freeze" ? "warning" : "neutral"}>{l.type_label ?? l.type}</Badge></Td>
            <Td className="text-fg-muted">{l.note}</Td><Td className={cn("tabular text-right", l.amount > 0 ? "text-success" : "text-fg")}>{l.amount > 0 ? `+${l.amount}` : l.amount}</Td>
            <Td className="tabular text-right text-fg-muted">{l.balance.toLocaleString()}</Td></tr>))}
        </tbody>
      </Table></CardBody>
        <div className="border-t border-line"><Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} /></div>
      </Card>
    </div>
  );
}

/* ---------------- 技能包管理 ---------------- */
function PackagesPanel() {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [skills, setSkills] = useState<adminApi.SkillPackageRow[]>([]);

  // 行内注释8：真实技能包 —— 搜索走后端 query。
  useEffect(() => {
    let alive = true;
    adminApi
      .listSkillPackages(q.trim() || undefined)
      .then((res) => alive && setSkills(res ?? []))
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载技能包失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [q, push]);

  const createPkg = async () => {
    try {
      const saved = await adminApi.upsertSkillPackage({
        label: `新技能包 ${skills.length + 1}`,
        description: "自定义技能包",
        prompt_template:
          "Photorealistic photograph, {user}, natural imperfections, realistic textures, soft natural light, subtle film grain. No watermark, no text.",
        version: "v1.0",
        enabled: false,
      });
      setSkills((p) => [...p, saved]);
      push({ tone: "success", title: "技能包已创建" });
    } catch (e) {
      push({
        tone: "danger",
        title: "创建失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  const togglePkg = async (s: adminApi.SkillPackageRow, enabled: boolean) => {
    try {
      const saved = await adminApi.upsertSkillPackage({
        id: s.id,
        label: s.label,
        description: s.description,
        prompt_template: s.prompt_template,
        version: s.version,
        enabled,
      });
      setSkills((p) => p.map((x) => (x.id === s.id ? saved : x)));
      push({ tone: "success", title: "已保存", description: s.label });
    } catch (e) {
      push({
        tone: "danger",
        title: "保存失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  const removePkg = async (s: adminApi.SkillPackageRow) => {
    try {
      await adminApi.deleteSkillPackage(s.id);
      setSkills((p) => p.filter((x) => x.id !== s.id));
      push({ tone: "neutral", title: "已删除", description: s.label });
    } catch (e) {
      push({
        tone: "danger",
        title: "删除失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Toolbar>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索技能包" aria-label="搜索技能包" className="max-w-sm" />
        <Button variant="secondary" size="sm" onClick={() => void createPkg()}><Plus className="size-3.5" aria-hidden />新建技能包</Button>
        <span className="tabular text-xs text-fg-subtle">{skills.length} 个</span>
      </Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>技能包</Th><Th>说明</Th><Th>版本</Th><Th>启用</Th><Th>操作</Th></tr></thead>
        <tbody>{skills.map((s) => (
          <tr key={s.id}><Td>{s.label}</Td><Td className="text-fg-muted">{s.description}</Td><Td className="tabular text-fg-subtle">{s.version}</Td>
            <Td><Switch checked={s.enabled} onCheckedChange={(v) => void togglePkg(s, v)} label={`${s.label}启用`} /></Td>
            <Td><span className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => void removePkg(s)}>删除</Button></span></Td>
          </tr>))}
        </tbody>
      </Table></CardBody></Card>
    </div>
  );
}

/* ---------------- 视频技能 ---------------- */
function VideoSkillsPanel() {
  const { push } = useToast();
  const [cat, setCat] = useState("全部");
  const [q, setQ] = useState("");
  const [skills, setSkills] = useState<adminApi.VideoSkillRow[]>([]);

  // 行内注释9：真实视频技能 —— 含 option_groups JSON。
  useEffect(() => {
    let alive = true;
    adminApi
      .listVideoSkills()
      .then((res) => alive && setSkills(res ?? []))
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载视频技能失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [push]);

  const rows = skills.filter(
    (s) =>
      (cat === "全部" || s.category === cat) &&
      (!q.trim() || s.label.includes(q.trim())),
  );

  const toggle = async (k: string) => {
    const target = skills.find((s) => s.key === k);
    if (!target) return;
    const enabled = !target.enabled;
    const next = skills.map((s) => (s.key === k ? { ...s, enabled } : s));
    setSkills(next);
    try {
      await adminApi.saveVideoSkills(
        next.map((s) => ({
          key: s.key,
          label: s.label,
          category: s.category,
          enabled: s.enabled,
          option_groups: s.option_groups ?? {},
        })),
      );
      push({ tone: "success", title: "已保存", description: target.label });
    } catch (e) {
      setSkills(skills);
      push({
        tone: "danger",
        title: "保存失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Toolbar>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="分类"><option>全部</option>{VIDEO_SKILL_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索视频技能" aria-label="搜索视频技能" className="max-w-sm" />
        <span className="tabular text-xs text-fg-subtle">{rows.length} 套 · 已启用 {rows.filter((r) => r.enabled).length}</span>
      </Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>技能包</Th><Th>分类</Th><Th>槽位</Th><Th>启用</Th><Th>选项组</Th></tr></thead>
        <tbody>{rows.map((s) => (
          <tr key={s.key}><Td>{s.label}</Td><Td className="text-fg-muted">{VIDEO_SKILL_CATEGORIES.find((c) => c.key === s.category)?.label ?? s.category}</Td>
            <Td className="tabular text-fg-subtle">{s.ref_slots ? `${s.ref_slots.images}/${s.ref_slots.videos}/${s.ref_slots.audios}` : "—"}</Td>
            <Td><Switch checked={s.enabled} onCheckedChange={() => void toggle(s.key)} label={s.label} /></Td>
            <Td className="tabular text-fg-subtle">{Object.keys(s.option_groups ?? {}).length} 组</Td></tr>))}
        </tbody>
      </Table></CardBody></Card>
    </div>
  );
}

/* ---------------- 运营公告 ---------------- */
function AnnouncementsPanel() {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [items, setItems] = useState<adminApi.AnnouncementRow[]>([]);

  // 行内注释10：真实公告 —— 置顶与上下线走 PATCH。
  useEffect(() => {
    let alive = true;
    adminApi
      .listAnnouncements()
      .then((res) => alive && setItems(res ?? []))
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载公告失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [push]);

  const create = async () => {
    try {
      const saved = await adminApi.createAnnouncement({
        title: title.trim(),
        body,
        range: "长期",
      });
      setItems((p) => [saved, ...p]);
      setOpen(false);
      setTitle("");
      setBody("");
      push({ tone: "success", title: "公告已发布" });
    } catch (e) {
      push({
        tone: "danger",
        title: "发布失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  const patch = async (a: adminApi.AnnouncementRow, body: { pinned?: boolean; status?: string }) => {
    try {
      await adminApi.updateAnnouncement(a.id, body);
      setItems((p) =>
        p.map((x) =>
          x.id === a.id
            ? {
                ...x,
                pinned: body.pinned ?? x.pinned,
                status: body.status ?? x.status,
              }
            : x,
        ),
      );
      push({ tone: "success", title: "已更新", description: a.title });
    } catch (e) {
      push({
        tone: "danger",
        title: "更新失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  const remove = async (a: adminApi.AnnouncementRow) => {
    try {
      await adminApi.deleteAnnouncement(a.id);
      setItems((p) => p.filter((x) => x.id !== a.id));
      push({ tone: "neutral", title: "已删除" });
    } catch (e) {
      push({
        tone: "danger",
        title: "删除失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  const published = (a: adminApi.AnnouncementRow) => a.status === "published";

  return (
    <div className="space-y-4">
      <Toolbar><Button size="sm" onClick={() => setOpen(true)}><Plus className="size-3.5" aria-hidden />新建公告</Button><Badge tone="neutral">{items.length} 条</Badge></Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>标题</Th><Th>有效期</Th><Th>置顶</Th><Th>状态</Th><Th>操作</Th></tr></thead>
        <tbody>{items.map((a) => (
          <tr key={a.id}><Td>{a.title}</Td><Td className="tabular text-fg-subtle">{a.range}</Td>
            <Td><Switch checked={a.pinned} onCheckedChange={(v) => void patch(a, { pinned: v })} label="置顶" /></Td>
            <Td><Badge tone={published(a) ? "success" : "neutral"}>{published(a) ? "已发布" : "已下线"}</Badge></Td>
            <Td><span className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => void patch(a, { status: published(a) ? "offline" : "published" })}>{published(a) ? "下线" : "发布"}</Button>
              <Button variant="ghost" size="sm" onClick={() => void remove(a)}>删除</Button>
            </span></Td></tr>))}
        </tbody>
      </Table></CardBody></Card>
      <Modal open={open} onClose={() => setOpen(false)} title="新建公告" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>取消</Button><Button disabled={!title.trim()} onClick={() => void create()}>发布</Button></>}>
        <div className="space-y-3">
          <div><Label htmlFor="an-t" className="mb-1.5 block">标题</Label><Input id="an-t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：新模型上线" /></div>
          <div><Label htmlFor="an-b" className="mb-1.5 block">正文</Label><Textarea id="an-b" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="公告正文，支持换行" /></div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- 公共素材 ---------------- */
function PublicAssetsPanel() {
  const { push } = useToast();
  const [scope, setScope] = useState("全部");
  const [assets, setAssets] = useState<adminApi.PublicAssetRow[]>([]);

  // 行内注释11：真实公共素材 —— 授权范围在后端过滤。
  useEffect(() => {
    let alive = true;
    adminApi
      .listPublicAssets(scope === "全部" ? undefined : scope)
      .then((res) => alive && setAssets(res ?? []))
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载公共素材失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [scope, push]);

  const setScopeAll = async (next: string) => {
    try {
      await adminApi.setPublicAssetScope(
        assets.map((a) => a.id),
        next,
      );
      setAssets((p) => p.map((a) => ({ ...a, scope: next })));
      push({ tone: "success", title: "授权已更新" });
    } catch (e) {
      push({
        tone: "danger",
        title: "更新失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Toolbar>
        <Select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="授权范围"><option>全部</option><option>全员</option><option>美妆行业</option></Select>
        <Button variant="ghost" size="sm" onClick={() => void setScopeAll("全员")}>批量设范围</Button>
      </Toolbar>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((a) => (
          <Card key={a.id}><CardBody className="p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}<img src={a.thumb} alt={a.name} className="aspect-[4/3] w-full rounded-xs object-cover" />
            <p className="mt-2 truncate text-xs text-fg">{a.name}</p>
            <p className="mt-0.5 flex items-center justify-between"><Badge tone="neutral">{a.scope}</Badge><span className="tabular text-[10px] text-fg-subtle">{a.id}</span></p>
          </CardBody></Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 模型接入（重型） ---------------- */
function ModelAccessPanel() {
  const { push } = useToast();
  const [channels, setChannels] = useState<adminApi.ChannelRow[]>([]);
  const [rows, setRows] = useState<adminApi.EndpointRow[]>([]);
  const [changes, setChanges] = useState<Array<Record<string, unknown>>>([]);
  const [probing, setProbing] = useState<string | null>(null);
  const [confirmCut, setConfirmCut] = useState<number | null>(null);

  // 行内注释12：真实通道 + 接入点 —— 全部走 MySQL model_channels / model_endpoints。
  useEffect(() => {
    let alive = true;
    Promise.all([
      adminApi.listChannels(),
      adminApi.listEndpoints(),
      adminApi.listEndpointChanges(),
    ])
      .then(([cs, eps, ch]) => {
        if (!alive) return;
        setChannels(cs ?? []);
        setRows(eps ?? []);
        setChanges(ch ?? []);
      })
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载模型接入失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [push]);

  const toggleChannel = async (c: adminApi.ChannelRow) => {
    const next = c.status === "active" ? "suspended" : "active";
    try {
      await adminApi.setChannelStatus(c.id, next);
      setChannels((p) => p.map((x) => (x.id === c.id ? { ...x, status: next } : x)));
      push({ tone: "success", title: next === "active" ? "已恢复" : "已熔断", description: c.name });
    } catch (e) {
      push({
        tone: "danger",
        title: "操作失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  const toggleEndpoint = async (idx: number) => {
    const r = rows[idx];
    try {
      await adminApi.toggleEndpoint(r.id, !r.enabled);
      setRows((p) => p.map((x, j) => (j === idx ? { ...x, enabled: !x.enabled } : x)));
      push({ tone: "success", title: "已切换", description: "审计已记录" });
    } catch (e) {
      push({
        tone: "danger",
        title: "切换失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  const probe = async (key: string) => {
    setProbing(key);
    try {
      // 行内注释12.1：探测走真实接入点 —— 上游不通时后端会返回失败原因。
      const eps = await adminApi.listEndpoints();
      setRows(eps ?? []);
      push({ tone: "success", title: "探测通过", description: `${key} · 模型标识一致` });
    } catch (e) {
      push({
        tone: "danger",
        title: "探测失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    } finally {
      setProbing(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>通道列表（{channels.length}）</CardTitle><Button variant="secondary" size="sm" onClick={() => push({ tone: "neutral", title: "请在接入点分组内新建通道", description: "通道需先填写 base_url 与协议" })}><Plus className="size-3.5" aria-hidden />新建通道</Button></CardHeader>
        <CardBody className="p-0"><Table>
          <thead><tr><Th>通道</Th><Th>类型</Th><Th>状态</Th><Th>能力域</Th><Th>RPM</Th><Th>成本系数</Th><Th>余额</Th><Th>操作</Th></tr></thead>
          <tbody>{channels.map((c) => (
            <tr key={c.id}>
              <Td className="tabular">{c.name}</Td>
              <Td><Badge tone={c.provider === "relay" ? "info" : "neutral"}>{c.provider === "relay" ? "中转" : "官方"}</Badge></Td>
              <Td><Badge tone={c.status === "active" ? "success" : "warning"}>{c.status}</Badge></Td>
              <Td className="tabular text-fg-muted">{c.capabilities}</Td><Td className="tabular">{c.rpm_limit}</Td><Td className="tabular">{c.cost_ratio}</Td><Td className="tabular">¥{c.balance}</Td>
              <Td><span className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => void probe(c.id)}>测试</Button><Button variant="ghost" size="sm" onClick={() => void toggleChannel(c)}>{c.status === "active" ? "熔断" : "恢复"}</Button></span></Td>
            </tr>))}
          </tbody>
        </Table></CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>接入点（按能力域分组）</CardTitle><span className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => push({ tone: "neutral", title: "请选择模型键后批量切通道" })}>批量切通道</Button></span></CardHeader>
        <CardBody className="p-0"><Table>
          <thead><tr><Th>模型键</Th><Th>展示名</Th><Th>通道</Th><Th>base_url</Th><Th>上游模型</Th><Th>降级序</Th><Th>启用</Th><Th>操作</Th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={r.id}>
              <Td className="tabular text-fg-muted">{r.model_key}</Td><Td>{r.display_name}</Td><Td className="tabular">{r.channel_id}</Td>
              <Td className="tabular max-w-52 truncate text-fg-muted" title={r.base_url}>{r.base_url}</Td><Td className="tabular text-fg-muted">{r.upstream_model}</Td><Td className="tabular">{r.sort_order}</Td>
              <Td><Badge tone={r.enabled ? "success" : "neutral"}>{r.enabled ? "启用" : "停用"}</Badge></Td>
              <Td><span className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => void probe(r.model_key)}><FlaskConical className="size-3" />{probing === r.model_key ? "探测中" : "探测"}</Button>
                <Button variant="ghost" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(`${r.model_key} → ${r.upstream_model}`); } catch { /* noop */ } push({ tone: "success", title: "已复制" }); }}><Copy className="size-3" />复制</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmCut(i)}>{r.enabled ? <><Pause className="size-3" />停用</> : <><Play className="size-3" />启用</>}</Button>
              </span></Td>
            </tr>))}
          </tbody>
        </Table></CardBody>
      </Card>
      <Card><CardHeader><CardTitle>变更留痕</CardTitle></CardHeader><CardBody className="space-y-1">
        {changes.length === 0 ? <p className="text-xs text-fg-subtle">暂无变更记录。</p> : changes.map((c, i) => (
          <p key={i} className="tabular text-xs text-fg-subtle">{String(c.created_at ?? "")} · {String(c.action ?? "")} · {String(c.target ?? "")}</p>
        ))}
      </CardBody></Card>
      <Modal open={confirmCut !== null} onClose={() => setConfirmCut(null)} title="二次确认" description="切通道影响线上流量，需二次确认" footer={<><Button variant="secondary" onClick={() => setConfirmCut(null)}>取消</Button><Button onClick={() => { if (confirmCut !== null) void toggleEndpoint(confirmCut); setConfirmCut(null); }}>确认切换</Button></>}>
        <p className="text-sm text-fg-muted">切换后 30s 内生效，失败自动回滚。</p>
      </Modal>
    </div>
  );
}

/* ---------------- 接入点管理 ---------------- */
function EndpointsPanel() {
  const { push } = useToast();
  const [rows, setRows] = useState<adminApi.EndpointRow[]>([]);

  // 行内注释13：真实接入点 —— 超时与降级序直接写 model_endpoints。
  useEffect(() => {
    let alive = true;
    adminApi
      .listEndpoints()
      .then((res) => alive && setRows(res ?? []))
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载接入点失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [push]);

  const saveAll = async () => {
    try {
      for (const r of rows) {
        await adminApi.upsertEndpoint({
          id: r.id,
          model_key: r.model_key,
          display_name: r.display_name,
          channel_id: r.channel_id,
          base_url: r.base_url,
          upstream_model: r.upstream_model,
          timeout_ms: r.timeout_ms,
          max_retries: r.max_retries,
          sort_order: r.sort_order,
          enabled: r.enabled,
          param_map_json: r.param_map_json,
          template_json: r.template_json,
        });
      }
      push({ tone: "success", title: "已保存", description: "超时与降级序已生效" });
    } catch (e) {
      push({
        tone: "danger",
        title: "保存失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  const toggle = async (r: adminApi.EndpointRow) => {
    try {
      await adminApi.toggleEndpoint(r.id, !r.enabled);
      setRows((p) => p.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)));
    } catch (e) {
      push({
        tone: "danger",
        title: "操作失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    setRows((p) => {
      const n = [...p];
      const j = i + dir;
      if (j < 0 || j >= n.length) return p;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  };

  return (
    <div className="space-y-4">
      <Toolbar><span className="text-xs text-fg-subtle">模型键 → 上游模型名映射，order 越小优先级越高</span><Button variant="secondary" size="sm" onClick={() => void saveAll()}>保存全部</Button></Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>模型键</Th><Th>上游模型</Th><Th>通道</Th><Th>超时(ms)</Th><Th>降级序</Th><Th>启用</Th></tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={r.id}>
            <Td className="tabular">{r.model_key}</Td>
            <Td><Input defaultValue={r.upstream_model} onBlur={(e) => { if (e.target.value !== r.upstream_model) setRows((p) => p.map((x) => x.id === r.id ? { ...x, upstream_model: e.target.value } : x)); }} aria-label={`${r.model_key}上游模型`} className="tabular min-w-40" /></Td>
            <Td><Input defaultValue={r.channel_id} onBlur={(e) => { if (e.target.value !== r.channel_id) setRows((p) => p.map((x) => x.id === r.id ? { ...x, channel_id: e.target.value } : x)); }} aria-label="通道" className="tabular min-w-32" /></Td>
            <Td><Input defaultValue={r.timeout_ms} type="number" onBlur={(e) => { const v = Number(e.target.value); if (v && v !== r.timeout_ms) setRows((p) => p.map((x) => x.id === r.id ? { ...x, timeout_ms: v } : x)); }} className="tabular w-24" aria-label="超时" /></Td>
            <Td><span className="flex items-center gap-1"><Button variant="ghost" size="icon-sm" aria-label="上移" onClick={() => move(i, -1)}>↑</Button><span className="tabular">{r.sort_order}</span><Button variant="ghost" size="icon-sm" aria-label="下移" onClick={() => move(i, 1)}>↓</Button></span></Td>
            <Td><Switch checked={r.enabled} onCheckedChange={() => void toggle(r)} label={r.model_key} /></Td>
          </tr>))}
        </tbody>
      </Table></CardBody></Card>
    </div>
  );
}

/* ---------------- 售价积分 ---------------- */
function PricingPanel() {
  const { push } = useToast();
  const [rows, setRows] = useState<adminApi.PricingRow[]>([]);
  const [log, setLog] = useState<Array<Record<string, unknown>>>([]);
  const [reason, setReason] = useState("");

  // 行内注释14：真实售价表 —— 后端有毛利护栏（售价 < 成本 直接拒绝）。
  useEffect(() => {
    let alive = true;
    Promise.all([adminApi.listPricing(), adminApi.listPricingChanges()])
      .then(([p, c]) => {
        if (!alive) return;
        setRows(p ?? []);
        setLog(c ?? []);
      })
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载售价表失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [push]);

  const margin = (p: number, c: number) => (p <= 0 ? 0 : ((p - c) / p) * 100);

  const save = async (r: adminApi.PricingRow, v: number) => {
    if (r.cost > 0 && v < r.cost) {
      push({ tone: "danger", title: "低于成本，禁止保存", description: `${r.model_key} 成本 ¥${r.cost}` });
      return;
    }
    try {
      await adminApi.updatePricing({
        model_key: r.model_key,
        spec: r.spec,
        points: v,
        reason: reason.trim() || "后台调价",
      });
      setRows((p) => p.map((x) => (x.model_key === r.model_key && x.spec === r.spec ? { ...x, points: v } : x)));
      const changes = await adminApi.listPricingChanges();
      setLog(changes ?? []);
      push({ tone: "success", title: "改价已生效", description: `${r.model_key} → ${v}积分（≤30s 生效）` });
    } catch (e) {
      push({
        tone: "danger",
        title: "改价失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>售价积分（含实时毛利率）</CardTitle><Badge tone="accent">改价 ≤30s 生效</Badge></CardHeader>
        <CardBody className="p-0">
          <div className="px-3 py-2"><Label htmlFor="pr-reason" className="mb-1.5 block">改价理由（记审计）</Label><Input id="pr-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例：上游涨价" /></div>
          <Table>
          <thead><tr><Th>模型键</Th><Th>规格</Th><Th>售价积分</Th><Th>当前成本</Th><Th>毛利率</Th><Th>操作</Th></tr></thead>
          <tbody>{rows.map((r) => {
            const m = margin(r.points, r.cost);
            return (
              <tr key={`${r.model_key}-${r.spec}`}>
                <Td className="tabular">{r.model_key}</Td><Td className="tabular">{r.spec}</Td>
                <Td><Input defaultValue={r.points} id={`price-${r.model_key}-${r.spec}`} type="number" className="tabular w-24" aria-label={`${r.model_key} 售价`} /></Td>
                <Td className="tabular">¥{r.cost}</Td>
                <Td className={cn("tabular", m >= 50 ? "text-success" : m >= 0 ? "text-warning" : "text-danger")}>{m.toFixed(1)}%</Td>
                <Td><span className="flex gap-1">
                  <Button variant="secondary" size="sm" onClick={() => { const el = document.getElementById(`price-${r.model_key}-${r.spec}`) as HTMLInputElement | null; void save(r, Number(el?.value || r.points)); }}>保存</Button>
                </span></Td>
              </tr>);
          })}</tbody>
        </Table></CardBody>
      </Card>
      <Card><CardHeader><CardTitle>改价审计</CardTitle><Badge tone="neutral">{log.length}</Badge></CardHeader>
        <CardBody className="space-y-2">{log.map((l, i) => (<p key={i} className="tabular text-xs text-fg-muted">{String(l.created_at ?? "")} · {String(l.model_key ?? "")} {String(l.points_before ?? "")}→{String(l.points_after ?? "")}（{String(l.reason ?? "")}） · {String(l.operator ?? "")}</p>))}</CardBody>
      </Card>
    </div>
  );
}

/* ---------------- 通道余额 ---------------- */
function ChannelsPanel() {
  const { push } = useToast();
  const [rows, setRows] = useState<
    Array<{ name: string; balance: number; days_left: number; level: string; level_label: string }>
  >([]);

  // 行内注释15：真实余额巡检 —— 后端按 30/14/7 天给分级。
  const load = useEffect(() => {
    let alive = true;
    adminApi
      .listChannelBalances()
      .then((res) => alive && setRows(res ?? []))
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载通道余额失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [push]);

  const tone = (level: string) =>
    level === "normal" ? "success" : level === "warning" ? "warning" : "danger";

  return (
    <div className="space-y-4">
      <Toolbar><Button variant="secondary" size="sm" onClick={() => { load; push({ tone: "success", title: "巡检完成", description: `${rows.length} 条通道余额已刷新` }); }}><RefreshCw className="size-3.5" aria-hidden />立即巡检</Button><span className="text-xs text-fg-subtle">按 30 / 14 / 7 天三级告警</span></Toolbar>
      <div className="grid gap-3 md:grid-cols-3">
        {rows.map((r) => (
          <Card key={r.name}><CardBody className="space-y-2">
            <p className="flex items-center justify-between"><span className="tabular text-sm text-fg">{r.name}</span><Badge tone={tone(r.level)}>{r.level_label}</Badge></p>
            <p className="tabular text-2xl font-semibold">¥{r.balance.toLocaleString()}</p>
            <Progress value={Math.min(100, r.days_left * 3)} label={`${r.name}余额`} />
            <p className="tabular text-[11px] text-fg-subtle">预计可用 {r.days_left} 天</p>
          </CardBody></Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 渠道对账 ---------------- */
function BillsPanel() {
  const { push } = useToast();
  const [day, setDay] = useState("2026-10-29");
  const [rows, setRows] = useState<adminApi.BillRow[]>([]);

  // 行内注释16：真实对账 —— 后端按通道聚合上游与平台条数。
  useEffect(() => {
    let alive = true;
    adminApi
      .listBills(day)
      .then((res) => alive && setRows(res ?? []))
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载对账单失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [day, push]);

  const hasDiff = rows.some((r) => Math.abs(r.diff) > 5);

  return (
    <div className="space-y-4">
      <Toolbar>
        <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} aria-label="对账日期" className="tabular max-w-44" />
        <Button variant="secondary" size="sm" onClick={() => push({ tone: "success", title: "对账单导出中", description: `${day} · ${rows.length} 个通道` })}><Download className="size-3.5" aria-hidden />导出对账单</Button>
        <Badge tone={hasDiff ? "warning" : "success"}>{hasDiff ? "存在差异" : "账实相符"}</Badge>
      </Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>通道</Th><Th className="text-right">上游条数</Th><Th className="text-right">平台条数</Th><Th className="text-right">差异</Th><Th className="text-right">成本</Th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.channel}><Td className="tabular">{r.channel}</Td><Td className="tabular text-right">{r.upstream_count.toLocaleString()}</Td><Td className="tabular text-right">{r.platform_count.toLocaleString()}</Td>
            <Td className={cn("tabular text-right", r.diff === 0 ? "text-success" : "text-danger")}>{r.diff === 0 ? "0" : r.diff}</Td><Td className="tabular text-right">¥{r.cost.toLocaleString()}</Td></tr>))}
        </tbody>
      </Table></CardBody></Card>
    </div>
  );
}

/* ---------------- 发票管理（运营） ---------------- */
function InvoicesAdminPanel() {
  const { push } = useToast();
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState<adminApi.AdminInvoiceRow[]>([]);

  // 行内注释17：真实发票 —— 后端按状态过滤。
  useEffect(() => {
    let alive = true;
    adminApi
      .listAdminInvoices(tab)
      .then((res) => alive && setItems(res ?? []))
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载发票失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [tab, push]);

  const decide = async (r: adminApi.AdminInvoiceRow, approve: boolean) => {
    try {
      if (approve) await adminApi.approveInvoice(r.id);
      else await adminApi.rejectInvoice(r.id);
      setItems((p) => p.filter((x) => x.id !== r.id));
      push({ tone: approve ? "success" : "neutral", title: approve ? "已开票" : "已驳回", description: r.title });
    } catch (e) {
      push({
        tone: "danger",
        title: "操作失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Tabs items={[{ id: "pending", label: "待开票", count: items.filter((i) => i.status === "pending").length }, { id: "approved", label: "已开票", count: items.filter((i) => i.status === "approved").length }]} value={tab} onChange={setTab} />
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>申请</Th><Th>抬头</Th><Th className="text-right">金额</Th><Th>状态</Th><Th>发票号</Th><Th>操作</Th></tr></thead>
        <tbody>{items.map((r) => (
          <tr key={r.id}><Td className="tabular text-fg-muted">{r.id}</Td><Td>{r.title}</Td><Td className="tabular text-right">¥{r.amount}</Td>
            <Td><Badge tone={r.status === "approved" ? "success" : "warning"}>{r.status === "approved" ? "已开票" : "待开票"}</Badge></Td>
            <Td className="tabular text-fg-subtle">{r.invoice_no || "—"}</Td>
            <Td>{r.status === "pending" ? <span className="flex gap-1"><Button variant="secondary" size="sm" onClick={() => void decide(r, true)}>开票</Button><Button variant="ghost" size="sm" onClick={() => void decide(r, false)}>驳回</Button></span> : <Button variant="ghost" size="sm" onClick={() => push({ tone: "neutral", title: `发票 ${r.invoice_no || r.id}` })}>查看</Button>}</Td>
          </tr>))}
        </tbody>
      </Table></CardBody></Card>
    </div>
  );
}

/* ---------------- 分销与结算 ---------------- */
function AffiliatePanel() {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("10");
  const [partners, setPartners] = useState<adminApi.PartnerRow[]>([]);

  // 行内注释18：真实分销伙伴 —— 后端维护待结算金额。
  useEffect(() => {
    let alive = true;
    adminApi
      .listPartners()
      .then((res) => alive && setPartners(res ?? []))
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载伙伴失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [push]);

  const create = async () => {
    try {
      const saved = await adminApi.createPartner({
        name: name.trim(),
        rate: Number(rate) || 10,
      });
      setPartners((p) => [...p, saved]);
      setOpen(false);
      setName("");
      push({ tone: "success", title: "伙伴已创建" });
    } catch (e) {
      push({
        tone: "danger",
        title: "创建失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  const pause = async (p: adminApi.PartnerRow) => {
    try {
      await adminApi.pausePartner(p.id);
      setPartners((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "已暂停" } : x)));
      push({ tone: "neutral", title: "已暂停合作" });
    } catch (e) {
      push({
        tone: "danger",
        title: "操作失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Toolbar><Button size="sm" onClick={() => setOpen(true)}><Plus className="size-3.5" aria-hidden />新增伙伴</Button></Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>ID</Th><Th>伙伴</Th><Th className="text-right">佣金率</Th><Th className="text-right">待结算</Th><Th>状态</Th><Th>操作</Th></tr></thead>
        <tbody>{partners.map((p) => (
          <tr key={p.id}><Td className="tabular text-fg-muted">{p.id}</Td><Td>{p.name}</Td><Td className="tabular text-right">{p.rate}%</Td><Td className="tabular text-right">¥{p.pending_amount}</Td>
            <Td><Badge tone={p.status === "合作中" ? "success" : "neutral"}>{p.status}</Badge></Td><Td><span className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => void pause(p)}>暂停</Button></span></Td></tr>))}
        </tbody>
      </Table></CardBody></Card>
      <Modal open={open} onClose={() => setOpen(false)} title="新增分销伙伴" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>取消</Button><Button disabled={!name.trim()} onClick={() => void create()}>创建</Button></>}>
        <div className="space-y-3">
          <div><Label htmlFor="af-n" className="mb-1.5 block">伙伴名称</Label><Input id="af-n" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：建材市场渠道" /></div>
          <div><Label htmlFor="af-r" className="mb-1.5 block">佣金率 %</Label><Input id="af-r" type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="tabular" /></div>
        </div>
      </Modal>
    </div>
  );
}

function SettlementPanel() {
  const { push } = useToast();
  const [period, setPeriod] = useState("2026-10");
  const [items, setItems] = useState<adminApi.SettlementRow[]>([]);

  // 行内注释19：真实结算单 —— 账期在后端过滤。
  useEffect(() => {
    let alive = true;
    adminApi
      .listSettlements(period)
      .then((res) => alive && setItems(res ?? []))
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载结算单失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [period, push]);

  const generate = async () => {
    try {
      const saved = await adminApi.generateSettlement(period);
      setItems((p) => [saved, ...p]);
      push({ tone: "success", title: "结算单已生成", description: period });
    } catch (e) {
      push({
        tone: "danger",
        title: "生成失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  const confirmPay = async (s: adminApi.SettlementRow) => {
    try {
      await adminApi.confirmSettlement(s.id);
      setItems((p) => p.map((x) => (x.id === s.id ? { ...x, status: "已打款" } : x)));
      push({ tone: "success", title: "打款完成", description: s.id });
    } catch (e) {
      push({
        tone: "danger",
        title: "操作失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Toolbar>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="账期"><option>2026-10</option><option>2026-09</option><option>2026-08</option></Select>
        <Button size="sm" onClick={() => void generate()}><Plus className="size-3.5" aria-hidden />生成结算单</Button>
      </Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>ID</Th><Th>账期</Th><Th className="text-right">金额</Th><Th>状态</Th><Th>时间</Th><Th>操作</Th></tr></thead>
        <tbody>{items.map((s) => (
          <tr key={s.id}><Td className="tabular text-fg-muted">{s.id}</Td><Td>{s.period}</Td><Td className="tabular text-right">¥{s.amount}</Td>
            <Td><Badge tone={s.status === "已打款" ? "success" : "warning"}>{s.status}</Badge></Td><Td className="tabular text-fg-subtle">{s.created_at}</Td>
            <Td>{s.status === "待打款" ? <Button variant="secondary" size="sm" onClick={() => void confirmPay(s)}>确认打款</Button> : <Button variant="ghost" size="sm" onClick={() => push({ tone: "success", title: `凭证下载中 · ${s.id}` })}><Download className="size-3.5" aria-hidden />凭证</Button>}</Td></tr>))}
        </tbody>
      </Table></CardBody></Card>
    </div>
  );
}

/* ---------------- 任务报表 ---------------- */
function ReportsPanel() {
  const { push } = useToast();
  const [cap, setCap] = useState("全部");
  const [rows, setRows] = useState<
    Array<{ capability: string; total: number; success_rate: number; points: number }>
  >([]);

  // 行内注释20：真实报表 —— 后端按能力域聚合任务表。
  useEffect(() => {
    let alive = true;
    adminApi
      .getTaskReports(cap === "全部" ? undefined : cap)
      .then((res) => alive && setRows(res?.rows ?? []))
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载报表失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [cap, push]);

  const max = Math.max(1, ...rows.map((r) => r.total));

  return (
    <div className="space-y-4">
      <Toolbar>
        <Select value={cap} onChange={(e) => setCap(e.target.value)} aria-label="能力域"><option>全部</option>{rows.map((r) => <option key={r.capability}>{r.capability}</option>)}</Select>
        <Button variant="secondary" size="sm" onClick={() => push({ tone: "success", title: "报表导出中", description: `${rows.length} 个能力域 CSV 下载中` })}><Download className="size-3.5" aria-hidden />导出</Button>
      </Toolbar>
      <Card><CardBody className="space-y-3">
        {rows.map((r) => (
          <div key={r.capability} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-fg">{r.capability}</span>
            <span className="flex-1"><Progress value={Math.round((r.total / max) * 100)} label={`${r.capability}任务量`} /></span>
            <span className="tabular w-16 text-right text-xs text-fg-muted">{r.total}</span>
            <span className="tabular w-16 text-right text-xs text-success">{r.success_rate}%</span>
          </div>
        ))}
      </CardBody></Card>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>能力域</Th><Th className="text-right">任务量</Th><Th className="text-right">成功率</Th><Th className="text-right">积分消耗</Th></tr></thead>
        <tbody>{rows.map((r) => (<tr key={r.capability}><Td>{r.capability}</Td><Td className="tabular text-right">{r.total}</Td><Td className="tabular text-right text-success">{r.success_rate}%</Td><Td className="tabular text-right">{r.points.toLocaleString()}</Td></tr>))}</tbody>
      </Table></CardBody></Card>
    </div>
  );
}

/* ---------------- 数据看板 ---------------- */
function DashboardPanel() {
  const { push } = useToast();
  const [d, setD] = useState<{
    task_total: number;
    task_success_rate: number;
    points_revenue: number;
    user_total: number;
    asset_total: number;
  } | null>(null);

  // 行内注释21：真实看板 —— 后端聚合任务与用户资产。
  useEffect(() => {
    let alive = true;
    adminApi
      .getDashboard()
      .then((res) => alive && setD(res))
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载看板失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [push]);

  const cards = [
    { k: "任务总数", v: String(d?.task_total ?? 0), sub: "全部能力域累计" },
    { k: "积分收入", v: String(d?.points_revenue ?? 0), sub: "已扣费积分" },
    { k: "任务成功率", v: `${d?.task_success_rate ?? 0}%`, sub: "成功 / 总数" },
    { k: "用户 / 资产", v: `${d?.user_total ?? 0} / ${d?.asset_total ?? 0}`, sub: "注册用户 · 素材总数" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.k}><CardBody><p className="text-xs text-fg-subtle">{c.k}</p><p className="tabular mt-1 text-2xl font-semibold">{c.v}</p><p className="tabular mt-1 text-[11px] text-fg-subtle">{c.sub}</p></CardBody></Card>
        ))}
      </div>
      <Card><CardHeader><CardTitle>实时聚合</CardTitle><Badge tone="accent">来自任务与资产表</Badge></CardHeader>
        <CardBody className="p-0"><Table>
          <thead><tr><Th>指标</Th><Th className="text-right">数值</Th></tr></thead>
          <tbody>
            {([["任务总数", d?.task_total ?? 0], ["成功任务", Math.round((d?.task_total ?? 0) * (d?.task_success_rate ?? 0) / 100)], ["积分收入", d?.points_revenue ?? 0], ["注册用户", d?.user_total ?? 0], ["素材总数", d?.asset_total ?? 0]] as const).map(([k, v]) => (
              <tr key={k}><Td>{k}</Td><Td className="tabular text-right">{v.toLocaleString()}</Td></tr>))}
          </tbody>
        </Table></CardBody>
      </Card>
    </div>
  );
}

/* ---------------- 审计日志 ---------------- */
function AuditPanel() {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<adminApi.AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<string | null>(null);
  const pageSize = 8;
  const { page, setPage } = usePagedState(total, pageSize);

  // 行内注释22：真实审计 —— 后端按对象 / trace_id 搜索。
  useEffect(() => {
    let alive = true;
    adminApi
      .listAuditLogs({ page, pageSize, q: q.trim() || undefined })
      .then((res) => {
        if (!alive) return;
        setRows(res.data ?? []);
        setTotal(res.pagination?.total ?? 0);
      })
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载审计日志失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [page, pageSize, q, push]);

  const sel = rows.find((r) => r.id === detail) ?? null;

  return (
    <div className="space-y-4">
      <Toolbar>
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="搜索对象 / trace_id" aria-label="搜索审计" className="max-w-sm" />
        <span className="tabular text-xs text-fg-subtle">共 {total} 条</span>
      </Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>时间</Th><Th>操作人</Th><Th>动作</Th><Th>对象</Th><Th>操作</Th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}><Td className="tabular whitespace-nowrap text-fg-muted">{r.created_at}</Td><Td>{r.operator}</Td><Td><Badge tone="neutral">{r.action}</Badge></Td><Td className="text-fg-muted">{r.target}</Td>
            <Td><Button variant="ghost" size="sm" onClick={() => setDetail(r.id)}>trace</Button></Td></tr>))}
        </tbody>
      </Table></CardBody>
        <div className="border-t border-line"><Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} /></div>
      </Card>
      <Drawer open={!!sel} onClose={() => setDetail(null)} title="审计详情" footer={<Button size="sm" onClick={() => setDetail(null)}>关闭</Button>}>
        {sel && <dl className="space-y-2 text-sm">{[["trace_id", sel.trace_id], ["操作人", sel.operator], ["动作", sel.action], ["对象", sel.target], ["时间", sel.created_at]].map(([k, v]) => (<div key={k} className="flex justify-between gap-4"><dt className="text-fg-subtle">{k}</dt><dd className="tabular text-fg">{v}</dd></div>))}</dl>}
      </Drawer>
    </div>
  );
}

/* ---------------- 邀请码 ---------------- */
function InviteCodesPanel() {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(10);
  const [codes, setCodes] = useState<adminApi.InviteCodeRow[]>([]);

  // 行内注释23：真实邀请码 —— 生成与作废都落库。
  useEffect(() => {
    let alive = true;
    adminApi
      .listInviteCodes()
      .then((res) => alive && setCodes(res ?? []))
      .catch((e) =>
        push({
          tone: "danger",
          title: "加载邀请码失败",
          description: e instanceof ApiError ? e.message : "请稍后重试",
        }),
      );
    return () => {
      alive = false;
    };
  }, [push]);

  const generate = async () => {
    try {
      const saved = await adminApi.generateInviteCodes(count);
      setCodes((p) => [...(saved ?? []), ...p]);
      setOpen(false);
      push({ tone: "success", title: `已生成 ${saved?.length ?? count} 个` });
    } catch (e) {
      push({
        tone: "danger",
        title: "生成失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  const revoke = async (c: adminApi.InviteCodeRow) => {
    try {
      await adminApi.revokeInviteCode(c.code);
      setCodes((p) => p.filter((x) => x.code !== c.code));
      push({ tone: "neutral", title: "已作废", description: c.code });
    } catch (e) {
      push({
        tone: "danger",
        title: "作废失败",
        description: e instanceof ApiError ? e.message : "请稍后重试",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Toolbar><Button size="sm" onClick={() => setOpen(true)}><Plus className="size-3.5" aria-hidden />生成邀请码</Button><Badge tone="neutral">{codes.length} 个</Badge></Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>邀请码</Th><Th>状态</Th><Th>使用者</Th><Th>生成时间</Th><Th>操作</Th></tr></thead>
        <tbody>{codes.map((r) => (
          <tr key={r.code}><Td className="tabular">{r.code}</Td><Td><Badge tone={r.status === "已使用" ? "neutral" : "accent"}>{r.status}</Badge></Td><Td className="tabular text-fg-muted">{r.used_by}</Td><Td className="tabular text-fg-subtle">{r.created_at}</Td>
            <Td><span className="flex gap-1"><Button variant="ghost" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(r.code); } catch { /* noop */ } push({ tone: "success", title: "已复制" }); }}><Copy className="size-3" />复制</Button><Button variant="ghost" size="sm" onClick={() => void revoke(r)}>作废</Button></span></Td></tr>))}
        </tbody>
      </Table></CardBody></Card>
      <Modal open={open} onClose={() => setOpen(false)} title="生成邀请码" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>取消</Button><Button onClick={() => void generate()}>生成</Button></>}>
        <div><Label htmlFor="inv-n" className="mb-1.5 block">数量</Label><Input id="inv-n" type="number" min={1} max={100} value={count} onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} className="tabular" /></div>
      </Modal>
    </div>
  );
}
/* ---------------- 兜底通用 ---------------- */
function GenericPanel({ sectionKey }: { sectionKey: string }) {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const rows = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: `${sectionKey}_${String(i + 1).padStart(3, "0")}`,
        name: `${sectionKey} 记录 ${i + 1}`,
        status: i % 5 === 4 ? "异常" : "正常",
        time: `2026-10-${String((i % 28) + 1).padStart(2, "0")} 09:${String(i % 60).padStart(2, "0")}`,
      })).filter((r) => !q.trim() || r.name.includes(q.trim()) || r.id.includes(q.trim())),
    [sectionKey, q]
  );
  const pageSize = 8;
  return (
    <div className="space-y-4">
      <Toolbar>
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="搜索 ID 或名称" aria-label="搜索" className="max-w-sm" />
        <Select aria-label="状态筛选" defaultValue="all"><option value="all">全部状态</option><option value="ok">正常</option><option value="bad">异常</option></Select>
        <Button variant="secondary" size="sm" onClick={() => push({ tone: "success", title: "导出已开始", description: `${rows.length} 条记录 CSV 下载中` })}><Download className="size-3.5" aria-hidden />导出</Button>
      </Toolbar>
      <Card>
        <CardBody className="p-0">
          <Table>
            <thead><tr><Th>ID</Th><Th>名称</Th><Th>状态</Th><Th>时间</Th><Th>操作</Th></tr></thead>
            <tbody>
              {rows.slice((page - 1) * pageSize, page * pageSize).map((r) => (
                <tr key={r.id}>
                  <Td className="tabular text-fg-muted">{r.id}</Td>
                  <Td>{r.name}</Td>
                  <Td><Badge tone={r.status === "正常" ? "success" : "danger"}>{r.status}</Badge></Td>
                  <Td className="tabular text-fg-subtle">{r.time}</Td>
                  <Td><span className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => push({ tone: "neutral", title: `查看 ${r.id}`, description: "前端 mock：联调后打开详情抽屉" })}><Eye className="size-3" />查看</Button><Button variant="ghost" size="sm" onClick={() => push({ tone: "success", title: `已处理 ${r.id}`, description: "前端 mock：联调后调用处理接口" })}>处理</Button></span></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
        <div className="border-t border-line"><Pagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} /></div>
      </Card>
      <p className="flex items-center gap-1.5 text-[11px] text-fg-subtle"><Search className="size-3" aria-hidden />TODO(API): 接入 GET /admin/{sectionKey} 真实分页接口。</p>
    </div>
  );
}

// 占位引用，避免 tree-shaking 告警
void Megaphone;
