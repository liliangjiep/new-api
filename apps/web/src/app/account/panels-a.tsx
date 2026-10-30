"use client";

import { useRef, useState } from "react";
import { Button, Input, Label, Textarea, Switch } from "@/components/ui/primitives";
import { Card, CardBody, CardHeader, CardTitle, Badge, Table, Th, Td } from "@/components/ui/surfaces";
import { Modal } from "@/components/ui/overlays";
import { useToast } from "@/components/features/ToastHost";
import { RECHARGE_PACKAGES } from "@/lib/domain";
import { cn } from "@/lib/cn";
import { Coins, ShieldCheck, Wallet, Copy, CheckCircle2, LogOut } from "lucide-react";

/* ---------------- 资料 ---------------- */

export function ProfilePanel() {
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  // 行内注释1：资料表单本地 state，保存走 PATCH /users/me（mock）
  const [nickname, setNickname] = useState("张工");
  const [email, setEmail] = useState("zhang@example.com");
  const [company, setCompany] = useState("某某品牌有限公司");
  const [bio, setBio] = useState("专注电商品牌视觉内容生产");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = nickname.trim() !== "张工" || email !== "zhang@example.com" || company !== "某某品牌有限公司" || bio !== "专注电商品牌视觉内容生产" || !!avatar;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const pickAvatar = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { push({ tone: "danger", title: "图片过大", description: "头像需 ≤ 5MB" }); return; }
    const url = URL.createObjectURL(f);
    setAvatar(url);
  };

  const save = () => {
    if (!nickname.trim()) { push({ tone: "danger", title: "昵称不能为空" }); return; }
    if (!emailOk) { push({ tone: "danger", title: "邮箱格式不正确" }); return; }
    setSaving(true);
    // TODO(API): PATCH /users/me
    setTimeout(() => { setSaving(false); push({ tone: "success", title: "已保存", description: "基本资料已更新" }); }, 600);
  };

  return (
    <Card>
      <CardHeader><CardTitle>基本资料</CardTitle>{dirty && <Badge tone="accent">未保存</Badge>}</CardHeader>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-md border border-line bg-surface-2 text-xl font-semibold text-fg-muted">
            {avatar ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={avatar} alt="头像预览" className="size-full object-cover" />) : nickname.trim().slice(0, 1) || "张"}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label="选择头像文件" onChange={(e) => pickAvatar(e.target.files?.[0])} />
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>更换头像</Button>
            <p className="mt-1.5 text-xs text-fg-subtle">支持 JPG / PNG，≤ 5MB · 仅本地预览，保存后上传</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="nickname" className="mb-1.5 block">昵称</Label><Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} /><p className="tabular mt-1 text-right text-[11px] text-fg-subtle">{nickname.length}/20</p></div>
          <div><Label htmlFor="phone" className="mb-1.5 block">手机号</Label><Input id="phone" value="138 0000 1234" disabled /><p className="mt-1.5 text-[11px] text-fg-subtle">手机号是登录账号，暂不支持自助更换</p></div>
          <div><Label htmlFor="email" className="mb-1.5 block">邮箱</Label><Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" invalid={email.length > 0 && !emailOk} />{email.length > 0 && !emailOk && <p className="mt-1 text-[11px] text-danger">邮箱格式不正确</p>}</div>
          <div><Label htmlFor="company" className="mb-1.5 block">公司 / 主体</Label><Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} /></div>
        </div>
        <div><Label htmlFor="bio" className="mb-1.5 block">简介</Label><Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={120} /><p className="tabular mt-1 text-right text-[11px] text-fg-subtle">{bio.length}/120</p></div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={!dirty || saving} onClick={() => { setNickname("张工"); setEmail("zhang@example.com"); setCompany("某某品牌有限公司"); setBio("专注电商品牌视觉内容生产"); setAvatar(null); }}>取消</Button>
          <Button onClick={save} disabled={!dirty || saving || !emailOk}>{saving ? "保存中…" : "保存"}</Button>
        </div>
        <p className="text-[11px] text-fg-subtle">TODO(API): 接入 PATCH /users/me 与 POST /media/avatar（直传头像）。</p>
      </CardBody>
    </Card>
  );
}

/* ---------------- 安全 ---------------- */

export function SecurityPanel() {
  const { push } = useToast();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [devices, setDevices] = useState([
    { d: "Windows · Chrome", ip: "192.168.1.24", t: "当前会话", active: true },
    { d: "iOS · Safari", ip: "223.104.3.88", t: "2 天前", active: false },
  ]);
  const pwdOk = newPwd.length >= 8;

  const sendCode = () => {
    if (!/^1\d{10}$/.test(newPhone.replace(/\s/g, ""))) { push({ tone: "danger", title: "手机号格式不正确" }); return; }
    setCountdown(60);
    const timer = setInterval(() => setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; }), 1000);
    push({ tone: "neutral", title: "验证码已发送", description: "体验版任意填写 4 位以上即可" });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-accent" aria-hidden />登录安全</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          {[
            { k: "登录密码", v: "已设置 · 90 天前更新", action: "修改", onClick: () => setPwdOpen(true) },
            { k: "绑定手机", v: "138 0000 1234", action: "更换", onClick: () => setPhoneOpen(true) },
          ].map((r) => (
            <div key={r.k} className="flex items-center justify-between gap-4 border-b border-line/60 pb-3">
              <div><p className="text-sm text-fg">{r.k}</p><p className="tabular mt-0.5 text-xs text-fg-subtle">{r.v}</p></div>
              <Button variant="secondary" size="sm" onClick={r.onClick}>{r.action}</Button>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-sm text-fg">二次验证</p><p className="mt-0.5 text-xs text-fg-subtle">{twoFA ? "已开启 · 登录需短信二次确认" : "未开启 · 建议开启"}</p></div>
            <span className="flex items-center gap-2">{twoFA && <Badge tone="success">已开启</Badge>}<Switch checked={twoFA} onCheckedChange={(v) => { setTwoFA(v); push({ tone: v ? "success" : "neutral", title: v ? "二次验证已开启" : "二次验证已关闭" }); }} label="二次验证开关" /></span>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>登录设备</CardTitle><Badge tone="neutral">{devices.length} 台</Badge></CardHeader>
        <CardBody>
          <ul className="space-y-3">
            {devices.map((s) => (
              <li key={s.d} className="flex items-center justify-between gap-4 border-b border-line/60 pb-3 last:border-0 last:pb-0">
                <div><p className="text-sm text-fg">{s.d}{s.active && <Badge tone="success" className="ml-2">当前</Badge>}</p><p className="tabular mt-0.5 text-xs text-fg-subtle">{s.ip} · {s.t}</p></div>
                {!s.active && <Button variant="ghost" size="sm" onClick={() => { setDevices((p) => p.filter((x) => x.d !== s.d)); push({ tone: "neutral", title: "设备已下线", description: s.d }); }}><LogOut className="size-3.5" aria-hidden />下线</Button>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-fg-subtle">TODO(API): 接入 GET /auth/sessions 与 DELETE /auth/sessions/{`{id}`}。</p>
        </CardBody>
      </Card>
      <Modal open={pwdOpen} onClose={() => setPwdOpen(false)} title="修改登录密码" description="8 位以上，建议字母 + 数字组合" footer={<><Button variant="secondary" onClick={() => setPwdOpen(false)}>取消</Button><Button disabled={!pwdOk} onClick={() => { setPwdOpen(false); setNewPwd(""); push({ tone: "success", title: "密码已更新", description: "下次登录请使用新密码" }); }}>确认修改</Button></>}>
        <div><Label htmlFor="new-pwd" className="mb-1.5 block">新密码</Label><Input id="new-pwd" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="至少 8 位" />{newPwd.length > 0 && !pwdOk && <p className="mt-1 text-[11px] text-danger">密码至少 8 位</p>}</div>
      </Modal>
      <Modal open={phoneOpen} onClose={() => setPhoneOpen(false)} title="更换绑定手机" description="更换后登录账号同步变更" footer={<><Button variant="secondary" onClick={() => setPhoneOpen(false)}>取消</Button><Button disabled={code.trim().length < 4} onClick={() => { setPhoneOpen(false); push({ tone: "success", title: "手机号已更换", description: newPhone }); }}>确认更换</Button></>}>
        <div className="space-y-3">
          <div><Label htmlFor="new-phone" className="mb-1.5 block">新手机号</Label><Input id="new-phone" inputMode="numeric" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="11 位手机号" /></div>
          <div><Label htmlFor="phone-code" className="mb-1.5 block">验证码</Label><div className="flex gap-2"><Input id="phone-code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="4 位以上" className="tabular flex-1" /><Button variant="secondary" disabled={countdown > 0} onClick={sendCode} className="tabular shrink-0">{countdown > 0 ? `${countdown}s` : "发送"}</Button></div></div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- 余额与充值 ---------------- */

export function CreditsPanel() {
  const { push } = useToast();
  const [pkg, setPkg] = useState("standard");
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState("微信支付");
  const chosen = RECHARGE_PACKAGES.find((p) => p.code === pkg);
  const [history] = useState([
    { t: "2026-10-28 14:22", d: "标准包 · 充值", v: "+520" },
    { t: "2026-10-29 20:33", d: "商详套图消耗", v: "-45" },
    { t: "2026-10-30 09:04", d: "厂家介绍视频消耗", v: "-320" },
  ]);
  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs text-fg-subtle"><Coins className="size-3.5 text-accent" aria-hidden />可用积分</p>
              <p className="tabular mt-1 text-4xl font-semibold tracking-tight">2,480</p>
              <p className="tabular mt-1.5 text-xs text-fg-subtle">冻结 0 · 有效期至 2028-10-28 · 不可提现/转赠</p>
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
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="size-4 text-accent" aria-hidden />最近变动</CardTitle><a href="/account" onClick={(e) => e.preventDefault()} className="text-xs text-fg-subtle">去流水页 →</a></CardHeader>
        <CardBody className="p-0">
          <Table><tbody>{history.map((h) => (<tr key={h.t}><Th className="tabular whitespace-nowrap font-normal text-fg-subtle">{h.t}</Th><Td className="text-fg-muted">{h.d}</Td><Td className={cn("tabular text-right", h.v.startsWith("+") ? "text-success" : "text-fg")}>{h.v}</Td></tr>))}</tbody></Table>
        </CardBody>
      </Card>
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="确认充值" description="积分自到账起 2 年有效，不可提现" footer={<><Button variant="secondary" onClick={() => setPayOpen(false)}>取消</Button><Button onClick={() => { setPayOpen(false); push({ tone: "success", title: "充值成功", description: `${chosen?.name}已到账 ${chosen?.credits}积分（${method}）` }); }}>确认支付 ¥{chosen?.amount}</Button></>}>
        <div className="space-y-3">
          <p className="text-sm text-fg">套餐：{chosen?.name} · 到账 {chosen?.credits} 积分（含赠送）</p>
          <div><Label className="mb-1.5 block">支付方式</Label><div className="flex gap-1.5">{["微信支付", "支付宝", "对公转账"].map((m) => (<button key={m} type="button" onClick={() => setMethod(m)} aria-pressed={method === m} className={cn("flex-1 rounded-xs border px-2 py-2 text-xs", method === m ? "border-accent bg-accent-soft/40 text-fg" : "border-line bg-surface-2 text-fg-muted")}>{m}</button>))}</div></div>
          <p className="tabular flex items-center gap-1.5 text-xs text-fg-subtle"><CheckCircle2 className="size-3 text-success" aria-hidden />订单号 ord_{Date.now().toString().slice(-8)} · 企业可开票<Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => { try { navigator.clipboard.writeText(`ord_${Date.now()}`); } catch { /* noop */ } push({ tone: "success", title: "订单号已复制" }); }}><Copy className="size-3" aria-hidden />复制</Button></p>
        </div>
      </Modal>
    </div>
  );
}
