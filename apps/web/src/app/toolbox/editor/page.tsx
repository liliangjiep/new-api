"use client";

import { useMemo, useState } from "react";
import { StudioShell } from "@/components/layout/StudioShell";
import { Button, Input, Label, Textarea } from "@/components/ui/primitives";
import { Card, CardBody, CardHeader, CardTitle, Badge, EmptyState, Progress, Tabs } from "@/components/ui/surfaces";
import { UploadSlots, type UploadedFile } from "@/components/features/UploadSlots";
import { Scissors, Music2, Type, Layers, Play, Pause, Plus, Split, Trash2, Undo2, Save, Download, Quote } from "lucide-react";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/features/ToastHost";

interface Track {
  id: string;
  kind: "video" | "audio" | "text";
  name: string;
  startPct: number;
  widthPct: number;
  color: string;
  volume?: number;
  text?: string;
}

interface Segment {
  id: string;
  name: string;
  start: number;
  end: number;
  status: "idle" | "quoted" | "retaking" | "done";
  quote?: number;
}

/**
 * 剪辑台 —— 完整前端交互（mediabunny 客户端合成占位）
 * 行内注释1：轨道 = 时间轴渲染模型，startPct/widthPct 即 clip 在 15s 总长上的位置
 * 行内注释2：分段 = 可独立重生成的镜头段，每段可单独报价重生成（/video-segment-retake/quote）
 * 行内注释3：导出走客户端合成 mock —— 进度条 + 合成日志，不消耗积分
 * 行内注释4：工程快照存 localStorage mock，刷新可恢复
 * TODO(API): 接入 mediabunny 解码/合成；接入 /video-segment-retake/quote 真实报价
 * TODO(EDITOR): 时间轴拖拽 clip 改用指针事件精确到帧（当前按 % 步进 1%）
 */
const TOTAL_SEC = 15;

export default function EditorPage() {
  const { push } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(34);
  const [zoom, setZoom] = useState(1);
  const [sideTab, setSideTab] = useState("media");
  const [resolution, setResolution] = useState("1080P");
  const [fps, setFps] = useState("30");
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderLog, setRenderLog] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([
    { id: "t1", kind: "video", name: "主轨道 · 素材_01.mp4", startPct: 0, widthPct: 62, color: "accent" },
    { id: "t2", kind: "audio", name: "背景音乐", startPct: 0, widthPct: 100, color: "info", volume: 60 },
    { id: "t3", kind: "text", name: "字幕 · 开场", startPct: 8, widthPct: 22, color: "warning", text: "新品上市 · 门店实拍" },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>("t1");
  const [segments, setSegments] = useState<Segment[]>([
    { id: "seg1", name: "镜头 1 · 外景推进", start: 0, end: 5, status: "idle" },
    { id: "seg2", name: "镜头 2 · 口播", start: 5, end: 11, status: "idle" },
    { id: "seg3", name: "镜头 3 · 细节特写", start: 11, end: 15, status: "idle" },
  ]);

  const selected = tracks.find((t) => t.id === selectedId) ?? null;
  const timeLabel = useMemo(() => {
    const s = Math.floor((position / 100) * TOTAL_SEC);
    return `00:00:${String(s).padStart(2, "0")} / 00:00:${TOTAL_SEC}`;
  }, [position]);

  // 行内注释5：播放头拖动 —— mock，直接设 position
  const seek = (v: number) => setPosition(Math.min(100, Math.max(0, Math.round(v))));

  const addTrack = (kind: Track["kind"]) => {
    const label = kind === "video" ? "视频" : kind === "audio" ? "音频" : "文本";
    const n = tracks.filter((x) => x.kind === kind).length + 1;
    const nt: Track = {
      id: `t${Date.now()}`, kind, name: `${label}轨道 ${n}`,
      startPct: 10, widthPct: 30,
      color: kind === "video" ? "accent" : kind === "audio" ? "info" : "warning",
      ...(kind === "audio" ? { volume: 60 } : {}),
      ...(kind === "text" ? { text: "新字幕" } : {}),
    };
    setTracks((t) => [...t, nt]);
    setSelectedId(nt.id);
  };

  const removeTrack = (id: string) => {
    setTracks((t) => t.filter((x) => x.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // 行内注释6：分割 —— 仅视频轨在播放头处一分为二
  const splitAtPlayhead = () => {
    setTracks((t) =>
      t.flatMap((track) => {
        if (track.kind !== "video") return [track];
        const offset = position - track.startPct;
        if (offset <= 4 || offset >= track.widthPct - 4) return [track];
        return [
          { ...track, widthPct: offset },
          { ...track, id: `${track.id}-b`, name: `${track.name} (2)`, startPct: position, widthPct: track.widthPct - offset },
        ];
      })
    );
  };

  // 行内注释7：裁剪 —— 选中 clip 左右各收 5%
  const trimSelected = () => {
    if (!selectedId) return;
    setTracks((t) => t.map((x) => (x.id === selectedId ? { ...x, startPct: x.startPct + 2, widthPct: Math.max(6, x.widthPct - 4) } : x)));
  };

  // 行内注释8：分段重生成报价 —— mock 8积分/段
  const quoteSegment = (id: string) => {
    setSegments((s) => s.map((x) => (x.id === id ? { ...x, status: "quoted" as const, quote: 8 } : x)));
  };
  const retakeSegment = (id: string) => {
    setSegments((s) => s.map((x) => (x.id === id ? { ...x, status: "retaking" as const } : x)));
    setTimeout(() => setSegments((s) => s.map((x) => (x.id === id ? { ...x, status: "done" as const } : x))), 1500);
  };

  // 行内注释9：渲染成片 —— 客户端合成 mock，进度 + 日志逐条追加
  const render = () => {
    if (rendering) return;
    setRendering(true); setRenderProgress(0); setRenderLog(["mediabunny: 解码 3 条轨道…"]);
    const steps = ["轨道 1 解码完成", "字幕栅格化完成", "音频混音完成", "muxer 合成中…", "导出 1080P30 完成"];
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setRenderProgress(Math.min(100, Math.round((i / (steps.length + 1)) * 100)));
      if (i - 1 < steps.length) setRenderLog((l) => [...l, `mediabunny: ${steps[i - 1]}`]);
      if (i > steps.length) { clearInterval(timer); setRendering(false); setRenderProgress(100); }
    }, 600);
  };

  const saveProject = () => {
    try { localStorage.setItem("xin-editor-snapshot", JSON.stringify({ tracks, segments, position })); } catch { /* ignore */ }
    setSavedAt(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
  };

  return (
    <StudioShell
      title="剪辑台"
      description="多轨时间轴 · 客户端合成（mediabunny）· 分段可单独报价重生成"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={saveProject}><Save className="size-3.5" aria-hidden />保存工程{savedAt ? ` · ${savedAt}` : ""}</Button>
          <Button variant="secondary" size="sm" disabled={rendering || renderProgress === 0} onClick={() => push({ tone: "success", title: "导出已开始", description: `${resolution} · ${fps}fps · MP4 已加入下载队列` })}><Download className="size-3.5" aria-hidden />导出</Button>
          <Button size="sm" onClick={render} disabled={rendering}>{rendering ? `合成中 ${renderProgress}%` : "渲染成片"}</Button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {/* 预览区 */}
          <Card className="overflow-hidden">
            <div className="relative aspect-video bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/toapi/result-1.png" alt="预览画面" className="size-full object-contain" />
              <div className="absolute left-3 top-3 flex gap-1.5">
                <Badge tone="neutral">{resolution}</Badge>
                <Badge tone="neutral">{fps} fps</Badge>
                <Badge tone="accent">客户端合成 · 免积分</Badge>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
                <Button variant="ghost" size="icon" aria-label={playing ? "暂停" : "播放"} onClick={() => setPlaying((v) => !v)} className="text-white hover:bg-white/10 hover:text-white">
                  {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                </Button>
                <span className="tabular text-xs text-white/80">{timeLabel}</span>
                <input type="range" min={0} max={100} value={position} onChange={(e) => seek(Number(e.target.value))} aria-label="播放进度" className="flex-1 accent-white" />
              </div>
            </div>
            {rendering && (
              <div className="space-y-1.5 border-t border-line px-4 py-3">
                <Progress value={renderProgress} label="合成进度" />
                <p className="tabular text-[11px] text-fg-subtle">{renderLog[renderLog.length - 1]}</p>
              </div>
            )}
          </Card>

          {/* 时间轴 */}
          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
              <Button variant="ghost" size="sm" onClick={splitAtPlayhead}><Split className="size-3.5" aria-hidden />分割</Button>
              <Button variant="ghost" size="sm" onClick={trimSelected} disabled={!selectedId}><Scissors className="size-3.5" aria-hidden />裁剪选中</Button>
              <Button variant="ghost" size="sm" disabled={!selectedId} onClick={() => selectedId && removeTrack(selectedId)}><Trash2 className="size-3.5" aria-hidden />删除选中</Button>
              <div className="ml-auto flex items-center gap-1">
                <label className="tabular mr-1 text-[11px] text-fg-subtle">缩放 {zoom.toFixed(1)}x</label>
                <input type="range" min={1} max={2} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="时间轴缩放" className="w-20" />
                <Button variant="ghost" size="icon-sm" aria-label="添加视频轨" onClick={() => addTrack("video")}><Plus className="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="添加音频轨" onClick={() => addTrack("audio")}><Music2 className="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="添加文本轨" onClick={() => addTrack("text")}><Type className="size-3.5" /></Button>
              </div>
            </div>
            <div className="relative overflow-x-auto">
              <div className="flex h-7 min-w-[560px] items-end border-b border-line px-3" style={{ transform: `scaleX(${zoom})`, transformOrigin: "left" }}>
                {Array.from({ length: TOTAL_SEC + 1 }, (_, i) => (
                  <span key={i} className="tabular flex-1 border-l border-line/60 pl-1 text-[10px] text-fg-subtle">{i}s</span>
                ))}
              </div>
              <div className="relative min-w-[560px]">
                {tracks.map((track) => (
                  <button
                    key={track.id} type="button" onClick={() => setSelectedId(track.id)}
                    className={cn("flex w-full items-center gap-2 border-b border-line/60 px-3 py-2 text-left", selectedId === track.id && "bg-accent-soft/30")}
                  >
                    <span className="flex w-28 shrink-0 items-center gap-1.5 text-[11px] text-fg-muted">
                      {track.kind === "video" && <Layers className="size-3" aria-hidden />}
                      {track.kind === "audio" && <Music2 className="size-3" aria-hidden />}
                      {track.kind === "text" && <Type className="size-3" aria-hidden />}
                      <span className="truncate">{track.name}</span>
                    </span>
                    <span className="relative h-8 flex-1 rounded-xs bg-surface-2">
                      <span
                        className={cn("absolute inset-y-1 rounded-xs", track.color === "accent" && "bg-accent/70", track.color === "info" && "bg-info/60", track.color === "warning" && "bg-warning/60")}
                        style={{ left: `${track.startPct}%`, width: `${track.widthPct}%` }}
                      />
                    </span>
                    <Undo2 className="size-3 text-transparent" aria-hidden />
                  </button>
                ))}
                <div className="pointer-events-none absolute inset-y-0 w-px bg-accent" style={{ left: `calc(132px + ${position}% * 0.85)` }} aria-hidden />
              </div>
            </div>
          </Card>

          {/* 分段重生成 */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Quote className="size-4 text-accent" aria-hidden />分段 · 单独报价重生成</CardTitle><Badge tone="neutral">8积分/段</Badge></CardHeader>
            <CardBody className="space-y-2">
              {segments.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-sm border border-line bg-surface-2 px-3 py-2">
                  <span className="min-w-0 flex-1 text-sm text-fg"><span className="font-medium">{s.name}</span><span className="tabular ml-2 text-[11px] text-fg-subtle">{s.start}s–{s.end}s</span></span>
                  <Badge tone={s.status === "done" ? "success" : s.status === "retaking" ? "warning" : s.status === "quoted" ? "accent" : "neutral"}>
                    {s.status === "done" ? "已重生成" : s.status === "retaking" ? "重生成中…" : s.status === "quoted" ? `已报价 ${s.quote}积分` : "未报价"}
                  </Badge>
                  {s.status === "idle" && <Button variant="secondary" size="sm" onClick={() => quoteSegment(s.id)}>报价</Button>}
                  {s.status === "quoted" && <Button size="sm" onClick={() => retakeSegment(s.id)}>确认重生成</Button>}
                </div>
              ))}
              <p className="text-[11px] text-fg-subtle">TODO(API): 接入 POST /video-segment-retake/quote，报价指纹防篡改。</p>
            </CardBody>
          </Card>

          {/* 选中 clip 属性 */}
          {selected && (
            <Card>
              <CardHeader><CardTitle>选中 · {selected.name}</CardTitle><Badge tone="neutral">{selected.kind}</Badge></CardHeader>
              <CardBody className="grid gap-3 sm:grid-cols-3">
                <div><Label className="mb-1.5 block">轨道名称</Label><Input value={selected.name} onChange={(e) => setTracks((t) => t.map((x) => (x.id === selected.id ? { ...x, name: e.target.value } : x)))} /></div>
                <div><Label className="mb-1.5 block">起始 %</Label><Input type="number" value={Math.round(selected.startPct)} onChange={(e) => setTracks((t) => t.map((x) => (x.id === selected.id ? { ...x, startPct: Math.min(90, Math.max(0, Number(e.target.value) || 0)) } : x)))} className="tabular" /></div>
                <div><Label className="mb-1.5 block">长度 %</Label><Input type="number" value={Math.round(selected.widthPct)} onChange={(e) => setTracks((t) => t.map((x) => (x.id === selected.id ? { ...x, widthPct: Math.min(100, Math.max(4, Number(e.target.value) || 4)) } : x)))} className="tabular" /></div>
                {selected.kind === "audio" && (
                  <div className="sm:col-span-3"><Label className="mb-1.5 block">音量 {selected.volume ?? 60}%</Label><input type="range" min={0} max={100} value={selected.volume ?? 60} onChange={(e) => setTracks((t) => t.map((x) => (x.id === selected.id ? { ...x, volume: Number(e.target.value) } : x)))} className="w-full" aria-label="音量" /></div>
                )}
                {selected.kind === "text" && (
                  <div className="sm:col-span-3"><Label className="mb-1.5 block">字幕内容</Label><Textarea rows={2} value={selected.text ?? ""} onChange={(e) => setTracks((t) => t.map((x) => (x.id === selected.id ? { ...x, text: e.target.value } : x)))} /></div>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* 侧栏 */}
        <div className="space-y-4">
          <Card>
            <div className="border-b border-line px-3 py-2">
              <Tabs items={[{ id: "media", label: "素材" }, { id: "text", label: "文本" }, { id: "audio", label: "音频" }]} value={sideTab} onChange={setSideTab} />
            </div>
            <CardBody className="space-y-3">
              {sideTab === "media" && <UploadSlots label="导入素材" accept="video/*,image/*,audio/*" max={10} value={files} onChange={setFiles} />}
              {sideTab === "text" && (
                <div className="space-y-2">
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => addTrack("text")}><Type className="size-3.5" aria-hidden />添加字幕条</Button>
                  <p className="text-[11px] text-fg-subtle">字幕走程序合成，避免模型生成文字乱码。</p>
                </div>
              )}
              {sideTab === "audio" && (
                <div className="space-y-2">
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => addTrack("audio")}><Music2 className="size-3.5" aria-hidden />添加音频轨</Button>
                  <p className="text-[11px] text-fg-subtle">BGM 与口播分轨混音，口播优先 ducking。</p>
                </div>
              )}
              {sideTab === "media" && files.length === 0 && <EmptyState icon={<Layers className="size-5" />} title="素材库为空" description="导入本地素材开始剪辑" />}
            </CardBody>
          </Card>

          <Card>
            <div className="border-b border-line px-3 py-2"><p className="text-sm font-medium text-fg">导出设置</p></div>
            <CardBody className="space-y-3">
              <div><Label className="mb-1.5 block">分辨率</Label>
                <div className="flex gap-1.5">{["720P", "1080P", "4K"].map((r) => (<button key={r} type="button" onClick={() => setResolution(r)} aria-pressed={resolution === r} className={cn("tabular flex-1 rounded-xs border px-2 py-1.5 text-xs", resolution === r ? "border-accent bg-accent-soft/40 text-fg" : "border-line bg-surface-2 text-fg-muted")}>{r}</button>))}</div>
              </div>
              <div><Label className="mb-1.5 block">帧率</Label>
                <div className="flex gap-1.5">{["24", "30", "60"].map((f) => (<button key={f} type="button" onClick={() => setFps(f)} aria-pressed={fps === f} className={cn("tabular flex-1 rounded-xs border px-2 py-1.5 text-xs", fps === f ? "border-accent bg-accent-soft/40 text-fg" : "border-line bg-surface-2 text-fg-muted")}>{f} fps</button>))}</div>
              </div>
              <div className="flex items-center justify-between text-sm"><span className="text-fg-muted">预计耗时</span><Badge tone="accent">客户端合成，不消耗积分</Badge></div>
              {renderLog.length > 0 && (
                <ul className="max-h-28 space-y-1 overflow-auto rounded-sm border border-line bg-surface-2 p-2 text-[11px] text-fg-muted">
                  {renderLog.map((l, i) => <li key={i} className="tabular">{l}</li>)}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </StudioShell>
  );
}
