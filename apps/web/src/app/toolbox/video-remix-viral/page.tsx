"use client";

import { useMemo, useState } from "react";
import { ToolLayout } from "@/components/features/ToolLayout";
import { FieldGroup, QuotePanel, type QuoteResult } from "@/components/features/QuotePanel";
import { UploadSlots, type UploadedFile } from "@/components/features/UploadSlots";
import { Button, Input, Label, Select, Textarea, Checkbox } from "@/components/ui/primitives";
import { Card, CardBody, CardHeader, CardTitle, Badge, EmptyState, Progress } from "@/components/ui/surfaces";
import { Split, Play, ArrowUp, ArrowDown, RefreshCw, Download, Music2, Type } from "lucide-react";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/features/ToastHost";

// B8 一键爆款重组：原片拆分为分镜 → 分镜重组（排序/替换钩子/BGM/字幕） → 风格统一重排成片
// 行内注释1：拆条 = 语义段落切分，mock 4段，可逐段改名与调序
// 行内注释2：重组参数 = 开头钩子 + BGM节奏 + 字幕风格，全局应用到 N 条裂变
// 行内注释3：N条裂变差异 = 每条钩子文案轮换 + 封面帧不同，批量按条结算
// TODO(API): 接入 POST /remix-jobs（含 segments + remix_params + count）
interface Fragment {
  id: string;
  index: number;
  start: number;
  end: number;
  label: string;
  keep: boolean;
}

interface Variant {
  id: string;
  hook: string;
  status: "pending" | "running" | "done";
  progress: number;
}

export default function VideoRemixViralPage() {
  const { push } = useToast();
  const [source, setSource] = useState<UploadedFile[]>([]);
  const [count, setCount] = useState(3);
  const [hook, setHook] = useState("conflict");
  const [bgm, setBgm] = useState("upbeat");
  const [caption, setCaption] = useState("bold");
  const [unify, setUnify] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  const kept = useMemo(() => fragments.filter((f) => f.keep), [fragments]);

  // 行内注释4：拆条 mock —— 按语义切 4 段，label 可改，keep 决定是否参与重组
  const split = () => {
    const segs: Array<[number, number, string]> = [
      [0, 3.2, "开场钩子段"],
      [3.2, 6.8, "产品特写段"],
      [6.8, 10.5, "演示段"],
      [10.5, 13.1, "收尾转化段"],
    ];
    setFragments(segs.map(([s, e, label], i) => ({ id: `f${Date.now()}_${i}`, index: i + 1, start: s, end: e, label, keep: true })));
    setVariants([]);
  };

  const moveFrag = (id: string, dir: -1 | 1) => {
    setFragments((prev) => {
      const i = prev.findIndex((f) => f.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((f, k) => ({ ...f, index: k + 1 }));
    });
  };

  // 行内注释5：报价 —— 45积分/条 × 条数，拆条免费，重组参数不加价
  const runQuote = () => {
    setQuoting(true); setQuote(null);
    setTimeout(() => {
      setQuote({
        estimatedCredits: 45 * count,
        lines: [
          { label: "一键裂变", spec: `${count} 条 · ${kept.length}段重组 · 钩子${hook}`, points: 45 * count },
          { label: "拆条", spec: `${fragments.length}段 · ${unify ? "风格统一" : "保持原风格"}`, points: 0 },
        ],
        fingerprint: "mock_fp_" + Date.now(),
      });
      setQuoting(false);
    }, 400);
  };

  // 行内注释6：生成 —— N条并行跑进度，mock 逐条完成
  const generate = () => {
    const hooks = ["冲突开场", "疑问开场", "结果前置", "前后对比", "痛点开场"];
    setVariants(Array.from({ length: count }, (_, i) => ({ id: `v${Date.now()}_${i}`, hook: `${hooks[i % hooks.length]} ${i + 1}`, status: "running", progress: 5 })));
    push({ tone: "success", title: "已提交裂变", description: `${count} 条 · ${kept.length}段重组` });
    Array.from({ length: count }, (_, i) => {
      const timer = setInterval(() => {
        setVariants((prev) => prev.map((v, k) => (k === i ? { ...v, progress: Math.min(100, v.progress + 11), status: v.progress >= 100 ? "done" : "running" } : v)));
      }, 350);
      setTimeout(() => clearInterval(timer), 3200 + i * 500);
    });
  };

  // 行内注释：裂变结果操作 —— 换钩子轮换文案并重跑该条，下载走 toast
  const swapHook = (id: string) => {
    const hooks = ["冲突开场", "疑问开场", "结果前置", "前后对比", "痛点开场"];
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, hook: hooks[Math.floor(Math.random() * hooks.length)], status: "running", progress: 8 } : v)));
    push({ tone: "neutral", title: "已换钩子重生成", description: id });
    setTimeout(() => setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, status: "done", progress: 100 } : v))), 1800);
  };
  const downloadVariant = (hookText: string) => push({ tone: "success", title: "下载已开始", description: `${hookText} · 720P 成片` });

  return (
    <ToolLayout
      title="一键裂变"
      description="拆条 → 重组 → 风格统一 · 一段母片裂变多条"
      breadcrumbs={[{ label: "工具箱", href: "/toolbox" }, { label: "创作", href: "/toolbox" }, { label: "一键裂变" }]}
      params={
        <>
          <FieldGroup title="原视频" description="一条母片，裂变多条">
            <UploadSlots label="上传原视频" accept="video/*" max={1} multiple={false} value={source} onChange={setSource} />
          </FieldGroup>

          <FieldGroup title="拆条结果" description={fragments.length ? "可改名/调序/剔除，不参与段不计入成片" : "先点下方拆条"}>
            <div className="mb-2 flex gap-2">
              <Button variant="secondary" size="sm" onClick={split} disabled={source.length === 0} className="flex-1">
                <Split className="size-3.5" aria-hidden />{fragments.length ? "重新拆条" : "拆条"}
              </Button>
            </div>
            {fragments.length > 0 && (
              <ol className="space-y-1.5">
                {fragments.map((f) => (
                  <li key={f.id} className={cn("flex items-center gap-2 rounded-sm border px-2 py-1.5", f.keep ? "border-line bg-surface-2" : "border-dashed border-line opacity-60")}>
                    <Checkbox checked={f.keep} onChange={(e) => setFragments((p) => p.map((x) => (x.id === f.id ? { ...x, keep: e.target.checked } : x)))} aria-label={`保留${f.label}`} />
                    <span className="tabular w-24 shrink-0 text-[11px] text-fg-subtle">{f.start.toFixed(1)}s–{f.end.toFixed(1)}s</span>
                    <Input value={f.label} onChange={(e) => setFragments((p) => p.map((x) => (x.id === f.id ? { ...x, label: e.target.value } : x)))} aria-label="分镜名称" className="h-7 flex-1" />
                    <Button variant="ghost" size="icon-sm" aria-label="上移" onClick={() => moveFrag(f.id, -1)}><ArrowUp className="size-3" /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label="下移" onClick={() => moveFrag(f.id, 1)}><ArrowDown className="size-3" /></Button>
                  </li>
                ))}
              </ol>
            )}
          </FieldGroup>

          <FieldGroup title="重组参数" description="应用到全部裂变条">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="mb-1 block text-[11px]">开头钩子</Label>
                <Select value={hook} onChange={(e) => setHook(e.target.value)} aria-label="开头钩子">
                  <option value="conflict">冲突开场</option><option value="question">疑问开场</option>
                  <option value="result">结果前置</option><option value="contrast">前后对比</option>
                </Select></div>
              <div><Label className="mb-1 block text-[11px]">BGM 节奏</Label>
                <Select value={bgm} onChange={(e) => setBgm(e.target.value)} aria-label="BGM节奏">
                  <option value="upbeat"> upbeat 快节奏</option><option value="chill">chill 松弛</option><option value="epic">epic 大气</option>
                </Select></div>
            </div>
            <div><Label className="mb-1 block text-[11px]">字幕风格</Label>
              <Select value={caption} onChange={(e) => setCaption(e.target.value)} aria-label="字幕风格">
                <option value="bold">大字粗体</option><option value="minimal">极简小字</option><option value="karaoke">卡拉OK</option>
              </Select></div>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-fg">
              <Checkbox checked={unify} onChange={(e) => setUnify(e.target.checked)} />风格统一（色调/BGM/字幕对齐）
            </label>
            <div><Label htmlFor="remix-prompt" className="mb-1.5 block">每条的差异点</Label>
              <Textarea id="remix-prompt" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例：保留产品特写与演示段，替换前3秒钩子文案与BGM节奏" /></div>
          </FieldGroup>

          <FieldGroup title="裂变条数">
            <div><Label htmlFor="remix-count" className="mb-1.5 block">一次生成几条</Label>
              <Select id="remix-count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[2, 3, 5, 8, 10].map((n) => <option key={n} value={n}>{n} 条</option>)}
              </Select></div>
            <Button variant="secondary" onClick={runQuote} disabled={quoting || kept.length === 0} className="w-full">重新报价（{45 * count}积分）</Button>
            <QuotePanel quote={quote} balance={2480} loading={quoting} onConfirm={generate} confirmText="生成裂变" disabled={kept.length === 0} />
          </FieldGroup>
        </>
      }
      results={
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Play className="size-4 text-accent" aria-hidden />裂变序列</CardTitle>
            {variants.length > 0 && <Badge tone="neutral">{variants.filter((v) => v.status === "done").length} / {variants.length} 完成</Badge>}
          </CardHeader>
          <CardBody>
            {variants.length === 0 ? (
              <EmptyState icon={<Split className="size-5" />} title="尚未生成" description="拆条 → 设重组参数 → 报价确认后裂变" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {variants.map((v, i) => (
                  <figure key={v.id} className="overflow-hidden rounded-sm border border-line bg-surface-2">
                    <div className="aspect-video bg-surface-3">
                      {v.status === "done" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/images/toapi/result-${(i % 6) + 1}.png`} alt={v.hook} className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center"><Progress value={v.progress} className="w-2/3" label={`${v.hook}进度`} /></div>
                      )}
                    </div>
                    <figcaption className="space-y-1.5 p-2.5">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-fg">{v.hook}</span>
                        <Badge tone={v.status === "done" ? "success" : "accent"}>{v.status === "done" ? "已完成" : `${v.progress}%`}</Badge>
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-fg-subtle"><Type className="size-3" aria-hidden />{caption} · <Music2 className="size-3" aria-hidden />{bgm}</span>
                      {v.status === "done" && (
                        <span className="flex gap-1.5">
                          <Button variant="ghost" size="sm" onClick={() => swapHook(v.id)}><RefreshCw className="size-3" aria-hidden />换钩子</Button>
                          <Button variant="ghost" size="sm" onClick={() => downloadVariant(v.hook)}><Download className="size-3" aria-hidden />下载</Button>
                        </span>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      }
    />
  );
}
