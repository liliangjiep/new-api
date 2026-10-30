"use client";

import { useMemo, useState } from "react";
import { ToolLayout } from "@/components/features/ToolLayout";
import { FieldGroup, QuotePanel, Steps, type QuoteResult } from "@/components/features/QuotePanel";
import { UploadSlots, type UploadedFile } from "@/components/features/UploadSlots";
import { Button, Input, Label, Select, Checkbox } from "@/components/ui/primitives";
import { Card, CardBody, CardHeader, CardTitle, Badge, EmptyState, Progress } from "@/components/ui/surfaces";
import { cn } from "@/lib/cn";
import { Clapperboard, UserRound, Captions, Music2 } from "lucide-react";

// E6 上传数字人形象生成厂家介绍视频：探店式链路
// 素材(厂房/展厅/产品) + 数字人形象 → 行业脚本模板变量替换 → 数字人口播 + 场地空镜分镜 → 字幕片头BGM合成 → 1080P成片，可批量
// 行内注释1：四步向导 —— 1选数字人 2传场地素材 3套脚本模板填变量 4规格与成片
// 行内注释2：脚本模板变量 {{factory}} {{product}} {{phone}} 实时替换预览
// 行内注释3：分镜 = 口播段(数字人) + 空镜段(场地素材轮播)，时长按60秒标准版/轻量版切分
// 行内注释4：报价 = 主链路320标准 / 165轻量 + 超时附加；批量按条数×
// TODO(API): 接入 POST /stone/factory-video-jobs（含 template_id + variables）与 GET /stone/script-templates
const STEPS = ["选数字人", "传场地素材", "套脚本模板", "规格与成片"];

const AVATARS = [
  { id: "a1", name: "陈总 · 创始人", thumb: "/images/toapi/result-6.png", tag: "已标准化" },
  { id: "a2", name: "讲解员小李", thumb: "/images/toapi/result-1.png", tag: "已标准化" },
  { id: "a3", name: "工艺师傅", thumb: "/images/toapi/result-2.png", tag: "待标准化" },
];

const SCRIPT_TEMPLATES = [
  { id: "t1", label: "产品介绍", body: "大家好，我是{{name}}，{{factory}}专注{{product}}二十年。今天带大家看我们的展厅与工艺……联系方式{{phone}}。" },
  { id: "t2", label: "展会邀约", body: "{{factory}}诚邀您参加{{expo}}展会，展位{{booth}}，现场看{{product}}大板切割，{{name}}在展位等您。" },
  { id: "t3", label: "矿区与工艺讲解", body: "这批{{product}}来自自有矿区，纹理{{texture}}。{{factory}}采用{{craft}}工艺，保证每一片都可追溯。" },
  { id: "t4", label: "客户接待话术", body: "欢迎来到{{factory}}，我是{{name}}。先看展厅，再进车间，全程约{{minutes}}分钟。" },
];

export default function FactoryVideoPage() {
  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState("a1");
  const [sites, setSites] = useState<UploadedFile[]>([]);
  const [products, setProducts] = useState<UploadedFile[]>([]);
  const [template, setTemplate] = useState("t1");
  const [vars, setVars] = useState({ factory: "某某石材有限公司", product: "卡拉拉白大板", name: "陈总", phone: "138-0000-1234", expo: "厦门石材展", booth: "C3-018", texture: "通体细腻", craft: "智能干挂", minutes: "30" });
  const [tier, setTier] = useState<"standard" | "lite">("standard");
  const [batch, setBatch] = useState(1);
  const [bgm, setBgm] = useState(true);
  const [captions, setCaptions] = useState(true);
  const [intro, setIntro] = useState(true);
  const [auth, setAuth] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [progress, setProgress] = useState(0);

  // 行内注释5：变量替换预览 —— {{key}} 全局替换
  const script = useMemo(() => {
    const t = SCRIPT_TEMPLATES.find((x) => x.id === template)?.body ?? "";
    return t.replace(/\{\{(\w+)\}\}/g, (_, k: string) => (vars as Record<string, string>)[k] ?? `{{${k}}}`);
  }, [template, vars]);

  // 行内注释6：单价 —— 标准版320 / 轻量165，批量直乘
  const unit = tier === "standard" ? 320 : 165;
  const total = unit * batch;

  const setVar = (k: string, v: string) => setVars((p) => ({ ...p, [k]: v }));

  const canNext = step === 0 ? !!avatar : step === 1 ? sites.length > 0 : step === 2 ? script.length > 10 && auth : true;

  const runQuote = () => {
    setQuoting(true);
    setQuote(null);
    setTimeout(() => {
      setQuote({
        estimatedCredits: total,
        lines: [
          { label: "厂家介绍视频", spec: `${tier === "standard" ? "60秒标准版" : "60秒轻量版"} × ${batch}条 · 1080P`, points: total },
          { label: "脚本模板", spec: SCRIPT_TEMPLATES.find((x) => x.id === template)?.label, points: 0 },
          { label: "合成项", spec: [captions && "字幕", intro && "片头", bgm && "BGM"].filter(Boolean).join(" / ") || "无", points: 0 },
        ],
        fingerprint: "mock_fp_" + Date.now(),
      });
      setQuoting(false);
    }, 420);
  };

  const submit = () => {
    setProgress(6);
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(timer); return 100; }
        return Math.min(100, p + 5);
      });
    }, 380);
  };

  return (
    <ToolLayout
      title="厂家介绍视频"
      description="数字人主口播 + 场地空镜分镜合成 · 1080P"
      breadcrumbs={[{ label: "工具箱", href: "/toolbox" }, { label: "行业", href: "/toolbox" }, { label: "厂家介绍视频" }]}
      params={
        <>
          <div className="rounded-md border border-line bg-surface p-4"><Steps steps={STEPS} current={step} /></div>

          {step === 0 && (
            <FieldGroup title="选择数字人形象" description="需已标准化处理，未标准化不可用于成片">
              <ul className="grid grid-cols-3 gap-2">
                {AVATARS.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => setAvatar(a.id)} aria-pressed={avatar === a.id}
                      className={cn("w-full overflow-hidden rounded-sm border text-left transition-colors", avatar === a.id ? "border-accent" : "border-line hover:border-line-strong")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.thumb} alt={a.name} className="aspect-square w-full object-cover" />
                      <span className="block px-2 py-1.5"><span className="block truncate text-xs text-fg">{a.name}</span>
                        <span className="mt-0.5 block"><Badge tone={a.tag === "已标准化" ? "success" : "warning"}>{a.tag}</Badge></span></span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-fg-subtle">TODO(API): 接入 GET /avatar/list，已标准化形象才能选中提交。</p>
            </FieldGroup>
          )}

          {step === 1 && (
            <FieldGroup title="上传厂房 / 展厅 / 产品素材" description="空镜分镜来源，建议 6~12 条">
              <UploadSlots label="场地空镜" accept="video/*,image/*" max={12} value={sites} onChange={setSites} hint="展厅全景 / 车间切割 / 仓储大板" />
              <UploadSlots label="产品特写" accept="image/*,video/*" max={6} value={products} onChange={setProducts} hint="主推 2~3 款产品" />
            </FieldGroup>
          )}

          {step === 2 && (
            <FieldGroup title="行业脚本模板" description="变量替换后即为口播文案">
              <div>
                <Label htmlFor="tpl" className="mb-1.5 block">模板</Label>
                <Select id="tpl" value={template} onChange={(e) => setTemplate(e.target.value)}>
                  {SCRIPT_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["factory", "product", "name", "phone"] as const).map((k) => (
                  <div key={k}>
                    <Label className="mb-1 block text-[11px]">{k}</Label>
                    <Input value={(vars as Record<string, string>)[k]} onChange={(e) => setVar(k, e.target.value)} aria-label={k} />
                  </div>
                ))}
              </div>
              <div className="rounded-sm border border-line bg-surface-2 p-3">
                <p className="mb-1 text-[11px] font-medium text-fg-muted">口播预览（{script.length}字 · 约{Math.ceil(script.length / 4)}秒）</p>
                <p className="text-xs leading-relaxed text-fg">{script}</p>
              </div>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-sm border border-warning/40 bg-warning/8 p-3">
                <Checkbox checked={auth} onChange={(e) => setAuth(e.target.checked)} className="mt-0.5" />
                <span className="text-xs leading-relaxed text-fg-muted">我已获得出镜人声音与肖像授权，同意留痕（face_auth 将透传上游，违规素材进人工复核）。</span>
              </label>
            </FieldGroup>
          )}

          {step === 3 && (
            <FieldGroup title="规格与合成" description="提交后可在任务中心跟踪">
              <div>
                <Label className="mb-1.5 block">版本</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([{ k: "standard", l: "标准版", d: "320积分 · 全链路" }, { k: "lite", l: "轻量版", d: "165积分 · 快档" }] as const).map((t) => (
                    <button key={t.k} type="button" onClick={() => setTier(t.k)} aria-pressed={tier === t.k}
                      className={cn("rounded-sm border px-2 py-2 text-center", tier === t.k ? "border-accent bg-accent-soft/40" : "border-line bg-surface-2 hover:border-line-strong")}>
                      <span className="block text-sm text-fg">{t.l}</span><span className="tabular block text-[11px] text-fg-subtle">{t.d}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="batch" className="mb-1.5 block">批量出片</Label>
                <Input id="batch" type="number" min={1} max={10} value={batch} onChange={(e) => setBatch(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} className="tabular" />
              </div>
              <ul className="space-y-2">
                {([{ k: "cap", l: "字幕", v: captions, s: setCaptions }, { k: "intro", l: "片头", v: intro, s: setIntro }, { k: "bgm", l: "BGM", v: bgm, s: setBgm }] as const).map((t) => (
                  <li key={t.k}><label className="flex cursor-pointer items-center gap-2.5 text-sm text-fg"><Checkbox checked={t.v} onChange={(e) => t.s(e.target.checked)} />{t.l}</label></li>
                ))}
              </ul>
              <Button variant="secondary" onClick={runQuote} className="w-full" disabled={quoting}>重新报价</Button>
              <QuotePanel quote={quote} balance={2480} loading={quoting} onConfirm={submit} confirmText={`提交 ${batch} 条 · ${total}积分`} disabled={!auth} />
            </FieldGroup>
          )}

          <div className="flex items-center gap-2">
            {step > 0 && <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>上一步</Button>}
            {step < 3 && <Button className="flex-1" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>{step === 2 && !auth ? "勾选授权后继续" : "下一步"}</Button>}
          </div>
        </>
      }
      results={
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clapperboard className="size-4 text-accent" aria-hidden />成片分镜</CardTitle>
            {progress > 0 && <Badge tone={progress >= 100 ? "success" : "accent"}>{progress >= 100 ? "已完成" : `${progress}%`}</Badge>}
          </CardHeader>
          <CardBody>
            {progress === 0 ? (
              <EmptyState icon={<UserRound className="size-5" />} title="走完四步即可成片" description="数字人口播 + 场地空镜自动混剪" />
            ) : (
              <div className="space-y-3">
                {progress < 100 && <Progress value={progress} label="合成进度" />}
                <ol className="space-y-2">
                  {[
                    { t: "片头 · 厂家 LOGO", icon: Clapperboard, d: intro ? "已启用" : "已跳过" },
                    { t: `口播段 · ${AVATARS.find((a) => a.id === avatar)?.name}`, icon: UserRound, d: `${Math.ceil(script.length / 4)}秒` },
                    { t: `空镜段 · ${sites.length}段场地素材轮播`, icon: Captions, d: captions ? "字幕已压制" : "无字幕" },
                    { t: "片尾 · 联系方式", icon: Music2, d: bgm ? "BGM 已混音" : "无 BGM" },
                  ].map((s, i) => (
                    <li key={s.t} className="flex items-center gap-3 rounded-sm border border-line bg-surface-2 p-2.5">
                      <span className="tabular text-[11px] text-fg-subtle">{String(i + 1).padStart(2, "0")}</span>
                      <s.icon className="size-4 shrink-0 text-accent" aria-hidden />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm text-fg">{s.t}</span><span className="tabular block text-[11px] text-fg-subtle">{s.d}</span></span>
                      <Badge tone={progress >= 100 ? "success" : "accent"}>{progress >= 100 ? "已完成" : "合成中"}</Badge>
                    </li>
                  ))}
                </ol>
                <div className="overflow-hidden rounded-sm border border-line bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/toapi/result-3.png" alt="厂家介绍视频预览" className="aspect-video w-full object-cover" />
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      }
    />
  );
}
