"use client";

import { useMemo, useState } from "react";
import { ToolLayout } from "@/components/features/ToolLayout";
import { FieldGroup, QuotePanel, type QuoteResult } from "@/components/features/QuotePanel";
import { UploadSlots, type UploadedFile } from "@/components/features/UploadSlots";
import { Button, Label, Select, Textarea, Checkbox } from "@/components/ui/primitives";
import { Card, CardBody, CardHeader, CardTitle, Badge, EmptyState, Progress, Tabs } from "@/components/ui/surfaces";
import { VIDEO_SKILLS, VIDEO_SKILL_CATEGORIES, type SkillCategory } from "@/lib/domain";
import { useToast } from "@/components/features/ToastHost";
import { cn } from "@/lib/cn";
import { Clapperboard, Layers, Download, RefreshCw } from "lucide-react";

// 视频创意 19套技能包 × 动态选项组：每个技能包自带选项组配置，前端按配置渲染
// 行内注释1：OPTION_GROUPS[skillKey] = 选项组数组；未命中的技能用 DEFAULT_GROUPS，保证19套都有交互
// 行内注释2：选项类型 select | pills | switch | text —— 值存 optionsRecord[`${skill}:${optKey}`]
// 行内注释3：报价系数 = 时长基价 × 模型折扣 × 选项附加（如方言/多机位+5积分）
// TODO(API): 接入 GET /video-creator/skills（返回 slots + option_groups + prompt_template）
interface OptDef {
  key: string;
  label: string;
  type: "select" | "pills" | "switch" | "text";
  options?: string[];
  extra?: number;
  hint?: string;
}

const DEFAULT_GROUPS: OptDef[] = [
  { key: "style", label: "成片风格", type: "pills", options: ["写实", "高级感", "烟火气", "极简"] },
  { key: "voiceover", label: "口播开关", type: "switch", hint: "开启后自动配口播音频" },
  { key: "subtitle", label: "字幕样式", type: "select", options: ["大字粗体", "极简小字", "卡拉OK"] },
];

const OPTION_GROUPS: Record<string, OptDef[]> = {
  "ecommerce-spoken-selling": [
    { key: "hook", label: "开场钩子", type: "pills", options: ["痛点提问", "价格直给", "效果前置", "身份认同"] },
    { key: "demo", label: "演示方式", type: "select", options: ["手持演示", "上身试用", "对比拆解", "场景演绎"] },
    { key: "dialect", label: "方言口播", type: "select", options: ["普通话", "粤语", "闽南语", "四川话"], extra: 5 },
    { key: "cta", label: "结尾转化", type: "switch", hint: "挂小黄车/领券口令" },
  ],
  "local-store-visit-record": [
    { key: "route", label: "探店动线", type: "pills", options: ["展厅→车间→仓储", "车间→展厅", "只拍展厅"] },
    { key: "host", label: "出镜方式", type: "select", options: ["数字人主讲", "真人出镜", "纯空镜+旁白"] },
    { key: "duration_split", label: "分镜时长", type: "select", options: ["15秒×4镜", "10秒×6镜", "5秒×8镜"] },
  ],
  "advertising-brand-story": [
    { key: "tone", label: "叙事基调", type: "pills", options: ["匠心", "传承", "创新", "家国"] },
    { key: "timeline", label: "时间跨度", type: "select", options: ["十年", "二十年", "三代人"] },
    { key: "ending", label: "落版", type: "text", hint: "例：某某品牌 · 十年只做一件事" },
  ],
  "short-drama-reversal": [
    { key: "twist_at", label: "反转点", type: "select", options: ["第5秒", "第10秒", "结尾2秒"] },
    { key: "cast", label: "人物数", type: "pills", options: ["单人", "双人", "群像"] },
    { key: "product_in", label: "产品植入", type: "switch", hint: "剧情自然带出产品" },
  ],
};

const MODELS = [
  { key: "seedance-2.0", label: "Seedance 2.0（标准）", rate: 1 },
  { key: "seedance-2.0-fast", label: "Seedance 2.0 Fast（快档 7.5 折）", rate: 0.75 },
  { key: "seedance-2.0-mini", label: "Seedance 2.0 Mini（轻量 5 折）", rate: 0.5 },
  { key: "wan-3.0-prime", label: "Wan 3.0 Prime", rate: 0.9 },
  { key: "kling-4.0", label: "Kling 4.0", rate: 0.9 },
];

interface Job {
  id: string;
  label: string;
  progress: number;
  status: "running" | "done";
}

export default function VideoCreatorPage() {
  const { push } = useToast();
  const [category, setCategory] = useState<SkillCategory>("ecommerce");
  const [skill, setSkill] = useState(VIDEO_SKILLS[0].key);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("seedance-2.0");
  const [duration, setDuration] = useState("15");
  const [opts, setOpts] = useState<Record<string, string | boolean>>({});
  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  const skills = useMemo(() => VIDEO_SKILLS.filter((s) => s.category === category), [category]);
  const current = VIDEO_SKILLS.find((s) => s.key === skill);
  const groups = OPTION_GROUPS[skill] ?? DEFAULT_GROUPS;

  // 行内注释4：选项附加费 —— select/pills 选中带 extra 的项才加钱，switch 开启+3积分
  const extra = groups.reduce((sum, g) => {
    const v = opts[`${skill}:${g.key}`];
    if (g.type === "switch") return sum + (v ? 3 : 0);
    if (typeof v === "string" && g.options) {
      const idx = g.options.indexOf(v);
      if (idx >= 0 && g.extra) return sum + g.extra;
    }
    return sum;
  }, 0);

  const modelRate = MODELS.find((m) => m.key === model)?.rate ?? 1;
  const base = (duration === "30" ? 45 : duration === "15" ? 32 : 18) + extra;
  const total = Math.round(base * modelRate);

  const setOpt = (k: string, v: string | boolean) => setOpts((p) => ({ ...p, [`${skill}:${k}`]: v }));
  const getOpt = (k: string) => opts[`${skill}:${k}`];

  const runQuote = () => {
    setQuoting(true); setQuote(null);
    setTimeout(() => {
      setQuote({
        estimatedCredits: total,
        lines: [
          { label: current?.label ?? "视频生成", spec: `${duration} 秒 · 720P · ${model}`, points: total },
          { label: "参考素材", spec: `${files.length} 图 / ${files.filter((f) => f.kind === "video").length} 视频 / ${files.filter((f) => f.kind === "audio").length} 音频`, points: 0 },
          ...(extra > 0 ? [{ label: "选项附加", spec: "方言/口播等", points: extra }] : []),
        ],
        fingerprint: "mock_fp_" + Date.now(),
      });
      setQuoting(false);
    }, 400);
  };

  const submit = () => {
    const j: Job = { id: `j${Date.now()}`, label: current?.label ?? "视频创意", progress: 6, status: "running" };
    setJobs((p) => [j, ...p]);
    push({ tone: "success", title: "已提交创作", description: `${current?.label ?? ""} · ${duration}秒` });
    const timer = setInterval(() => {
      setJobs((prev) => prev.map((x) => (x.id === j.id ? { ...x, progress: Math.min(100, x.progress + 9), status: x.progress >= 100 ? "done" : "running" } : x)));
    }, 400);
    setTimeout(() => clearInterval(timer), 4800);
  };

  // 行内注释：队列操作 —— 重生成按原参数再跑一条，下载走 toast（mock 直链）
  const regenJob = (id: string, label: string) => {
    const j: Job = { id: `j${Date.now()}`, label, progress: 6, status: "running" };
    setJobs((p) => [j, ...p]);
    push({ tone: "neutral", title: "已重新生成", description: label });
    const timer = setInterval(() => {
      setJobs((prev) => prev.map((x) => (x.id === j.id ? { ...x, progress: Math.min(100, x.progress + 12), status: x.progress >= 100 ? "done" : "running" } : x)));
    }, 350);
    setTimeout(() => clearInterval(timer), 4200);
    void id;
  };
  const downloadJob = (label: string) => push({ tone: "success", title: "下载已开始", description: `${label} · 720P 成片` });

  return (
    <ToolLayout
      title="视频创意"
      description="19 套技能包 · 动态选项组 · 配置化渲染"
      breadcrumbs={[{ label: "工具箱", href: "/toolbox" }, { label: "创作", href: "/toolbox" }, { label: "视频创意" }]}
      params={
        <>
          <FieldGroup title="技能包分类">
            <Tabs
              items={VIDEO_SKILL_CATEGORIES.map((c) => ({ id: c.key, label: c.label, count: VIDEO_SKILLS.filter((s) => s.category === c.key).length }))}
              value={category}
              onChange={(id) => {
                setCategory(id as SkillCategory);
                const first = VIDEO_SKILLS.find((s) => s.category === id);
                if (first) setSkill(first.key);
              }}
            />
            <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
              {skills.map((s) => (
                <li key={s.key}>
                  <button type="button" onClick={() => setSkill(s.key)} aria-pressed={skill === s.key}
                    className={cn("w-full rounded-sm border px-3 py-2 text-left transition-colors", skill === s.key ? "border-accent bg-accent-soft/30" : "border-line bg-surface-2 hover:border-line-strong")}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm text-fg">{s.label}</span>
                      {skill === s.key && <Badge tone="accent">已选</Badge>}
                    </span>
                    <span className="mt-0.5 block text-xs text-fg-subtle">{s.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </FieldGroup>

          {current && (
            <FieldGroup title={`${current.label} · 选项组`} description="后台可配置，此处按配置渲染">
              {groups.map((g) => (
                <div key={g.key}>
                  <Label className="mb-1.5 block">{g.label}{g.extra ? <span className="tabular ml-1 text-[11px] text-fg-subtle">+{g.extra}积分</span> : null}</Label>
                  {g.type === "pills" && (
                    <div className="flex flex-wrap gap-1.5">
                      {(g.options ?? []).map((o) => (
                        <button key={o} type="button" onClick={() => setOpt(g.key, o)} aria-pressed={getOpt(g.key) === o}
                          className={cn("rounded-xs border px-2.5 py-1.5 text-xs transition-colors", getOpt(g.key) === o ? "border-accent bg-accent-soft/40 text-fg" : "border-line bg-surface-2 text-fg-muted hover:border-line-strong")}>{o}</button>
                      ))}
                    </div>
                  )}
                  {g.type === "select" && (
                    <Select value={(getOpt(g.key) as string) ?? ""} onChange={(e) => setOpt(g.key, e.target.value)} aria-label={g.label}>
                      <option value="">请选择…</option>
                      {(g.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </Select>
                  )}
                  {g.type === "switch" && (
                    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-fg">
                      <Checkbox checked={!!getOpt(g.key)} onChange={(e) => setOpt(g.key, e.target.checked)} />{g.hint ?? "启用"}
                    </label>
                  )}
                  {g.type === "text" && (
                    <input value={(getOpt(g.key) as string) ?? ""} onChange={(e) => setOpt(g.key, e.target.value)} placeholder={g.hint} aria-label={g.label}
                      className="h-9 w-full rounded-sm border border-line bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none" />
                  )}
                </div>
              ))}
            </FieldGroup>
          )}

          <FieldGroup title="参考素材" description={current ? `最多 ${current.refSlots.images} 图 + ${current.refSlots.videos} 视频 + ${current.refSlots.audios} 音频` : undefined}>
            <UploadSlots label="上传素材" accept="image/*,video/*,audio/*" max={10} value={files} onChange={setFiles} />
          </FieldGroup>

          <FieldGroup title="创作要求">
            <div><Label htmlFor="vc-prompt" className="mb-1.5 block">内容要求</Label>
              <Textarea id="vc-prompt" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例：突出产品材质细节与使用场景，前5秒口播卖点，后10秒切换实拍演示" /></div>
          </FieldGroup>

          <FieldGroup title="输出规格">
            <div><Label htmlFor="vc-model" className="mb-1.5 block">模型</Label>
              <Select id="vc-model" value={model} onChange={(e) => setModel(e.target.value)}>
                {MODELS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </Select></div>
            <div><Label className="mb-1.5 block">时长</Label>
              <div className="flex gap-2">
                {[{ k: "5", l: "5 秒" }, { k: "15", l: "15 秒" }, { k: "30", l: "30 秒" }].map((d) => (
                  <button key={d.k} type="button" onClick={() => setDuration(d.k)} aria-pressed={duration === d.k}
                    className={cn("flex-1 rounded-sm border px-2 py-1.5 text-xs transition-colors", duration === d.k ? "border-accent bg-accent-soft/40 text-fg" : "border-line bg-surface-2 text-fg-muted hover:border-line-strong")}>{d.l}</button>
                ))}
              </div></div>
          </FieldGroup>

          <Button variant="secondary" onClick={runQuote} className="w-full" disabled={quoting}>重新报价（约{total}积分）</Button>
          <QuotePanel quote={quote} balance={2480} loading={quoting} onConfirm={submit} confirmText="开始创作" disabled={!prompt.trim()} />
        </>
      }
      results={
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Layers className="size-4 text-accent" aria-hidden />技能包结构</CardTitle>
              <Badge tone="neutral">19 套已配置</Badge>
            </CardHeader>
            <CardBody className="space-y-3">
              {current ? (
                <div className="rounded-sm border border-line bg-surface-2 p-4">
                  <p className="text-sm font-medium text-fg">{current.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-fg-muted">{current.description}</p>
                  <dl className="tabular mt-3 grid grid-cols-3 gap-3 border-t border-line pt-3 text-xs">
                    {[{ k: "图片槽位", v: current.refSlots.images }, { k: "视频槽位", v: current.refSlots.videos }, { k: "音频槽位", v: current.refSlots.audios }].map((s) => (
                      <div key={s.k}><dt className="text-fg-subtle">{s.k}</dt><dd className="mt-0.5 text-fg">{s.v}</dd></div>
                    ))}
                  </dl>
                  <p className="mt-2 text-[11px] text-fg-subtle">{groups.length} 个选项组已渲染 · 切换技能包选项自动切换</p>
                </div>
              ) : (
                <EmptyState icon={<Clapperboard className="size-5" />} title="选择一个技能包" description="从左侧分类中选择" />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clapperboard className="size-4 text-accent" aria-hidden />创作队列</CardTitle>
              {jobs.length > 0 && <Badge tone="accent">{jobs.filter((j) => j.status === "done").length} / {jobs.length} 完成</Badge>}
            </CardHeader>
            <CardBody>
              {jobs.length === 0 ? (
                <EmptyState icon={<Clapperboard className="size-5" />} title="暂无创作任务" description="填好选项组与内容要求后提交" />
              ) : (
                <ul className="space-y-2">
                  {jobs.map((j, i) => (
                    <li key={j.id} className="rounded-sm border border-line bg-surface-2 p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-fg">{j.label}</span>
                        <Badge tone={j.status === "done" ? "success" : "accent"}>{j.status === "done" ? "已完成" : `${j.progress}%`}</Badge>
                        {j.status === "done" && (
                          <span className="flex gap-1">
                            <Button variant="ghost" size="icon-sm" aria-label="重新生成" onClick={() => regenJob(j.id, j.label)}><RefreshCw className="size-3" /></Button>
                            <Button variant="ghost" size="icon-sm" aria-label="下载" onClick={() => downloadJob(j.label)}><Download className="size-3" /></Button>
                          </span>
                        )}
                      </div>
                      {j.status === "running" && <Progress value={j.progress} className="mt-2" label={`${j.label}进度`} />}
                      {j.status === "done" && (
                        <div className="mt-2 overflow-hidden rounded-xs border border-line">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/images/toapi/result-${(i % 6) + 1}.png`} alt={j.label} className="aspect-video w-full object-cover" />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </>
      }
    />
  );
}
