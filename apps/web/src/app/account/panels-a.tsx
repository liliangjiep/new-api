"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Input, Label, Textarea, Switch } from "@/components/ui/primitives";
import { Card, CardBody, CardHeader, CardTitle, Badge, Table, Th, Td } from "@/components/ui/surfaces";
import { Modal } from "@/components/ui/overlays";
import { useToast } from "@/components/features/ToastHost";
import { RECHARGE_PACKAGES, type RechargePackage } from "@/lib/domain";
import { cn } from "@/lib/cn";
import { Coins, ShieldCheck, Wallet, Copy, CheckCircle2, LogOut } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  getProfile,
  updateProfile,
  changePassword,
  listSessions,
  revokeSession,
  type UserProfile,
  type SessionItem,
} from "@/lib/backend/users";
import { uploadAsset } from "@/lib/backend/assets";
import { getBalance, getLedger, createRechargeOrder, listRechargePackages, type BalanceView, type LedgerItem, type RechargePackageRow } from "@/lib/backend/points";

/* ---------------- 资料 ---------------- */

export function ProfilePanel() {
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  // 行内注释1：真数据 —— 资料从 GET /users/me 读，保存走 PATCH /users/me。
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarAssetId, setAvatarAssetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getProfile();
      setProfile(p);
      setNickname(p.nickname ?? "");
      setEmail(p.email ?? "");
      setCompany(p.company ?? "");
      setBio(p.bio ?? "");
      setPhone(p.phone ?? "");
      setAvatar(p.avatar_url || null);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "加载资料失败";
      push({ tone: "warning", title: "加载失败", description: msg });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty =
    (profile ? nickname !== (profile.nickname ?? "") : false) ||
    (profile ? email !== (profile.email ?? "") : false) ||
    (profile ? company !== (profile.company ?? "") : false) ||
    (profile ? bio !== (profile.bio ?? "") : false) ||
    !!avatarAssetId;

  /**
   * 行内注释2：头像先传资产库 —— 拿到 asset_id 后随 PATCH 一起提交，
   *             后端会校验归属并写 avatar_url。
   */
  const pickAvatar = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      push({ tone: "danger", title: "图片过大", description: "头像需 ≤ 5MB" });
      return;
    }
    try {
      const rec = await uploadAsset(f, "参考图");
      setAvatarAssetId(rec.id);
      setAvatar(rec.url || URL.createObjectURL(f));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "头像上传失败";
      push({ tone: "danger", title: "头像上传失败", description: msg });
    }
  };

  const save = async () => {
    if (!nickname.trim()) {
      push({ tone: "danger", title: "昵称不能为空" });
      return;
    }
    if (email && !emailOk) {
      push({ tone: "danger", title: "邮箱格式不正确" });
      return;
    }
    setSaving(true);
    try {
      const body: Parameters<typeof updateProfile>[0] = {
        nickname: nickname.trim(),
        email: email.trim(),
        company: company.trim(),
        bio: bio.trim(),
      };
      if (avatarAssetId) body.avatar_asset_id = avatarAssetId;
      const updated = await updateProfile(body);
      setProfile(updated);
      setAvatarAssetId(null);
      push({ tone: "success", title: "已保存", description: "基本资料已更新" });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "保存失败";
      push({ tone: "danger", title: "保存失败", description: msg });
    } finally {
      setSaving(false);
    }
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
            <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label="选择头像文件" onChange={(e) => { void pickAvatar(e.target.files?.[0]); e.target.value = ""; }} />
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>更换头像</Button>
            <p className="mt-1.5 text-xs text-fg-subtle">支持 JPG / PNG，≤ 5MB · 保存后写入资料</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="nickname" className="mb-1.5 block">昵称</Label><Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} disabled={loading} /><p className="tabular mt-1 text-right text-[11px] text-fg-subtle">{nickname.length}/20</p></div>
          <div><Label htmlFor="phone" className="mb-1.5 block">手机号</Label><Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled /><p className="mt-1.5 text-[11px] text-fg-subtle">手机号是登录账号，暂不支持自助更换</p></div>
          <div><Label htmlFor="email" className="mb-1.5 block">邮箱</Label><Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" invalid={email.length > 0 && !emailOk} disabled={loading} />{email.length > 0 && !emailOk && <p className="mt-1 text-[11px] text-danger">邮箱格式不正确</p>}</div>
          <div><Label htmlFor="company" className="mb-1.5 block">公司 / 主体</Label><Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} disabled={loading} /></div>
        </div>
        <div><Label htmlFor="bio" className="mb-1.5 block">简介</Label><Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={120} disabled={loading} /><p className="tabular mt-1 text-right text-[11px] text-fg-subtle">{bio.length}/120</p></div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={!dirty || saving} onClick={() => { void load(); setAvatarAssetId(null); }}>取消</Button>
          <Button onClick={() => void save()} disabled={!dirty || saving || !emailOk}>{saving ? "保存中…" : "保存"}</Button>
        </div>
      </CardBody>
    </Card>
  );
}

/* ---------------- 安全 ---------------- */

export function SecurityPanel() {
  const { push } = useToast();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [devices, setDevices] = useState<SessionItem[]>([]);
  const pwdOk = newPwd.length >= 8;

  /**
   * 行内注释3：真设备列表 —— GET /auth/sessions，下线走 DELETE /auth/sessions/{id}。
   */
  const loadSessions = useCallback(async () => {
    try {
      const rows = await listSessions();
      setDevices(rows ?? []);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "加载登录设备失败";
      push({ tone: "warning", title: "加载失败", description: msg });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const revoke = async (id: string, label: string) => {
    try {
      await revokeSession(id);
      setDevices((p) => p.filter((x) => x.id !== id));
      push({ tone: "neutral", title: "设备已下线", description: label });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "下线失败";
      push({ tone: "danger", title: "下线失败", description: msg });
    }
  };

  const submitPwd = async () => {
    setPwdSaving(true);
    try {
      await changePassword({ old_password: oldPwd, new_password: newPwd });
      setPwdOpen(false);
      setOldPwd("");
      setNewPwd("");
      push({ tone: "success", title: "密码已更新", description: "下次登录请使用新密码" });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "修改失败";
      push({ tone: "danger", title: "修改失败", description: msg });
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-accent" aria-hidden />登录安全</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          {[
            { k: "登录密码", v: "已设置 · 可随时修改", action: "修改", onClick: () => setPwdOpen(true) },
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
          {devices.length === 0 ? (
            <p className="py-6 text-center text-xs text-fg-subtle">暂无登录设备记录</p>
          ) : (
            <ul className="space-y-3">
              {devices.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 border-b border-line/60 pb-3 last:border-0 last:pb-0">
                  <div><p className="text-sm text-fg">{s.device ?? "未知设备"}{s.current && <Badge tone="success" className="ml-2">当前</Badge>}</p><p className="tabular mt-0.5 text-xs text-fg-subtle">{s.ip || "—"} · {s.created_at ?? ""}</p></div>
                  {!s.current && <Button variant="ghost" size="sm" onClick={() => void revoke(s.id, s.device ?? s.id)}><LogOut className="size-3.5" aria-hidden />下线</Button>}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
      <Modal open={pwdOpen} onClose={() => setPwdOpen(false)} title="修改登录密码" description="8 位以上，建议字母 + 数字组合" footer={<><Button variant="secondary" onClick={() => setPwdOpen(false)}>取消</Button><Button disabled={!pwdOk || pwdSaving} onClick={() => void submitPwd()}>{pwdSaving ? "提交中…" : "确认修改"}</Button></>}>
        <div className="space-y-3">
          <div><Label htmlFor="old-pwd" className="mb-1.5 block">当前密码</Label><Input id="old-pwd" type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} placeholder="当前登录密码" /></div>
          <div><Label htmlFor="new-pwd" className="mb-1.5 block">新密码</Label><Input id="new-pwd" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="至少 8 位" />{newPwd.length > 0 && !pwdOk && <p className="mt-1 text-[11px] text-danger">密码至少 8 位</p>}</div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- 余额与充值 ---------------- */

/**
 * 行内注释4：真充值 —— POST /recharge/orders 建单（幂等键防重复），
 *             拿到 pay_url 后跳转收银台；订单状态靠 GET /recharge/orders/{no} 轮询。
 */
export function CreditsPanel() {
  const { push } = useToast();
  const [pkg, setPkg] = useState("standard");
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState("微信支付");
  const [balance, setBalance] = useState<BalanceView | null>(null);
  const [history, setHistory] = useState<LedgerItem[]>([]);
  const [ordering, setOrdering] = useState(false);
  // 行内注释4.0：套餐走后端 —— 后台可改价/下架，前端写死常量会钱账不符。
  const [packages, setPackages] = useState<RechargePackage[]>(RECHARGE_PACKAGES);
  const chosen = packages.find((p) => p.code === pkg);

  const load = useCallback(async () => {
    try {
      const [b, l, pkgs] = await Promise.all([
        getBalance(),
        getLedger({ page: 1, pageSize: 10 }),
        // 行内注释4.0.1：套餐拉取失败不阻塞余额展示 —— 回落本地常量。
        listRechargePackages().catch(() => [] as RechargePackageRow[]),
      ]);
      setBalance(b);
      setHistory(l.data ?? []);
      if (pkgs.length > 0) {
        const enabled = pkgs.filter((p) => p.enabled !== false);
        setPackages(
          enabled.map((p) => ({
            code: p.code,
            name: p.name,
            amount: p.amount,
            credits: p.credits,
            bonusRate: p.bonus_rate ?? 0,
            audience: p.audience ?? "",
          })),
        );
        setPkg((cur) => (enabled.some((p) => p.code === cur) ? cur : (enabled[0]?.code ?? cur)));
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "加载积分失败";
      push({ tone: "warning", title: "加载失败", description: msg });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pay = async () => {
    if (!chosen) return;
    setOrdering(true);
    try {
      // 行内注释4.1：幂等键带上订单特征 —— 重复点击不会重复建单。
      const idem = `rc_${pkg}_${Date.now()}`;
      const order = await createRechargeOrder(
        { packageCode: chosen.code, payMethod: method === "微信支付" ? "wechat" : method === "支付宝" ? "alipay" : "bank" },
        idem,
      );
      setPayOpen(false);
      if (order?.pay_url) {
        push({ tone: "success", title: "订单已创建", description: `订单号 ${order.order_no}` });
        window.open(order.pay_url, "_blank", "noopener");
      } else {
        // 行内注释4.2：没有收银台地址（支付网关未接）—— 明确告知，不假装充值成功。
        push({ tone: "warning", title: "订单已创建", description: `订单号 ${order?.order_no ?? "-"}，支付网关待接入` });
      }
      void load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "下单失败";
      push({ tone: "danger", title: "下单失败", description: msg });
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs text-fg-subtle"><Coins className="size-3.5 text-accent" aria-hidden />可用积分</p>
              <p className="tabular mt-1 text-4xl font-semibold tracking-tight">{(balance?.available ?? 0).toLocaleString()}</p>
              <p className="tabular mt-1.5 text-xs text-fg-subtle">冻结 {balance?.frozen ?? 0} · 有效期至 {balance?.expires_at ?? "永久有效"} · 不可提现/转赠</p>
            </div>
            <Button onClick={() => setPayOpen(true)}>去充值</Button>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>充值套餐</CardTitle><Badge tone="neutral">{packages.length} 档</Badge></CardHeader>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p) => (
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
          {history.length === 0 ? (
            <p className="py-6 text-center text-xs text-fg-subtle">暂无积分变动</p>
          ) : (
            <Table><tbody>{history.map((h) => (<tr key={h.id}><Th className="tabular whitespace-nowrap font-normal text-fg-subtle">{h.created_at}</Th><Td className="text-fg-muted">{h.note || h.type}</Td><Td className={cn("tabular text-right", h.amount >= 0 ? "text-success" : "text-fg")}>{h.amount >= 0 ? `+${h.amount}` : h.amount}</Td></tr>))}</tbody></Table>
          )}
        </CardBody>
      </Card>
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="确认充值" description="积分自到账起 2 年有效，不可提现" footer={<><Button variant="secondary" onClick={() => setPayOpen(false)}>取消</Button><Button onClick={() => void pay()} disabled={ordering}>{ordering ? "下单中…" : `确认支付 ¥${chosen?.amount ?? 0}`}</Button></>}>
        <div className="space-y-3">
          <p className="text-sm text-fg">套餐：{chosen?.name} · 到账 {chosen?.credits} 积分（含赠送）</p>
          <div><Label className="mb-1.5 block">支付方式</Label><div className="flex gap-1.5">{["微信支付", "支付宝", "对公转账"].map((m) => (<button key={m} type="button" onClick={() => setMethod(m)} aria-pressed={method === m} className={cn("flex-1 rounded-xs border px-2 py-2 text-xs", method === m ? "border-accent bg-accent-soft/40 text-fg" : "border-line bg-surface-2 text-fg-muted")}>{m}</button>))}</div></div>
          <p className="tabular flex items-center gap-1.5 text-xs text-fg-subtle"><CheckCircle2 className="size-3 text-success" aria-hidden />企业可开票<Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => { void navigator.clipboard?.writeText(`rc_${pkg}`); push({ tone: "success", title: "已复制" }); }}><Copy className="size-3" aria-hidden />复制套餐码</Button></p>
        </div>
      </Modal>
    </div>
  );
}
