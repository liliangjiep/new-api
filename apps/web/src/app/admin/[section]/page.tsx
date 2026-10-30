"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/layout/StudioShell";
import { Button, Input, Label, Select, Textarea, Switch } from "@/components/ui/primitives";
import { Card, CardBody, CardHeader, CardTitle, Badge, Table, Th, Td, EmptyState, Pagination, Tabs, Progress } from "@/components/ui/surfaces";
import { Modal, Drawer } from "@/components/ui/overlays";
import { useToast } from "@/components/features/ToastHost";
import { ADMIN_SECTIONS, VIDEO_SKILLS, VIDEO_SKILL_CATEGORIES, IMAGE_SKILLS } from "@/lib/domain";
import { ArrowLeft, FlaskConical, Pause, Play, Copy, RotateCcw, Search, Plus, CheckCircle2, XCircle, Download, Megaphone, Ban, Eye, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

// M1-29~M1-45 运营后台 20 分组页：每个分组专属交互，通用表格只做兜底
// 行内注释1：动态路由 [section] 按 ADMIN_SECTIONS.key 匹配，未命中显示空态
// 行内注释2：写操作全部记审计（mock push toast + 留痕行），改价/切通道需二次确认（Modal）
// TODO(API): 全部表格接入 GET /admin/{section} 真实分页接口
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

function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

/* ---------------- 用户管理 ---------------- */
function UsersPanel() {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("全部");
  const [users, setUsers] = useState([
    { id: "u_1001", nick: "张工", phone: "138****1234", role: "企业", balance: 2480, st: "正常", t: "2026-09-12" },
    { id: "u_1002", nick: "李厂长", phone: "139****5566", role: "个人", balance: 120, st: "正常", t: "2026-10-02" },
    { id: "u_1003", nick: "刷单号", phone: "150****7788", role: "个人", balance: 0, st: "封禁", t: "2026-10-28" },
    { id: "u_1004", nick: "王设计", phone: "136****9900", role: "工作室", balance: 5320, st: "正常", t: "2026-10-29" },
  ]);
  const [detail, setDetail] = useState<string | null>(null);
  const rows = users.filter((u) => (status === "全部" || u.st === status) && (!q.trim() || u.nick.includes(q.trim()) || u.id.includes(q.trim())));
  const { page, setPage, total, paged, pageSize } = usePaged(rows);
  const sel = users.find((u) => u.id === detail) ?? null;
  return (
    <div className="space-y-4">
      <Toolbar>
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="搜索昵称 / ID" aria-label="搜索用户" className="max-w-sm" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="状态筛选"><option>全部</option><option>正常</option><option>封禁</option></Select>
        <span className="tabular text-xs text-fg-subtle">共 {rows.length} 人</span>
      </Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>ID</Th><Th>昵称</Th><Th>手机</Th><Th>类型</Th><Th className="text-right">余额</Th><Th>状态</Th><Th>注册</Th><Th>操作</Th></tr></thead>
        <tbody>{paged.map((u) => (
          <tr key={u.id}>
            <Td className="tabular text-fg-muted">{u.id}</Td><Td>{u.nick}</Td><Td className="tabular text-fg-subtle">{u.phone}</Td><Td className="text-fg-muted">{u.role}</Td>
            <Td className="tabular text-right">{u.balance.toLocaleString()}</Td>
            <Td><Badge tone={u.st === "正常" ? "success" : "danger"}>{u.st}</Badge></Td>
            <Td className="tabular text-fg-subtle">{u.t}</Td>
            <Td><span className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setDetail(u.id)}><Eye className="size-3" />详情</Button>
              <Button variant="ghost" size="sm" onClick={() => { setUsers((p) => p.map((x) => x.id === u.id ? { ...x, st: x.st === "正常" ? "封禁" : "正常" } : x)); push({ tone: "neutral", title: u.st === "正常" ? "已封禁" : "已解封", description: u.nick }); }}>{u.st === "正常" ? <><Ban className="size-3" />封禁</> : "解封"}</Button>
              <Button variant="ghost" size="sm" onClick={() => push({ tone: "neutral", title: "已强制下线", description: `${u.nick} 的全部会话已失效` })}>下线</Button>
            </span></Td>
          </tr>))}
        </tbody>
      </Table></CardBody>
        <div className="border-t border-line"><Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} /></div>
      </Card>
      <Drawer open={!!sel} onClose={() => setDetail(null)} title={sel ? `${sel.nick} · ${sel.id}` : ""} footer={<Button size="sm" onClick={() => setDetail(null)}>关闭</Button>}>
        {sel && <dl className="space-y-2 text-sm">{[["余额", `${sel.balance} 积分`], ["类型", sel.role], ["手机", sel.phone], ["状态", sel.st], ["最近消费", "厂家介绍视频 · 320积分 · 10-30"], ["审计", "3 次改价，0 次违规"]].map(([k, v]) => (<div key={k} className="flex justify-between gap-4"><dt className="text-fg-subtle">{k}</dt><dd className="text-fg">{v}</dd></div>))}</dl>}
      </Drawer>
      <p className="text-[11px] text-fg-subtle">TODO(API): 接入 GET /admin/users 与 POST /admin/users/{`{id}`}/ban。</p>
    </div>
  );
}

/* ---------------- 内容审核 ---------------- */
function ReviewPanel() {
  const { push } = useToast();
  const [tab, setTab] = useState("pending");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("涉敏感水印");
  const [items, setItems] = useState([
    { id: "gen_01", title: "美妆主图 · 2K", user: "张工", st: "pending", thumb: "/images/toapi/result-1.png" },
    { id: "gen_02", title: "口播视频 · 30秒", user: "王设计", st: "pending", thumb: "/images/toapi/result-3.png" },
    { id: "gen_03", title: "展厅效果图", user: "李厂长", st: "approved", thumb: "/images/toapi/result-5.png" },
    { id: "gen_04", title: "水印擦除测试", user: "刷单号", st: "rejected", thumb: "/images/toapi/result-2.png" },
  ]);
  const rows = items.filter((i) => i.st === tab);
  const act = (id: string, st: "approved" | "rejected") => {
    setItems((p) => p.map((x) => x.id === id ? { ...x, st } : x));
    push({ tone: st === "approved" ? "success" : "danger", title: st === "approved" ? "已通过" : "已驳回", description: id });
    setRejecting(null);
  };
  return (
    <div className="space-y-4">
      <Tabs items={[{ id: "pending", label: "待审核", count: items.filter((i) => i.st === "pending").length }, { id: "approved", label: "已通过", count: items.filter((i) => i.st === "approved").length }, { id: "rejected", label: "已驳回", count: items.filter((i) => i.st === "rejected").length }]} value={tab} onChange={setTab} />
      {rows.length === 0 ? <Card><CardBody><EmptyState title="暂无内容" description="该状态下没有待处理项" /></CardBody></Card> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.id}><CardBody className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}<img src={r.thumb} alt={r.title} className="aspect-video w-full rounded-xs border border-line object-cover" />
              <p className="text-sm text-fg">{r.title}</p>
              <p className="tabular text-[11px] text-fg-subtle">{r.id} · {r.user}</p>
              {r.st === "pending" && <div className="flex gap-2"><Button size="sm" className="flex-1" onClick={() => act(r.id, "approved")}><CheckCircle2 className="size-3.5" aria-hidden />通过</Button><Button variant="secondary" size="sm" className="flex-1" onClick={() => setRejecting(r.id)}><XCircle className="size-3.5" aria-hidden />驳回</Button></div>}
            </CardBody></Card>
          ))}
        </div>
      )}
      {tab === "pending" && rows.length > 0 && <Button variant="secondary" size="sm" onClick={() => { setItems((p) => p.map((x) => x.st === "pending" ? { ...x, st: "approved" as const } : x)); push({ tone: "success", title: "批量通过完成" }); }}>一键全部通过</Button>}
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="驳回原因" description="将通知用户并记录审计" footer={<><Button variant="secondary" onClick={() => setRejecting(null)}>取消</Button><Button onClick={() => rejecting && act(rejecting, "rejected")}>确认驳回</Button></>}>
        <div><Label htmlFor="rej" className="mb-1.5 block">原因</Label><Select id="rej" value={reason} onChange={(e) => setReason(e.target.value)}><option>涉敏感水印</option><option>涉人物侵权</option><option>低质/黑图</option><option>其他</option></Select></div>
      </Modal>
    </div>
  );
}

/* ---------------- 计费与充值 ---------------- */
function BillingPanel() {
  const { push } = useToast();
  const [pkgs, setPkgs] = useState([
    { code: "trial", name: "体验包", amount: 99, credits: 100, bonus: 0, on: true },
    { code: "standard", name: "标准包", amount: 500, credits: 520, bonus: 4, on: true },
    { code: "advanced", name: "进阶包", amount: 2000, credits: 2120, bonus: 6, on: true },
  ]);  const [adjustOpen, setAdjustOpen] = useState(false);  const [adjustUid, setAdjustUid] = useState("");
  const [adjustAmt, setAdjustAmt] = useState("100");
  const [adjustType, setAdjustType] = useState("补发");
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>充值套餐配置</CardTitle><Button variant="secondary" size="sm" onClick={() => { setPkgs((p) => [...p, { code: `pkg_${Date.now().toString().slice(-4)}`, name: `新套餐 ${p.length + 1}`, amount: 200, credits: 200, bonus: 0, on: false }]); push({ tone: "success", title: "套餐已创建", description: "前端 mock：联调后调用 POST /admin/packages" }); }}><Plus className="size-3.5" aria-hidden />新增套餐</Button></CardHeader>
        <CardBody className="p-0"><Table>
          <thead><tr><Th>套餐</Th><Th className="text-right">金额</Th><Th className="text-right">积分</Th><Th className="text-right">赠送%</Th><Th>上架</Th><Th>操作</Th></tr></thead>
          <tbody>{pkgs.map((p, i) => (
            <tr key={p.code}>
              <Td>{p.name}</Td>
              <Td className="tabular text-right">¥{p.amount}</Td>
              <Td className="tabular text-right">{p.credits}</Td>
              <Td className="tabular text-right">{p.bonus}%</Td>
              <Td><Switch checked={p.on} onCheckedChange={(v) => setPkgs((prev) => prev.map((x, j) => j === i ? { ...x, on: v } : x))} label={`${p.name}上架`} /></Td>
              <Td><span className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => push({ tone: "neutral", title: `编辑${p.name}`, description: "前端 mock：联调后打开套餐编辑抽屉" })}>编辑</Button><Button variant="ghost" size="sm" onClick={() => push({ tone: "success", title: "已保存", description: p.name })}>保存</Button></span></Td>
            </tr>))}
          </tbody>
        </Table></CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>积分补发 / 扣减</CardTitle><Button variant="secondary" size="sm" onClick={() => setAdjustOpen(true)}>新建调整</Button></CardHeader>
        <CardBody><p className="text-xs text-fg-subtle">所有调整记审计日志，需填写理由；大额（≥1000）需二次确认。TODO(API): POST /admin/credits/adjust。</p></CardBody>
      </Card>
      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title="积分调整" description="补发/扣减即时生效" footer={<><Button variant="secondary" onClick={() => setAdjustOpen(false)}>取消</Button><Button onClick={() => { setAdjustOpen(false); push({ tone: "success", title: `${adjustType}成功`, description: `${adjustUid || "u_1001"} ${adjustType}${adjustAmt}积分` }); }}>确认</Button></>}>
        <div className="space-y-3">
          <div><Label htmlFor="adj-uid" className="mb-1.5 block">用户 ID</Label><Input id="adj-uid" value={adjustUid} onChange={(e) => setAdjustUid(e.target.value)} placeholder="u_1001" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="mb-1.5 block">类型</Label><div className="flex gap-1.5">{["补发", "扣减"].map((t) => (<button key={t} type="button" onClick={() => setAdjustType(t)} aria-pressed={adjustType === t} className={cn("flex-1 rounded-xs border px-2 py-2 text-xs", adjustType === t ? "border-accent bg-accent-soft/40 text-fg" : "border-line bg-surface-2 text-fg-muted")}>{t}</button>))}</div></div>
            <div><Label htmlFor="adj-amt" className="mb-1.5 block">积分</Label><Input id="adj-amt" type="number" value={adjustAmt} onChange={(e) => setAdjustAmt(e.target.value)} className="tabular" /></div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- 积分流水（运营视角） ---------------- */
function LedgerAdminPanel() {
  const { push } = useToast();
  const [type, setType] = useState("全部");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const rows = useMemo(() => [
    { id: "led_01", user: "u_1001", type: "充值", amt: 520, bal: 2480, t: "2026-10-28 14:22", note: "标准包" },
    { id: "led_02", user: "u_1001", type: "消耗", amt: -45, bal: 1960, t: "2026-10-29 20:33", note: "商详套图" },
    { id: "led_03", user: "u_1004", type: "消耗", amt: -320, bal: 5320, t: "2026-10-30 09:04", note: "厂家视频" },
    { id: "led_04", user: "u_1001", type: "赠送", amt: 40, bal: 2325, t: "2026-10-28 14:22", note: "标准包赠送" },
    { id: "led_05", user: "u_1002", type: "退回", amt: 8, bal: 120, t: "2026-10-29 22:17", note: "擦除失败" },
    { id: "led_06", user: "u_1002", type: "冻结", amt: -80, bal: 40, t: "2026-10-30 08:40", note: "口播冻结" },
  ].filter((l) => (type === "全部" || l.type === type) && (!q.trim() || l.user.includes(q.trim()) || l.note.includes(q.trim()))), [type, q]);
  const pageSize = 8;
  return (
    <div className="space-y-4">
      <Toolbar>
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="搜索用户 / 说明" aria-label="搜索流水" className="max-w-sm" />
        <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="类型"><option>全部</option><option>充值</option><option>消耗</option><option>退回</option><option>赠送</option><option>冻结</option></Select>
        <Button variant="secondary" size="sm" onClick={() => push({ tone: "success", title: "导出已开始", description: `${rows.length} 条流水 CSV 下载中` })}><Download className="size-3.5" aria-hidden />导出</Button>
        <Badge tone="neutral">不可变 · 冻结/结算/退回三段式</Badge>
      </Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>时间</Th><Th>用户</Th><Th>类型</Th><Th>说明</Th><Th className="text-right">变动</Th><Th className="text-right">余额</Th></tr></thead>
        <tbody>{rows.slice((page - 1) * pageSize, page * pageSize).map((l) => (
          <tr key={l.id}><Td className="tabular whitespace-nowrap text-fg-muted">{l.t}</Td><Td className="tabular">{l.user}</Td>
            <Td><Badge tone={l.amt > 0 ? "success" : l.type === "退回" ? "info" : l.type === "冻结" ? "warning" : "neutral"}>{l.type}</Badge></Td>
            <Td className="text-fg-muted">{l.note}</Td><Td className={cn("tabular text-right", l.amt > 0 ? "text-success" : "text-fg")}>{l.amt > 0 ? `+${l.amt}` : l.amt}</Td>
            <Td className="tabular text-right text-fg-muted">{l.bal.toLocaleString()}</Td></tr>))}
        </tbody>
      </Table></CardBody>
        <div className="border-t border-line"><Pagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} /></div>
      </Card>
    </div>
  );
}

/* ---------------- 技能包管理 ---------------- */
function PackagesPanel() {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [skills, setSkills] = useState(IMAGE_SKILLS.map((s, i) => ({ ...s, ver: `v1.${i}`, on: true })));
  const rows = skills.filter((s) => !q.trim() || s.label.includes(q.trim()));
  return (
    <div className="space-y-4">
      <Toolbar>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索技能包" aria-label="搜索技能包" className="max-w-sm" />
        <Button variant="secondary" size="sm" onClick={() => { setSkills((p) => [...p, { key: `custom_${Date.now()}`, label: `新技能包 ${p.length + 1}`, description: "自定义技能包（前端 mock）", promptTemplate: "Photorealistic photograph, {user}, natural imperfections, realistic textures, soft natural light, subtle film grain. No watermark, no text.", ver: "v1.0", on: false }]); push({ tone: "success", title: "技能包已创建" }); }}><Plus className="size-3.5" aria-hidden />新建技能包</Button>
        <span className="tabular text-xs text-fg-subtle">{rows.length} 个</span>
      </Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>技能包</Th><Th>说明</Th><Th>版本</Th><Th>启用</Th><Th>操作</Th></tr></thead>
        <tbody>{rows.map((s, i) => (
          <tr key={s.key}><Td>{s.label}</Td><Td className="text-fg-muted">{s.description}</Td><Td className="tabular text-fg-subtle">{s.ver}</Td>
            <Td><Switch checked={s.on} onCheckedChange={(v) => setSkills((p) => p.map((x, j) => j === i ? { ...x, on: v } : x))} label={`${s.label}启用`} /></Td>
            <Td><span className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => push({ tone: "neutral", title: `编辑${s.label}`, description: "前端 mock：联调后打开技能包编辑抽屉" })}>编辑</Button><Button variant="ghost" size="sm" onClick={() => push({ tone: "success", title: "已发布新版本", description: s.label })}>发布</Button></span></Td>
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
  const [on, setOn] = useState<Set<string>>(new Set(VIDEO_SKILLS.map((s) => s.key)));
  const rows = VIDEO_SKILLS.filter((s) => (cat === "全部" || s.category === cat) && (!q.trim() || s.label.includes(q.trim())));
  const toggle = (k: string) => setOn((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <div className="space-y-4">
      <Toolbar>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="分类"><option>全部</option>{VIDEO_SKILL_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索 19 套技能包" aria-label="搜索视频技能" className="max-w-sm" />
        <span className="tabular text-xs text-fg-subtle">{rows.length} 套 · 已启用 {rows.filter((r) => on.has(r.key)).length}</span>
      </Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>技能包</Th><Th>分类</Th><Th>槽位</Th><Th>启用</Th><Th>操作</Th></tr></thead>
        <tbody>{rows.map((s) => (
          <tr key={s.key}><Td>{s.label}</Td><Td className="text-fg-muted">{VIDEO_SKILL_CATEGORIES.find((c) => c.key === s.category)?.label}</Td>
            <Td className="tabular text-fg-subtle">{s.refSlots.images}/{s.refSlots.videos}/{s.refSlots.audios}</Td>
            <Td><Switch checked={on.has(s.key)} onCheckedChange={() => toggle(s.key)} label={s.label} /></Td>
            <Td><Button variant="ghost" size="sm" onClick={() => push({ tone: "neutral", title: `选项组 · ${s.label}`, description: "前端 mock：联调后打开 option_groups JSON 编辑器" })}>选项组</Button></Td></tr>))}
        </tbody>
      </Table></CardBody></Card>
      <p className="text-[11px] text-fg-subtle">TODO(API): 接入 GET /admin/video-skills（含 option_groups JSON）。</p>
    </div>
  );
}

/* ---------------- 运营公告 ---------------- */
function AnnouncementsPanel() {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [items, setItems] = useState([
    { id: "a1", t: "Seedance 2.0 已上线", top: true, range: "10-28 ~ 11-28", st: "已发布" },
    { id: "a2", t: "国庆充值赠送活动", top: false, range: "10-01 ~ 10-07", st: "已下线" },
  ]);
  return (
    <div className="space-y-4">
      <Toolbar><Button size="sm" onClick={() => setOpen(true)}><Plus className="size-3.5" aria-hidden />新建公告</Button><Badge tone="neutral">{items.length} 条</Badge></Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>标题</Th><Th>有效期</Th><Th>置顶</Th><Th>状态</Th><Th>操作</Th></tr></thead>
        <tbody>{items.map((a, i) => (
          <tr key={a.id}><Td>{a.t}</Td><Td className="tabular text-fg-subtle">{a.range}</Td>
            <Td><Switch checked={a.top} onCheckedChange={(v) => setItems((p) => p.map((x, j) => j === i ? { ...x, top: v } : x))} label="置顶" /></Td>
            <Td><Badge tone={a.st === "已发布" ? "success" : "neutral"}>{a.st}</Badge></Td>
            <Td><span className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => { setItems((p) => p.map((x, j) => j === i ? { ...x, st: x.st === "已发布" ? "已下线" : "已发布" } : x)); }}>{a.st === "已发布" ? "下线" : "发布"}</Button>
              <Button variant="ghost" size="sm" onClick={() => { setItems((p) => p.filter((x) => x.id !== a.id)); push({ tone: "neutral", title: "已删除" }); }}>删除</Button>
            </span></Td></tr>))}
        </tbody>
      </Table></CardBody></Card>
      <Modal open={open} onClose={() => setOpen(false)} title="新建公告" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>取消</Button><Button disabled={!title.trim()} onClick={() => { setItems((p) => [...p, { id: `a${Date.now()}`, t: title.trim(), top: false, range: "长期", st: "已发布" }]); setOpen(false); setTitle(""); setBody(""); push({ tone: "success", title: "公告已发布" }); }}>发布</Button></>}>
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
  const [assets] = useState([
    { id: "pub_01", n: "展厅空镜-01", scope: "全员", thumb: "/images/toapi/asset-1.png" },
    { id: "pub_02", n: "口红质地-雾面", scope: "美妆行业", thumb: "/images/toapi/asset-2.png" },
    { id: "pub_03", n: "口播 BGM-轻", scope: "全员", thumb: "/images/toapi/asset-3.png" },
  ]);
  const rows = assets.filter((a) => scope === "全部" || a.scope === scope);
  return (
    <div className="space-y-4">
      <Toolbar>
        <Select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="授权范围"><option>全部</option><option>全员</option><option>美妆行业</option></Select>
        <Button variant="secondary" size="sm" onClick={() => push({ tone: "success", title: "上传已开始", description: "前端 mock：联调后调用对象存储直传" })}><Plus className="size-3.5" aria-hidden />上传公共素材</Button>
        <Button variant="ghost" size="sm" onClick={() => push({ tone: "success", title: "授权已更新" })}>批量设范围</Button>
      </Toolbar>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((a) => (
          <Card key={a.id}><CardBody className="p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}<img src={a.thumb} alt={a.n} className="aspect-[4/3] w-full rounded-xs object-cover" />
            <p className="mt-2 truncate text-xs text-fg">{a.n}</p>
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
  const [channels, setChannels] = useState([
    { id: "ch_relay_a", name: "relay-a", provider: "relay", status: "active", caps: "image,video", rpm: 600, ratio: 0.85, balance: "¥12,400" },
    { id: "ch_official", name: "official-volc", provider: "official", status: "active", caps: "image,video,lipsync", rpm: 300, ratio: 1.0, balance: "—" },
  ]);
  const [rows, setRows] = useState([
    { key: "image.text2image.2k", display: "LC Image 2.5 Pro", channel: "official-volc", base: "https://open.volcengineapi.com/v1", upstream: "lc-image-2.5-pro", enabled: true, order: 10 },
    { key: "video.t2v.720p", display: "Seedance 2.0", channel: "relay-a", base: "https://api.relay-a.example/v1", upstream: "seedance-2-0", enabled: true, order: 10 },
    { key: "video.t2v.720p", display: "Seedance 2.0（兜底）", channel: "official-volc", base: "https://open.volcengineapi.com/v1", upstream: "doubao-seedance-2-0", enabled: true, order: 20 },
  ]);
  const [probing, setProbing] = useState<string | null>(null);
  const [confirmCut, setConfirmCut] = useState<number | null>(null);
  const probe = (key: string) => { setProbing(key + Math.random()); setTimeout(() => { setProbing(null); push({ tone: "success", title: "探测通过", description: `${key} · 210ms · 模型标识一致` }); }, 1200); };
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>通道列表（{channels.length}）</CardTitle><Button variant="secondary" size="sm" onClick={() => { setChannels((p) => [...p, { id: `ch_${Date.now().toString().slice(-4)}`, name: `relay-${p.length + 1}`, provider: "relay", status: "suspended", caps: "image,video", rpm: 600, ratio: 1.0, balance: "¥0" }]); push({ tone: "success", title: "通道已创建", description: "先做连通探测再启用" }); }}><Plus className="size-3.5" aria-hidden />新建通道</Button></CardHeader>
        <CardBody className="p-0"><Table>
          <thead><tr><Th>通道</Th><Th>类型</Th><Th>状态</Th><Th>能力域</Th><Th>RPM</Th><Th>成本系数</Th><Th>余额</Th><Th>操作</Th></tr></thead>
          <tbody>{channels.map((c, i) => (
            <tr key={c.id}>
              <Td className="tabular">{c.name}</Td>
              <Td><Badge tone={c.provider === "relay" ? "info" : "neutral"}>{c.provider === "relay" ? "中转" : "官方"}</Badge></Td>
              <Td><Badge tone={c.status === "active" ? "success" : "warning"}>{c.status}</Badge></Td>
              <Td className="tabular text-fg-muted">{c.caps}</Td><Td className="tabular">{c.rpm}</Td><Td className="tabular">{c.ratio}</Td><Td className="tabular">{c.balance}</Td>
              <Td><span className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => push({ tone: "neutral", title: `编辑通道 ${c.name}`, description: "前端 mock：联调后打开通道编辑抽屉" })}>编辑</Button><Button variant="ghost" size="sm" onClick={() => probe(c.id)}>测试</Button><Button variant="ghost" size="sm" onClick={() => setChannels((p) => p.map((x, j) => j === i ? { ...x, status: x.status === "active" ? "suspended" : "active" } : x))}>{c.status === "active" ? "熔断" : "恢复"}</Button></span></Td>
            </tr>))}
          </tbody>
        </Table></CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>接入点（按能力域分组）</CardTitle><span className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => push({ tone: "success", title: "批量切通道已提交", description: "30s 内生效，审计已记录" })}>批量切通道</Button><Button variant="secondary" size="sm" onClick={() => { setRows((p) => [...p, { key: "image.text2image.2k", display: `新接入点 ${p.length + 1}`, channel: "relay-a", base: "https://api.relay.example/v1", upstream: "new-model", enabled: false, order: 30 }]); push({ tone: "success", title: "接入点已创建" }); }}><Plus className="size-3.5" aria-hidden />新建接入点</Button></span></CardHeader>
        <CardBody className="p-0"><Table>
          <thead><tr><Th>模型键</Th><Th>展示名</Th><Th>通道</Th><Th>base_url</Th><Th>上游模型</Th><Th>降级序</Th><Th>启用</Th><Th>操作</Th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={`${r.key}-${i}`}>
              <Td className="tabular text-fg-muted">{r.key}</Td><Td>{r.display}</Td><Td className="tabular">{r.channel}</Td>
              <Td className="tabular max-w-52 truncate text-fg-muted" title={r.base}>{r.base}</Td><Td className="tabular text-fg-muted">{r.upstream}</Td><Td className="tabular">{r.order}</Td>
              <Td><Badge tone={r.enabled ? "success" : "neutral"}>{r.enabled ? "启用" : "停用"}</Badge></Td>
              <Td><span className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => probe(r.key)}><FlaskConical className="size-3" />{probing ? "探测中" : "探测"}</Button>
                <Button variant="ghost" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(`${r.key} → ${r.upstream}`); } catch { /* noop */ } push({ tone: "success", title: "已复制" }); }}><Copy className="size-3" />复制</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmCut(i)}>{r.enabled ? <><Pause className="size-3" />停用</> : <><Play className="size-3" />启用</>}</Button>
              </span></Td>
            </tr>))}
          </tbody>
        </Table></CardBody>
      </Card>
      <Card><CardHeader><CardTitle>变更留痕</CardTitle></CardHeader><CardBody><p className="text-xs leading-relaxed text-fg-subtle">2026-10-30 09:12 管理员将 video.t2v.720p 主通道从 relay-a 切到 official-volc（对账差异 0.8% 触发）。TODO(API): 接入 /admin/endpoint-changes。</p></CardBody></Card>
      <Modal open={confirmCut !== null} onClose={() => setConfirmCut(null)} title="二次确认" description="切通道影响线上流量，需二次确认" footer={<><Button variant="secondary" onClick={() => setConfirmCut(null)}>取消</Button><Button onClick={() => { if (confirmCut !== null) setRows((p) => p.map((x, j) => j === confirmCut ? { ...x, enabled: !x.enabled } : x)); setConfirmCut(null); push({ tone: "success", title: "已切换", description: "审计已记录" }); }}>确认切换</Button></>}>
        <p className="text-sm text-fg-muted">切换后 30s 内生效，失败自动回滚。</p>
      </Modal>
    </div>
  );
}

/* ---------------- 接入点管理 ---------------- */
function EndpointsPanel() {
  const { push } = useToast();
  const [rows, setRows] = useState([
    { key: "image.text2image.2k", upstream: "lc-image-2.5-pro", channel: "official-volc", timeout: 60, order: 10, on: true },
    { key: "video.t2v.720p", upstream: "seedance-2-0", channel: "relay-a", timeout: 300, order: 10, on: true },
    { key: "lipsync.volc.1min", upstream: "volc-lipsync-v1", channel: "official-volc", timeout: 300, order: 10, on: true },
  ]);
  return (
    <div className="space-y-4">
      <Toolbar><span className="text-xs text-fg-subtle">模型键 → 上游模型名映射，order 越小优先级越高</span><Button variant="secondary" size="sm" onClick={() => push({ tone: "success", title: "已保存", description: "超时与降级序已生效" })}>保存全部</Button></Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>模型键</Th><Th>上游模型</Th><Th>通道</Th><Th>超时(s)</Th><Th>降级序</Th><Th>启用</Th></tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={r.key}>
            <Td className="tabular">{r.key}</Td>
            <Td><Input defaultValue={r.upstream} aria-label={`${r.key}上游模型`} className="tabular min-w-40" /></Td>
            <Td><Select defaultValue={r.channel} aria-label="通道"><option value="relay-a">relay-a</option><option value="official-volc">official-volc</option></Select></Td>
            <Td><Input defaultValue={r.timeout} type="number" className="tabular w-20" aria-label="超时" /></Td>
            <Td><span className="flex items-center gap-1"><Button variant="ghost" size="icon-sm" aria-label="上移" onClick={() => setRows((p) => { const n = [...p]; if (i > 0) [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}>↑</Button><span className="tabular">{r.order}</span><Button variant="ghost" size="icon-sm" aria-label="下移" onClick={() => setRows((p) => { const n = [...p]; if (i < n.length - 1) [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; })}>↓</Button></span></Td>
            <Td><Switch checked={r.on} onCheckedChange={(v) => setRows((p) => p.map((x, j) => j === i ? { ...x, on: v } : x))} label={r.key} /></Td>
          </tr>))}
        </tbody>
      </Table></CardBody></Card>
    </div>
  );
}

/* ---------------- 售价积分 ---------------- */
function PricingPanel() {
  const { push } = useToast();
  const [rows, setRows] = useState([
    { key: "video.t2v.720p", spec: "720P 5秒", points: 14, cost: 8.2 },
    { key: "image.t2i.2k", spec: "2K", points: 4, cost: 1.7 },
    { key: "stone.effect.2k", spec: "石材 2K", points: 8, cost: 1.4 },
  ]);
  const [log, setLog] = useState([{ t: "10-30 09:12", d: "video.t2v.720p 12→14（理由：上游涨价）", by: "管理员" }]);
  const margin = (p: number, c: number) => ((p - c) / p) * 100;
  const save = (i: number, v: number) => {
    const r = rows[i];
    if (v < r.cost) { push({ tone: "danger", title: "低于成本，禁止保存", description: `${r.key} 成本 ¥${r.cost}` }); return; }
    setRows((p) => p.map((x, j) => j === i ? { ...x, points: v } : x));
    setLog((p) => [{ t: "刚刚", d: `${r.key} ${r.points}→${v}`, by: "管理员" }, ...p]);
    push({ tone: "success", title: "改价已生效", description: `${r.key} → ${v}积分（≤30s 生效）` });
  };
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>售价积分（含实时毛利率）</CardTitle><Badge tone="accent">改价 ≤30s 生效</Badge></CardHeader>
        <CardBody className="p-0"><Table>
          <thead><tr><Th>模型键</Th><Th>规格</Th><Th>售价积分</Th><Th>当前成本</Th><Th>毛利率</Th><Th>操作</Th></tr></thead>
          <tbody>{rows.map((r, i) => {
            const m = margin(r.points, r.cost);
            return (
              <tr key={r.key}>
                <Td className="tabular">{r.key}</Td><Td className="tabular">{r.spec}</Td>
                <Td><Input defaultValue={r.points} id={`price-${r.key}`} type="number" className="tabular w-24" aria-label={`${r.key} 售价`} /></Td>
                <Td className="tabular">¥{r.cost}</Td>
                <Td className={cn("tabular", m >= 50 ? "text-success" : m >= 0 ? "text-warning" : "text-danger")}>{m.toFixed(1)}%</Td>
                <Td><span className="flex gap-1">
                  <Button variant="secondary" size="sm" onClick={() => { const el = document.getElementById(`price-${r.key}`) as HTMLInputElement | null; save(i, Number(el?.value || r.points)); }}>保存</Button>
                  <Button variant="ghost" size="sm" onClick={() => push({ tone: "neutral", title: "已回滚到上一版" })}><RotateCcw className="size-3" />回滚</Button>
                </span></Td>
              </tr>);
          })}</tbody>
        </Table></CardBody>
      </Card>
      <Card><CardHeader><CardTitle>改价审计</CardTitle><Badge tone="neutral">{log.length}</Badge></CardHeader>
        <CardBody className="space-y-2">{log.map((l, i) => (<p key={i} className="tabular text-xs text-fg-muted">{l.t} · {l.d} · {l.by}</p>))}</CardBody>
      </Card>
    </div>
  );
}

/* ---------------- 通道余额 ---------------- */
function ChannelsPanel() {
  const { push } = useToast();
  const [rows] = useState([
    { name: "relay-a", bal: 12400, warn: 5000, crit: 2000, pct: 82 },
    { name: "relay-b", bal: 3200, warn: 5000, crit: 2000, pct: 32 },
    { name: "official-volc", bal: 0, warn: 0, crit: 0, pct: 100 },
  ]);
  const tone = (pct: number) => pct > 50 ? "success" : pct > 20 ? "warning" : "danger";
  return (
    <div className="space-y-4">
      <Toolbar><Button variant="secondary" size="sm" onClick={() => push({ tone: "success", title: "巡检完成", description: "3 条通道余额正常，relay-b 低于预警线" })}><RefreshCw className="size-3.5" aria-hidden />立即巡检</Button><span className="text-xs text-fg-subtle">上次巡检 10:00 · 每 15 分钟自动巡检</span></Toolbar>
      <div className="grid gap-3 md:grid-cols-3">
        {rows.map((r) => (
          <Card key={r.name}><CardBody className="space-y-2">
            <p className="flex items-center justify-between"><span className="tabular text-sm text-fg">{r.name}</span><Badge tone={tone(r.pct)}>{r.pct > 50 ? "正常" : r.pct > 20 ? "预警" : "紧急"}</Badge></p>
            <p className="tabular text-2xl font-semibold">¥{r.bal.toLocaleString()}</p>
            <Progress value={r.pct} label={`${r.name}余额`} />
            <p className="tabular text-[11px] text-fg-subtle">预警 ¥{r.warn} · 紧急 ¥{r.crit}</p>
          </CardBody></Card>
        ))}
      </div>
      <p className="text-[11px] text-fg-subtle">TODO(API): 接入 /admin/channels/balances 与三级告警推送。</p>
    </div>
  );
}

/* ---------------- 渠道对账 ---------------- */
function BillsPanel() {
  const { push } = useToast();
  const [day, setDay] = useState("2026-10-29");
  const rows = [
    { ch: "relay-a", up: 18240, pf: 18240, diff: 0, amt: "¥6,980" },
    { ch: "official-volc", up: 4210, pf: 4198, diff: -12, amt: "¥1,204" },
  ];
  return (
    <div className="space-y-4">
      <Toolbar>
        <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} aria-label="对账日期" className="tabular max-w-44" />
        <Button variant="secondary" size="sm" onClick={() => push({ tone: "success", title: "对账单导出中", description: `${day} · 2 个通道` })}><Download className="size-3.5" aria-hidden />导出对账单</Button>
        <Badge tone={rows.some((r) => Math.abs(r.diff) > 5) ? "warning" : "success"}>{rows.some((r) => Math.abs(r.diff) > 5) ? "存在差异" : "账实相符"}</Badge>
      </Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>通道</Th><Th className="text-right">上游条数</Th><Th className="text-right">平台条数</Th><Th className="text-right">差异</Th><Th className="text-right">成本</Th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.ch}><Td className="tabular">{r.ch}</Td><Td className="tabular text-right">{r.up.toLocaleString()}</Td><Td className="tabular text-right">{r.pf.toLocaleString()}</Td>
            <Td className={cn("tabular text-right", r.diff === 0 ? "text-success" : "text-danger")}>{r.diff === 0 ? "0" : r.diff}</Td><Td className="tabular text-right">{r.amt}</Td></tr>))}
        </tbody>
      </Table></CardBody></Card>
    </div>
  );
}

/* ---------------- 发票管理（运营） ---------------- */
function InvoicesAdminPanel() {
  const { push } = useToast();
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([
    { id: "inv_001", title: "某某品牌有限公司", amt: 500, st: "pending", t: "2026-10-29", no: "" },
    { id: "inv_002", title: "王设计工作室", amt: 2000, st: "done", t: "2026-10-20", no: "NO.2026102001" },
  ]);
  const rows = items.filter((i) => i.st === tab);
  return (
    <div className="space-y-4">
      <Tabs items={[{ id: "pending", label: "待开票", count: items.filter((i) => i.st === "pending").length }, { id: "done", label: "已开票", count: items.filter((i) => i.st === "done").length }]} value={tab} onChange={setTab} />
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>申请</Th><Th>抬头</Th><Th className="text-right">金额</Th><Th>状态</Th><Th>发票号</Th><Th>操作</Th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}><Td className="tabular text-fg-muted">{r.id}</Td><Td>{r.title}</Td><Td className="tabular text-right">¥{r.amt}</Td>
            <Td><Badge tone={r.st === "done" ? "success" : "warning"}>{r.st === "done" ? "已开票" : "待开票"}</Badge></Td>
            <Td className="tabular text-fg-subtle">{r.no || "—"}</Td>
            <Td>{r.st === "pending" ? <span className="flex gap-1"><Button variant="secondary" size="sm" onClick={() => { setItems((p) => p.map((x) => x.id === r.id ? { ...x, st: "done", no: `NO.${Date.now().toString().slice(-8)}` } : x)); push({ tone: "success", title: "已开票", description: r.title }); }}>开票</Button><Button variant="ghost" size="sm" onClick={() => push({ tone: "neutral", title: "已驳回" })}>驳回</Button></span> : <Button variant="ghost" size="sm" onClick={() => push({ tone: "neutral", title: `发票 ${r.no || r.id}`, description: "前端 mock：联调后打开发票 PDF 预览" })}>查看</Button>}</Td>
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
  const [partners, setPartners] = useState([
    { id: "af_01", n: "家居协会渠道", rate: 12, st: "合作中", amt: "¥8,200" },
    { id: "af_02", n: "设计师联盟", rate: 15, st: "合作中", amt: "¥3,140" },
  ]);
  return (
    <div className="space-y-4">
      <Toolbar><Button size="sm" onClick={() => setOpen(true)}><Plus className="size-3.5" aria-hidden />新增伙伴</Button></Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>ID</Th><Th>伙伴</Th><Th className="text-right">佣金率</Th><Th className="text-right">待结算</Th><Th>状态</Th><Th>操作</Th></tr></thead>
        <tbody>{partners.map((p) => (
          <tr key={p.id}><Td className="tabular text-fg-muted">{p.id}</Td><Td>{p.n}</Td><Td className="tabular text-right">{p.rate}%</Td><Td className="tabular text-right">{p.amt}</Td>
            <Td><Badge tone="success">{p.st}</Badge></Td><Td><span className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => push({ tone: "neutral", title: `结算单 · ${p.n}`, description: "前端 mock：联调后打开伙伴结算明细" })}>结算单</Button><Button variant="ghost" size="sm" onClick={() => push({ tone: "neutral", title: "已暂停合作" })}>暂停</Button></span></Td></tr>))}
        </tbody>
      </Table></CardBody></Card>
      <Modal open={open} onClose={() => setOpen(false)} title="新增分销伙伴" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>取消</Button><Button disabled={!name.trim()} onClick={() => { setPartners((p) => [...p, { id: `af_${Date.now().toString().slice(-3)}`, n: name.trim(), rate: 10, st: "合作中", amt: "¥0" }]); setOpen(false); setName(""); push({ tone: "success", title: "伙伴已创建" }); }}>创建</Button></>}>
        <div><Label htmlFor="af-n" className="mb-1.5 block">伙伴名称</Label><Input id="af-n" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：建材市场渠道" /></div>
      </Modal>
    </div>
  );
}

function SettlementPanel() {
  const { push } = useToast();
  const [period, setPeriod] = useState("2026-10");
  const [items, setItems] = useState([
    { id: "set_10a", p: "2026-10 上半月", amt: "¥5,120", st: "待打款", t: "10-16" },
    { id: "set_09b", p: "2026-09 下半月", amt: "¥4,880", st: "已打款", t: "10-05" },
  ]);
  return (
    <div className="space-y-4">
      <Toolbar>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="账期"><option>2026-10</option><option>2026-09</option><option>2026-08</option></Select>
        <Button size="sm" onClick={() => { setItems((p) => [{ id: `set_${Date.now().toString().slice(-4)}`, p: `${period} 整月`, amt: "¥0", st: "待打款", t: "刚刚" }, ...p]); push({ tone: "success", title: "结算单已生成", description: period }); }}><Plus className="size-3.5" aria-hidden />生成结算单</Button>
      </Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>ID</Th><Th>账期</Th><Th className="text-right">金额</Th><Th>状态</Th><Th>时间</Th><Th>操作</Th></tr></thead>
        <tbody>{items.map((s) => (
          <tr key={s.id}><Td className="tabular text-fg-muted">{s.id}</Td><Td>{s.p}</Td><Td className="tabular text-right">{s.amt}</Td>
            <Td><Badge tone={s.st === "已打款" ? "success" : "warning"}>{s.st}</Badge></Td><Td className="tabular text-fg-subtle">{s.t}</Td>
            <Td>{s.st === "待打款" ? <Button variant="secondary" size="sm" onClick={() => { setItems((p) => p.map((x) => x.id === s.id ? { ...x, st: "已打款" } : x)); push({ tone: "success", title: "打款完成", description: s.id }); }}>确认打款</Button> : <Button variant="ghost" size="sm" onClick={() => push({ tone: "success", title: `凭证下载中 · ${s.id}` })}><Download className="size-3.5" aria-hidden />凭证</Button>}</Td></tr>))}
        </tbody>
      </Table></CardBody></Card>
    </div>
  );
}

/* ---------------- 任务报表 ---------------- */
function ReportsPanel() {
  const { push } = useToast();
  const [cap, setCap] = useState("全部");
  const rows = [
    { c: "图片生成", total: 1240, ok: "98.8%", failTop: "参数非法 6", pts: 4960 },
    { c: "视频生成", total: 320, ok: "96.2%", failTop: "上游超时 8", pts: 8640 },
    { c: "图片口播", total: 180, ok: "97.8%", failTop: "授权缺失 3", pts: 14400 },
    { c: "字幕擦除", total: 210, ok: "99.1%", failTop: "视频损坏 1", pts: 1260 },
  ].filter((r) => cap === "全部" || r.c === cap);
  const max = Math.max(...rows.map((r) => r.total));
  return (
    <div className="space-y-4">
      <Toolbar>
        <Select value={cap} onChange={(e) => setCap(e.target.value)} aria-label="能力域"><option>全部</option>{rows.map((r) => <option key={r.c}>{r.c}</option>)}</Select>
        <Button variant="secondary" size="sm" onClick={() => push({ tone: "success", title: "报表导出中", description: `${rows.length} 个能力域 CSV 下载中` })}><Download className="size-3.5" aria-hidden />导出</Button>
      </Toolbar>
      <Card><CardBody className="space-y-3">
        {rows.map((r) => (
          <div key={r.c} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-fg">{r.c}</span>
            <span className="flex-1"><Progress value={Math.round((r.total / max) * 100)} label={`${r.c}任务量`} /></span>
            <span className="tabular w-16 text-right text-xs text-fg-muted">{r.total}</span>
            <span className="tabular w-16 text-right text-xs text-success">{r.ok}</span>
          </div>
        ))}
      </CardBody></Card>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>能力域</Th><Th className="text-right">任务量</Th><Th className="text-right">成功率</Th><Th>失败归因 Top1</Th><Th className="text-right">积分消耗</Th></tr></thead>
        <tbody>{rows.map((r) => (<tr key={r.c}><Td>{r.c}</Td><Td className="tabular text-right">{r.total}</Td><Td className="tabular text-right text-success">{r.ok}</Td><Td className="text-fg-muted">{r.failTop}</Td><Td className="tabular text-right">{r.pts.toLocaleString()}</Td></tr>))}</tbody>
      </Table></CardBody></Card>
    </div>
  );
}

/* ---------------- 数据看板 ---------------- */
function DashboardPanel() {
  const cards = [
    { k: "今日收入", v: "¥18,240", sub: "较昨日 +12%" },
    { k: "今日成本", v: "¥6,980", sub: "中转节省 ¥1,240" },
    { k: "平均毛利率", v: "61.7%", sub: "目标 ≥55%" },
    { k: "任务成功率", v: "98.2%", sub: "失败 34 单" },
  ];
  const trend = [42, 58, 51, 66, 72, 68, 84];
  const max = Math.max(...trend);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.k}><CardBody><p className="text-xs text-fg-subtle">{c.k}</p><p className="tabular mt-1 text-2xl font-semibold">{c.v}</p><p className="tabular mt-1 text-[11px] text-fg-subtle">{c.sub}</p></CardBody></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>近 7 天收入趋势</CardTitle><Badge tone="accent">毛利日报物化视图</Badge></CardHeader>
        <CardBody>
          <div className="flex h-28 items-end gap-2" aria-hidden>
            {trend.map((v, i) => (<span key={i} className="flex-1 rounded-xs bg-accent/70" style={{ height: `${Math.round((v / max) * 100)}%` }} />))}
          </div>
          <div className="tabular mt-2 flex justify-between text-[10px] text-fg-subtle"><span>10-24</span><span>10-30</span></div>
        </CardBody>
      </Card>
      <Card><CardHeader><CardTitle>按能力域 / 通道 / 模型三级拆分</CardTitle></CardHeader>
        <CardBody className="p-0"><Table>
          <thead><tr><Th>能力域</Th><Th className="text-right">收入</Th><Th className="text-right">成本</Th><Th className="text-right">毛利率</Th></tr></thead>
          <tbody>
            {[["视频生成", "¥8,120", "¥3,020", "62.8%"], ["图片生成", "¥4,960", "¥1,820", "63.3%"], ["数字人", "¥3,400", "¥1,480", "56.5%"]].map((r) => (
              <tr key={r[0]}><Td>{r[0]}</Td><Td className="tabular text-right">{r[1]}</Td><Td className="tabular text-right">{r[2]}</Td><Td className="tabular text-right text-success">{r[3]}</Td></tr>))}
          </tbody>
        </Table></CardBody>
      </Card>
    </div>
  );
}

/* ---------------- 审计日志 ---------------- */
function AuditPanel() {
  const [q, setQ] = useState("");
  const [act, setAct] = useState("全部");
  const [detail, setDetail] = useState<string | null>(null);
  const rows = [
    { id: "a_01", op: "管理员", a: "改价", t: "video.t2v.720p 12→14", ip: "192.168.1.10", time: "10-30 09:12", trace: "trace_9f21ab" },
    { id: "a_02", op: "管理员", a: "切通道", t: "relay-a → official-volc", ip: "192.168.1.10", time: "10-30 09:12", trace: "trace_9f21ac" },
    { id: "a_03", op: "系统", a: "熔断", t: "relay-b 余额不足摘除", ip: "—", time: "10-30 08:40", trace: "trace_9e88d1" },
  ].filter((r) => (act === "全部" || r.a === act) && (!q.trim() || r.t.includes(q.trim()) || r.trace.includes(q.trim())));
  const sel = rows.find((r) => r.id === detail) ?? null;
  return (
    <div className="space-y-4">
      <Toolbar>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索对象 / trace_id" aria-label="搜索审计" className="max-w-sm" />
        <Select value={act} onChange={(e) => setAct(e.target.value)} aria-label="动作"><option>全部</option><option>改价</option><option>切通道</option><option>熔断</option></Select>
      </Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>时间</Th><Th>操作人</Th><Th>动作</Th><Th>对象</Th><Th>IP</Th><Th>操作</Th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}><Td className="tabular whitespace-nowrap text-fg-muted">{r.time}</Td><Td>{r.op}</Td><Td><Badge tone="neutral">{r.a}</Badge></Td><Td className="text-fg-muted">{r.t}</Td><Td className="tabular text-fg-subtle">{r.ip}</Td>
            <Td><Button variant="ghost" size="sm" onClick={() => setDetail(r.id)}>trace</Button></Td></tr>))}
        </tbody>
      </Table></CardBody></Card>
      <Drawer open={!!sel} onClose={() => setDetail(null)} title="审计详情" footer={<Button size="sm" onClick={() => setDetail(null)}>关闭</Button>}>
        {sel && <dl className="space-y-2 text-sm">{[["trace_id", sel.trace], ["操作人", sel.op], ["动作", sel.a], ["对象", sel.t], ["时间", sel.time]].map(([k, v]) => (<div key={k} className="flex justify-between gap-4"><dt className="text-fg-subtle">{k}</dt><dd className="tabular text-fg">{v}</dd></div>))}</dl>}
      </Drawer>
    </div>
  );
}

/* ---------------- 邀请码 ---------------- */
function InviteCodesPanel() {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(10);
  const [codes, setCodes] = useState([
    { c: "XIN-8F21-K2", st: "未使用", by: "—", t: "10-28" },
    { c: "XIN-8F22-M9", st: "已使用", by: "u_1002", t: "10-29" },
  ]);
  return (
    <div className="space-y-4">
      <Toolbar><Button size="sm" onClick={() => setOpen(true)}><Plus className="size-3.5" aria-hidden />生成邀请码</Button><Badge tone="neutral">{codes.length} 个</Badge></Toolbar>
      <Card><CardBody className="p-0"><Table>
        <thead><tr><Th>邀请码</Th><Th>状态</Th><Th>使用者</Th><Th>生成时间</Th><Th>操作</Th></tr></thead>
        <tbody>{codes.map((r) => (
          <tr key={r.c}><Td className="tabular">{r.c}</Td><Td><Badge tone={r.st === "已使用" ? "neutral" : "accent"}>{r.st}</Badge></Td><Td className="tabular text-fg-muted">{r.by}</Td><Td className="tabular text-fg-subtle">{r.t}</Td>
            <Td><span className="flex gap-1"><Button variant="ghost" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(r.c); } catch { /* noop */ } push({ tone: "success", title: "已复制" }); }}><Copy className="size-3" />复制</Button><Button variant="ghost" size="sm" onClick={() => setCodes((p) => p.filter((x) => x.c !== r.c))}>作废</Button></span></Td></tr>))}
        </tbody>
      </Table></CardBody></Card>
      <Modal open={open} onClose={() => setOpen(false)} title="生成邀请码" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>取消</Button><Button onClick={() => { setCodes((p) => [...Array.from({ length: count }, (_, i) => ({ c: `XIN-${Date.now().toString().slice(-4)}-${i + 1}`, st: "未使用", by: "—", t: "刚刚" })), ...p]); setOpen(false); push({ tone: "success", title: `已生成 ${count} 个` }); }}>生成</Button></>}>
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
