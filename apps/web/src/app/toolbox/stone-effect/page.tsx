"use client";

import { useMemo, useState } from "react";
import { ToolLayout } from "@/components/features/ToolLayout";
import { FieldGroup, QuotePanel, type QuoteResult } from "@/components/features/QuotePanel";
import { UploadSlots, type UploadedFile } from "@/components/features/UploadSlots";
import { Button, Input, Label, Select, Textarea } from "@/components/ui/primitives";
import { Card, CardBody, CardHeader, CardTitle, Badge, EmptyState, Progress } from "@/components/ui/surfaces";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/features/ToastHost";
import { Mountain, Layers, RefreshCw, Download, Wand2 } from "lucide-react";

// E3 上传石材图生成空间效果图：材质锚定 → 场景模板 → 2K/4K → 3视角 → 一致性校验 → 人工精修兜底
// 行内注释1：材质锚定 = 主色提取 + 纹理描述 + 结构化material_desc，可手动微调
// 行内注释2：14类空间模板按室内/外立面/部件分组，软装灯光配置随模板联动
// 行内注释3：3视角版本一次提交3条，按条结算；全局失败进人工精修队列
// TODO(API): 接入 POST /stone/effect-jobs（材质锚定+模板+规格）与 GET /stone/scene-templates
const SCENE_GROUPS = [
  {
    group: "酒店公区",
    items: [
      { key: "lobby", label: "酒店大堂", prompt: "挑高大堂，石材背景墙+灯带，镜面地砖反射" },
      { key: "banquet", label: "宴会厅", prompt: "无柱宴会厅，暖色灯光，石材柱面" },
      { key: "reception", label: "前台接待", prompt: "前台背景墙发光字，石材台面" },
      { key: "elevator", label: "电梯厅", prompt: "电梯门套石材，筒灯阵列" },
      { key: "guestroom", label: "客房", prompt: "客房床头背景墙，柔光阅读灯" },
    ],
  },
  {
    group: "商业与外立面",
    items: [
      { key: "courtyard", label: "庭院", prompt: "庭院铺装+水景，石材汀步" },
      { key: "club", label: "会所", prompt: "会所 lounge，石材吧台+软包" },
      { key: "exhibit", label: "展厅", prompt: "展厅长走廊，石材展墙+射灯" },
      { key: "facade", label: "幕墙", prompt: "建筑外立面干挂石材，日景+夜景" },
      { key: "paving", label: "地面铺装", prompt: "广场地面拼花，防滑面" },
    ],
  },
  {
    group: "住宅部件",
    items: [
      { key: "wall", label: "墙面干挂", prompt: "客厅电视背景墙整面干挂" },
      { key: "feature", label: "背景墙", prompt: "沙发背景墙+隐藏灯带" },
      { key: "vanity", label: "洗手台", prompt: "洗手台台面+挡水条，镜柜" },
      { key: "stairs", label: "楼梯踏步", prompt: "楼梯踏步+踢面一体，地脚灯" },
    ],
  },
];

const ALL_SCENES = SCENE_GROUPS.flatMap((g) => g.items);

export default function StoneEffectPage() {
  const { push } = useToast();
  // 行内注释4：素材与锚定状态
  const [stones, setStones] = useState<UploadedFile[]>([]);
  const [mainColor, setMainColor] = useState("#d8d2c4");
  const [textureDesc, setTextureDesc] = useState("米白底、灰色网纹、纹理细腻通体");
  const [scene, setScene] = useState("lobby");
  const [lighting, setLighting] = useState("daylight");
  const [resolution, setResolution] = useState("2k");
  const [views, setViews] = useState<string[]>(["正视", "侧视 30°", "俯视细节"]);
  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [jobs, setJobs] = useState<{ view: string; progress: number; status: "pending" | "running" | "done" | "failed"; img?: string }[]>([]);
  const [consistency, setConsistency] = useState<number | null>(null);
  const [refineNote, setRefineNote] = useState("");

  // 行内注释5：单价规则 —— 2K 8积分/张，4K 12积分/张，3视角打包
  const unit = resolution === "4k" ? 12 : 8;
  const total = unit * views.length;

  const sceneObj = useMemo(() => ALL_SCENES.find((s) => s.key === scene), [scene]);

  // 行内注释6：报价 —— lines拆出材质锚定（0积分）与多视角明细
  const runQuote = () => {
    setQuoting(true);
    setQuote(null);
    setTimeout(() => {
      setQuote({
        estimatedCredits: total,
        lines: [
          { label: "石材空间效果图", spec: `${sceneObj?.label} · ${resolution.toUpperCase()} · ${views.length}视角`, points: total },
          { label: "材质锚定", spec: textureDesc.slice(0, 12), points: 0 },
        ],
        fingerprint: "mock_fp_" + Date.now(),
      });
      setQuoting(false);
    }, 420);
  };

  // 行内注释7：提交 —— 3条并行跑进度，随机一条失败演示一致性校验与重试
  const submit = () => {
    setConsistency(null);
    setJobs(views.map((v) => ({ view: v, progress: 5, status: "running" })));
    views.forEach((v, idx) => {
      const timer = setInterval(() => {
        setJobs((prev) =>
          prev.map((j) =>
            j.view === v
              ? { ...j, progress: Math.min(100, j.progress + 9 + idx * 2), status: j.progress >= 100 ? "done" : "running", img: j.progress >= 60 ? `/images/toapi/result-${(idx % 6) + 1}.png` : j.img }
              : j
          )
        );
      }, 380);
      setTimeout(() => {
        clearInterval(timer);
        setJobs((prev) => prev.map((j) => (j.view === v ? { ...j, progress: 100, status: idx === 1 && consistency === null ? "failed" : "done" } : j)));
        // 行内注释8：一致性校验 —— 颜色直方图偏差 mock 0.08~0.2，超0.15判失败重生成
        if (idx === views.length - 1) setTimeout(() => setConsistency(0.11), 600);
      }, 2600 + idx * 700);
    });
  };

  // 行内注释9：单视角重试 —— 只重跑失败那条
  const retryView = (view: string) => {
    push({ tone: "neutral", title: "已重生成", description: `${view} · 同模板新种子` });
    setJobs((prev) => prev.map((j) => (j.view === view ? { ...j, progress: 8, status: "running" } : j)));
    setTimeout(() => setJobs((prev) => prev.map((j) => (j.view === view ? { ...j, progress: 100, status: "done", img: "/images/toapi/result-2.png" } : j))), 1600);
  };

  // 行内注释：效果图结果操作 —— 下载走 toast，人工精修进队列
  const downloadView = (view: string) => push({ tone: "success", title: "下载已开始", description: `${view} · ${resolution.toUpperCase()}效果图` });
  const toRefine = () => {
    if (!refineNote.trim()) { push({ tone: "warning", title: "请先填写精修要求", description: "描述纹理/灯光/构图需要调整的地方" }); return; }
    push({ tone: "success", title: "已转人工精修", description: `${jobs.filter((j) => j.status === "failed").length || jobs.length} 张进队列 · 预计 2 小时内回传` });
  };

  return (
    <ToolLayout
      title="石材效果图"
      description="材质锚定 → 14类场景模板 → 3视角成图"
      breadcrumbs={[{ label: "工具箱", href: "/toolbox" }, { label: "行业", href: "/toolbox" }, { label: "石材效果图" }]}
      params={
        <>
          <FieldGroup title="上传石材图" description="自动提取主色与纹理，可手动微调">
            <UploadSlots label="上传石材实拍" accept="image/*" max={4} value={stones} onChange={setStones} hint="建议正面平铺、光线均匀" />
            <div className="grid grid-cols-[auto_1fr] items-center gap-3">
              <div>
                <Label className="mb-1 block text-[11px]">主色</Label>
                <input type="color" value={mainColor} onChange={(e) => setMainColor(e.target.value)} aria-label="材质主色" className="h-9 w-14 cursor-pointer rounded-xs border border-line bg-surface-2" />
              </div>
              <div>
                <Label htmlFor="tex" className="mb-1 block text-[11px]">纹理结构化描述</Label>
                <Input id="tex" value={textureDesc} onChange={(e) => setTextureDesc(e.target.value)} />
              </div>
            </div>
            <p className="tabular text-[11px] text-fg-subtle">锚定指纹 {mainColor} · {textureDesc.length}字 · 后端存 material_desc</p>
          </FieldGroup>

          <FieldGroup title="场景模板（14类）" description={sceneObj?.prompt}>
            {SCENE_GROUPS.map((g) => (
              <div key={g.group}>
                <p className="mb-1.5 text-[11px] font-medium text-fg-muted">{g.group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((s) => (
                    <button key={s.key} type="button" onClick={() => setScene(s.key)} aria-pressed={scene === s.key}
                      className={cn("rounded-xs border px-2.5 py-1.5 text-xs transition-colors", scene === s.key ? "border-accent bg-accent-soft/40 text-fg" : "border-line bg-surface-2 text-fg-muted hover:border-line-strong")}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="light" className="mb-1 block text-[11px]">软装灯光</Label>
                <Select id="light" value={lighting} onChange={(e) => setLighting(e.target.value)}>
                  <option value="daylight">日光 · 自然光</option>
                  <option value="warm">暖光 · 酒店模式</option>
                  <option value="spot">射灯 · 展厅模式</option>
                  <option value="night">夜景 · 外立面</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="res" className="mb-1 block text-[11px]">输出规格</Label>
                <Select id="res" value={resolution} onChange={(e) => setResolution(e.target.value)}>
                  <option value="2k">2K（8积分/张）</option>
                  <option value="4k">4K 高精（12积分/张）</option>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-[11px]">视角版本（3视角可增删）</Label>
              <div className="space-y-1.5">
                {views.map((v, i) => (
                  <div key={v} className="flex items-center gap-2">
                    <Input value={v} onChange={(e) => setViews((p) => p.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`视角${i + 1}`} />
                    {views.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => setViews((p) => p.filter((_, j) => j !== i))} aria-label={`删除${v}`}>删</Button>
                    )}
                  </div>
                ))}
                {views.length < 5 && (
                  <Button variant="ghost" size="sm" onClick={() => setViews((p) => [...p, `特写 ${p.length + 1}`])}>+ 加视角</Button>
                )}
              </div>
            </div>
          </FieldGroup>

          <Button variant="secondary" onClick={runQuote} className="w-full" disabled={quoting || stones.length === 0}>
            {stones.length === 0 ? "先上传石材图" : "重新报价"}
          </Button>
          <QuotePanel quote={quote} balance={2480} loading={quoting} onConfirm={submit} confirmText={`生成 ${views.length} 视角 · ${total}积分`} disabled={stones.length === 0} />
        </>
      }
      results={
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Layers className="size-4 text-accent" aria-hidden />{views.length} 视角版本</CardTitle>
              {consistency !== null && <Badge tone={consistency > 0.15 ? "danger" : "success"}>色差 {consistency.toFixed(2)}{consistency > 0.15 ? " · 超阈重生成" : " · 通过"}</Badge>}
            </CardHeader>
            <CardBody>
              {jobs.length === 0 ? (
                <EmptyState icon={<Mountain className="size-5" />} title="尚未生成" description="上传石材图 → 选场景模板 → 报价确认" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {jobs.map((j) => (
                    <figure key={j.view} className="overflow-hidden rounded-sm border border-line bg-surface-2">
                      <div className="aspect-[4/3] bg-surface-3">
                        {j.img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={j.img} alt={j.view} className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center"><span className="text-xs text-fg-subtle">{j.view} 生成中…</span></div>
                        )}
                      </div>
                      <figcaption className="space-y-1.5 p-2.5">
                        <span className="flex items-center justify-between text-xs"><span className="text-fg">{j.view}</span>
                          <Badge tone={j.status === "done" ? "success" : j.status === "failed" ? "danger" : "accent"}>{j.status === "done" ? "已完成" : j.status === "failed" ? "色差超阈" : `${j.progress}%`}</Badge>
                        </span>
                        {j.status === "running" && <Progress value={j.progress} label={`${j.view}进度`} />}
                        <span className="flex gap-1.5">
                          {j.status === "failed" && <Button variant="secondary" size="sm" onClick={() => retryView(j.view)}><RefreshCw className="size-3" aria-hidden />重生成</Button>}
                          <Button variant="ghost" size="sm" disabled={j.status !== "done"} onClick={() => downloadView(j.view)}><Download className="size-3" aria-hidden />下载</Button>
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Wand2 className="size-4 text-accent" aria-hidden />人工精修兜底</CardTitle><Badge tone="neutral">全局失败进队列</Badge></CardHeader>
            <CardBody className="space-y-2.5">
              <Textarea rows={3} value={refineNote} onChange={(e) => setRefineNote(e.target.value)} placeholder="例：背景墙纹理对缝不齐，要求通纹；地面反射过强需压暗" aria-label="精修要求" />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" disabled={jobs.length === 0} onClick={toRefine}>转人工精修</Button>
                <Button variant="ghost" size="sm" onClick={() => { setConsistency(0.09); push({ tone: "success", title: "一致性校验通过", description: "色差 0.09 · 3视角材质一致" }); }}>重跑一致性校验</Button>
              </div>
              <p className="text-[11px] leading-relaxed text-fg-subtle">校验规则：颜色直方图偏差 &gt; 0.15 自动重生成，重试仍失败转人工。TODO(API): 接入 POST /stone/refine-queue。</p>
            </CardBody>
          </Card>
        </>
      }
    />
  );
}
