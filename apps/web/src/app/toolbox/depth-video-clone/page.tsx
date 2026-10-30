"use client";

import { useState } from "react";
import {
  PANEL,
  PANEL_BODY,
  PANEL_CONTENT,
  PANEL_HEADER,
  PreviewPanel,
  QueuePanel,
  SubmitBar,
  ToolboxShell,
} from "@/components/features/BenchWorkspace";
import { PopoverSelect, TallPopoverSelect } from "@/components/features/PopoverSelect";
import { useToast } from "@/components/features/ToastHost";
import { cn } from "@/lib/cn";

/* 原站 /toolbox/depth-video-clone（实测）：
 *  面板头：「当前技能：深度复刻」(可展开) + 新建
 *  素材位：添加商品 / 添加人物 / 添加背景 / 添加声音
 *  参考视频区：标题「上传参考视频」+ 副标「建议上传 4-60 秒视频，系统会复刻原视频的动作、镜头和节奏。」
 *  补充说明 textarea + 「展开编辑」+ 「语音输入」
 *  底部：模型(视频设置) + 视频比例、分辨率与时长
 *  提交：立即生成视频 预计 -- 积分
 *  右栏：选择复刻方式（深度复刻 / 分镜复刻 / 元素替换）+ 引导「延续精彩，演绎不同」
 */
const MODES = [
  { key: "depth", label: "深度复刻", desc: "参考动作轮廓，替换人物、商品或背景" },
  { key: "storyboard", label: "分镜复刻", desc: "参考原片分镜与节奏，用你的素材重新演绎" },
  { key: "element", label: "元素替换", desc: "精准替换原视频中的元素" },
];

const SLOT_COVERS: Record<string, string> = {
  product: "/toolboxs/depth-video-clone/product.png",
  person: "/toolboxs/depth-video-clone/person.png",
  background: "/toolboxs/depth-video-clone/background.png",
};

export default function DepthVideoClonePage() {
  const { push } = useToast();
  const [mode, setMode] = useState("depth");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("Seedance-2.5");
  const [spec, setSpec] = useState("视频比例、分辨率与时长");
  const [tab, setTab] = useState("preview");
  const [busy, setBusy] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);

  const gen = () => {
    if (!prompt.trim()) {
      push({ tone: "warning", title: "请先描述要替换的内容" });
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      push({ tone: "success", title: "已提交复刻任务", description: "在右侧队列查看进度" });
    }, 1800);
  };

  return (
    <ToolboxShell
      editor={
        <div className={PANEL}>
          <div className="depth-video-clone-editor flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            {/* —— 面板头：当前技能 + 新建 —— */}
            <div className={PANEL_HEADER}>
              <div className="depth-video-clone-editor-header flex items-center justify-between gap-2">
                <div className="relative min-w-0">
                  <button
                    type="button"
                    aria-expanded={modeOpen}
                    onClick={() => setModeOpen((v) => !v)}
                    className="inline-flex h-8 min-w-0 items-center gap-1 rounded-lg border border-line px-2.5 text-xs font-medium"
                  >
                    当前技能：{MODES.find((m) => m.key === mode)?.label}
                    <span aria-hidden className="text-[10px] text-muted">▾</span>
                  </button>
                  {modeOpen && (
                    <div className="absolute left-0 top-[calc(100%+4px)] z-[320] w-[280px] rounded-xl border border-line bg-surface p-1 shadow-xl">
                      {MODES.map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          aria-pressed={mode === m.key}
                          onClick={() => {
                            setMode(m.key);
                            setModeOpen(false);
                          }}
                          className={cn(
                            "flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left",
                            mode === m.key ? "bg-surface-2" : "hover:bg-surface-2"
                          )}
                        >
                          <span className="text-xs font-medium">{m.label}</span>
                          <span className="text-[10px] text-muted">{m.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("");
                  }}
                  className="depth-video-clone-new h-8 shrink-0 gap-1 px-2 text-xs font-semibold !text-accent"
                  aria-label="新建"
                >
                  新建
                </button>
              </div>
            </div>

            <div className={`${PANEL_CONTENT} gap-2`}>
              {/* —— 素材位 —— */}
              <div className="prompt-reference-uploader flex min-w-0 shrink-0 flex-col gap-2">
                <div className="reference-slot-list flex w-fit max-w-full min-w-0 items-start">
                  {(["product", "person", "background"] as const).map((r, i) => (
                    <div key={r} className="reference-slot-card group/reference-slot relative flex w-16 flex-col items-center">
                      {i > 0 && (
                        <span className="reference-slot-divider absolute right-0 top-1 h-12 w-px bg-line" aria-hidden />
                      )}
                      <button
                        type="button"
                        aria-label={`添加${{ product: "商品", person: "人物", background: "背景" }[r]}`}
                        className="reference-slot-card-stage pointer-events-none relative z-[1] size-16 overflow-hidden rounded-xl border border-line bg-surface"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={SLOT_COVERS[r]} alt="" className="reference-slot-cover-image h-full w-full object-cover" />
                      </button>
                      <div className="reference-slot-label mt-1 flex h-4 max-w-max shrink-0 items-center">
                        <span className="reference-slot-title text-[10px] text-[#555]">
                          {{ product: "添加商品", person: "添加人物", background: "添加背景" }[r]}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="reference-slot-card group/reference-slot relative flex w-16 flex-col items-center">
                    <span className="reference-slot-divider absolute right-0 top-1 h-12 w-px bg-line" aria-hidden />
                    <button
                      type="button"
                      aria-label="添加声音"
                      className="reference-slot-card-stage pointer-events-none relative z-[1] flex size-16 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface text-[16px] text-muted"
                    >
                      ♪
                    </button>
                    <div className="reference-slot-label mt-1 flex h-4 max-w-max shrink-0 items-center">
                      <span className="reference-slot-title text-[10px] text-[#555]">添加声音</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* —— 参考视频区 —— */}
              <section className="shrink-0">
                <h3 className="text-xs font-semibold text-foreground">上传参考视频</h3>
                <p className="mt-0.5 text-[11px] text-muted">
                  建议上传 4-60 秒视频，系统会复刻原视频的动作、镜头和节奏。
                </p>
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-center rounded-xl border border-dashed border-line bg-surface px-3 py-8 text-xs text-muted"
                >
                  添加参考视频 必选 · 建议 4-60 秒 · 支持 MP4、MOV、WebM
                </button>
              </section>

              {/* —— 补充说明 —— */}
              <div className="depth-video-clone-extra relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-background">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="补充说明：可要求保持口播内容不变，修改商品价格、单价，也可@元素引用已上传图片。"
                  className="min-h-[110px] w-full flex-1 resize-none bg-transparent p-3 text-sm outline-none placeholder:text-fg-subtle"
                />
                <div className="flex items-center gap-2 border-t border-line px-2 py-1.5">
                  <button type="button" className="text-[11px] text-muted">
                    语音输入
                  </button>
                  <button type="button" className="text-[11px] text-muted">
                    展开编辑
                  </button>
                </div>
              </div>

              {/* —— 底部 2 列 —— */}
              <div className="relative z-[300] grid shrink-0 grid-cols-2 gap-2">
                <TallPopoverSelect
                  label="模型"
                  value={model}
                  onChange={setModel}
                  ariaLabel="模型"
                  className="min-w-0"
                  summary={
                    <span className="model-summary-text mt-px flex min-w-0 items-baseline gap-1.5">
                      <span className="model-summary-title min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold leading-snug text-foreground">
                        {model}
                      </span>
                    </span>
                  }
                  options={[
                    { value: "Seedance-2.5", label: "Seedance-2.5", description: "画质与动态平衡" },
                    { value: "Seedance-2.0", label: "Seedance-2.0", description: "性价比" },
                    { value: "Seedance-2.0 Mini", label: "Seedance-2.0 Mini", description: "极速低成本" },
                  ]}
                />
                <PopoverSelect
                  label="视频比例、分辨率与时长"
                  value={spec}
                  onChange={setSpec}
                  ariaLabel="视频比例、分辨率与时长"
                  align="end"
                  className="min-w-0 self-end"
                  options={[
                    { value: "视频比例、分辨率与时长", label: "视频比例、分辨率与时长" },
                    { value: "9:16 · 480P · 25s", label: "9:16 · 480P · 25s" },
                    { value: "9:16 · 1080P · 10s", label: "9:16 · 1080P · 10s" },
                    { value: "16:9 · 1080P · 10s", label: "16:9 · 1080P · 10s" },
                  ]}
                />
              </div>
            </div>

            <div className="depth-video-clone-submit sticky bottom-0 z-[2] shrink-0">
              <SubmitBar
                label="立即生成视频"
                credits={prompt.trim() ? 14 : null}
                disabled={!prompt.trim()}
                loading={busy}
                onClick={gen}
              />
            </div>
          </div>
        </div>
      }
      preview={
        <PreviewPanel
          tabs={[
            {
              key: "preview",
              label: "预览",
              panel: (
                <div className="flex h-full min-h-0 flex-col justify-center overflow-y-auto p-4">
                  <p className="text-center text-xs text-muted">上传参考视频后在这里预览与复刻结果</p>
                </div>
              ),
            },
            {
              key: "favorites",
              label: "收藏",
              panel: (
                <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted">
                  请先登录再查看收藏任务。
                </div>
              ),
            },
          ]}
          activeTab={tab}
          onTabChange={setTab}
        />
      }
      queue={
        <QueuePanel>
          <div className="space-y-2">
            <h3 className="px-1 text-xs font-semibold text-foreground">选择复刻方式</h3>
            <p className="px-1 text-[11px] text-muted">延续精彩，演绎不同</p>
            <ul className="space-y-1.5">
              {MODES.map((m) => (
                <li key={m.key}>
                  <button
                    type="button"
                    onClick={() => setMode(m.key)}
                    aria-pressed={mode === m.key}
                    className={cn(
                      "w-full rounded-lg border px-2.5 py-2 text-left",
                      mode === m.key ? "border-accent/60 bg-accent-soft/10" : "border-line bg-surface-2"
                    )}
                  >
                    <span className="block text-[12px] font-medium">{m.label}</span>
                    <span className="block text-[10px] text-muted">{m.desc}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="rounded-lg border border-dashed border-line bg-surface-2 p-3 text-xs text-muted">
              还没有任务。生成完成后，成片会出现在这里。
            </p>
          </div>
        </QueuePanel>
      }
    />
  );
}
