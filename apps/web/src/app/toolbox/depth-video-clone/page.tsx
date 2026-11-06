"use client";

import { Fragment, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  PANEL,
  PANEL_HEADER,
  PreviewPanel,
  QueuePanel,
  QueueDraftCard,
  QueueCollapsedDraft,
  SkillTrigger,
  SubmitBar,
  ToolboxShell,
} from "@/components/features/BenchWorkspace";
import { PopoverSelect } from "@/components/features/PopoverSelect";
import { AssetPickerModal, type AssetItem } from "@/components/features/AssetPickerModal";
import { MentionEditor } from "@/components/features/MentionEditor";
import { useToast } from "@/components/features/ToastHost";
import { cn } from "@/lib/cn";

/**
 * 原站 /toolbox/depth-video-clone（2026-10-30 实测逐字复刻）
 *
 *  .toolbox-editor-panel-root
 *   └─ div.depth-video-clone-editor  gap-2
 *      ├─ .toolbox-editor-panel-header  h52
 *      │   ├─ .depth-video-clone-mode-selector  260×52
 *      │   │   └─ button.generation-skill-trigger  260×52
 *      │   │       ├─ .generation-skill-trigger-visual 52×52
 *      │   │       └─ .generation-skill-trigger-content
 *      │   │           ├─ .generation-skill-trigger-label  深度复刻
 *      │   │           └─ .generation-skill-trigger-desc   参考动作轮廓，替换人物、商品或背景
 *      │   └─ button.ui-button.ui-button-ghost  82×32  新建
 *      ├─ div.depth-video-clone-editor-content  gap-3 pb-1
 *      │   └─ section.depth-video-clone-input-shell  grid-rows-[auto_minmax(0,3.5fr)_minmax(10rem,1fr)]
 *      │       ├─ div.depth-video-clone-input-header
 *      │       │   ├─ span.depth-video-clone-reference-count  "0 / 18"
 *      │       │   └─ button.depth-video-clone-fullscreen-toggle  28×28
 *      │       ├─ section.depth-video-clone-reference-slots
 *      │       │   └─ 4 × reference-slot-card（商品/人物/背景/声音，1px 分隔线）
 *      │       ├─ section.depth-video-clone-source  ← 参考视频上传
 *      │       │   └─ button.depth-video-clone-source-trigger
 *      │       │       └─ span.depth-video-clone-source-empty
 *      │       │           ├─ svg 28×28
 *      │       │           ├─ span.mt-2.text-xs.font-semibold  添加参考视频
 *      │       │           └─ span.mt-1.text-\[10px\].text-muted  必选 · 建议 4-60 秒 · 支持 MP4、MOV、WebM
 *      │       └─ div.depth-video-clone-extra  ← 补充说明 + "0 / 4000"
 *      ├─ div.video-generation-settings-selectors  grid-cols-2
 *      └─ div.depth-video-clone-submit  立即生成视频
 */

const MODES = [
  {
    key: "depth",
    label: "深度复刻",
    desc: "参考动作轮廓，替换人物、商品或背景",
    thumb: "/images/gen/skill-depth-clone.png",
  },
  {
    key: "storyboard",
    label: "分镜复刻",
    desc: "参考原片分镜与节奏，用你的素材重新演绎",
    thumb: "/images/gen/skill-storyboard-clone.png",
  },
  {
    key: "element",
    label: "元素替换",
    desc: "精准替换原视频中的元素",
    thumb: "/images/gen/skill-element-replace-mode.png",
  },
];

const SLOTS = [
  { key: "product", label: "商品", cover: "/toolboxs/depth-video-clone/product.png" },
  { key: "person", label: "人物", cover: "/toolboxs/depth-video-clone/person.png" },
  { key: "background", label: "背景", cover: "/toolboxs/depth-video-clone/background.png" },
  { key: "voice", label: "声音", cover: "/toolboxs/depth-video-clone/voice.png" },
] as const;

const MAX_REFS = 18;

/* ==================================================================
 * 原站：新增功能引导弹层（.depth-video-clone-guide / .feature-guide-popover）
 * 实测几何：guide 全屏 [0,0,1600,900]；popover [556,228,340,204]
 * 箭头在左下 [545,395,12,20]
 * ================================================================== */
const GUIDE_STEPS = [
  {
    title: "上传参考视频",
    body: "建议上传 4-60 秒视频，系统将分析原视频的动作、镜头与节奏，为你复刻。",
    hint: "动作与镜头参考",
  },
  {
    title: "添加参考素材",
    body: "上传商品图、人物图或背景图，复刻时将自动替换进原视频的对应位置。",
    hint: "素材替换参考",
  },
  {
    title: "选择复刻方式",
    body: "可选择深度复刻、分镜复刻或元素替换，决定原视频的复用程度。",
    hint: "复刻方式选择",
  },
  {
    title: "生成并下载",
    body: "生成完成后可在右侧最近任务中查看进度与结果。",
    hint: "任务与结果",
  },
];

function FeatureGuidePopover({
  step,
  total,
  onSkip,
  onNext,
}: {
  step: number;
  total: number;
  onSkip: () => void;
  onNext: () => void;
}) {
  const s = GUIDE_STEPS[Math.min(step, GUIDE_STEPS.length - 1)];
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const guide = (
    <div className="depth-video-clone-guide pointer-events-none fixed inset-0 z-[9000]">
      {/* 遮罩 + 高亮框 */}
      <div
        className="pointer-events-none fixed z-[8990] shadow-[0_0_0_9999px_rgba(0,0,0,0.48)]"
        style={{ top: 236, left: 104, width: 432, height: 336, borderRadius: 10 }}
      />
      <div
        className="pointer-events-none fixed z-[8991] border-2 border-[#8fc3ff]"
        style={{ top: 236, left: 104, width: 432, height: 336, borderRadius: 10 }}
      />
      <div
        role="dialog"
        aria-modal="false"
        aria-label="深度复刻新功能引导"
        className="feature-guide-popover pointer-events-auto fixed z-[9002] rounded-lg border border-line bg-surface px-5 py-4 text-[#0f1419] shadow-[0_18px_56px_rgba(15,23,42,0.18)]"
        style={{ top: 228, left: 556, width: 340 }}
      >
        <svg
          className="feature-guide-arrow pointer-events-none absolute left-[-12px] h-5 w-3 fill-surface"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
          style={{ top: 166 }}
        >
          <path d="M0 0H24L12 24Z" transform="rotate(90 12 12)" />
        </svg>
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-base font-semibold leading-6 text-[#111]">
            {s.title}
          </h3>
          <button
            type="button"
            onClick={onSkip}
            className="shrink-0 rounded-md px-1 py-1 text-sm font-medium text-[#536471] transition-colors hover:text-[#0f1419]"
          >
            跳过
          </button>
        </div>
        <p className="mt-2 text-sm leading-5 text-[#333]">{s.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#f4f6f9] px-2.5 py-1.5 text-xs font-medium leading-none text-[#536471]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
              data-slot="icon"
              className="h-4 w-4 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
            {s.hint}
          </span>
        </div>
        <div className="mt-5 flex items-end justify-between gap-2">
          <span className="pb-1 text-sm font-medium tabular-nums text-[#666]">
            {step + 1} / {total}
          </span>
          <button
            type="button"
            onClick={onNext}
            className="rounded-md bg-[#0471fe] px-5 py-2.5 text-sm font-semibold leading-none text-white transition-colors hover:bg-[#005bd3]"
          >
            下一步
          </button>
        </div>
      </div>
    </div>
  );

  // 同上：必须 portal 到 body，否则 fixed 会被 backdrop-filter 祖先劫持
  if (!mounted) return null;
  return createPortal(guide, document.body);
}

/* ==================================================================
 * 原站：复刻方式面板（.generation-skill-panel）
 * 实测几何 [99,95,442,227]；标题行含副标题「延续精彩，演绎不同」
 * 3 张卡片 204×78，2 列栅格 + 换行
 *
 * ⚠️ 必须用 createPortal 挂到 document.body：
 * 原站该面板在 DOM 里的 depth=0（挂在 body 下），实测 offsetParent=null，
 * 即 position:fixed 相对**视口**定位。
 * 我们若把它嵌套在 .toolbox-editor-panel-header 里，
 * 该祖先带 backdrop-filter → 会成为 fixed 的包含块 →
 * 实测 ours 偏移到 [198,130]（orig 是 [99,95]）。
 * ================================================================== */
function GenerationSkillPanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const panel = (
    <div
      role="dialog"
      aria-label="选择复刻方式"
      className="jsx-f5ae78e5cff69c4c generation-skill-panel flex min-h-0 origin-top flex-col overflow-hidden rounded-xl border border-[rgba(79,103,127,0.16)] bg-[#FAFAFB] shadow-none motion-reduce:animate-none ease-out motion-safe:animate-[generation-skill-panel-in_220ms_both]"
      style={{
        position: "fixed",
        zIndex: 420,
        left: 99,
        top: 95,
        width: 442,
        maxHeight: 460,
      }}
    >
      <div className="jsx-f5ae78e5cff69c4c generation-skill-panel-header shrink-0 px-4 pb-0 pt-3.5">
        <div className="jsx-f5ae78e5cff69c4c generation-skill-panel-title-row flex items-center justify-between gap-3">
          <div className="jsx-f5ae78e5cff69c4c generation-skill-panel-title-copy flex min-w-0 items-baseline gap-2">
            <h3 className="jsx-f5ae78e5cff69c4c generation-skill-panel-title text-[15px] font-semibold tracking-tight text-foreground">
              选择复刻方式
            </h3>
            <p className="jsx-f5ae78e5cff69c4c generation-skill-panel-subtitle whitespace-nowrap text-[11px] leading-4 text-muted max-[460px]:hidden">
              延续精彩，演绎不同
            </p>
          </div>
        </div>
      </div>
      <div className="jsx-f5ae78e5cff69c4c generation-skill-content min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="jsx-f5ae78e5cff69c4c generation-skill-grid grid grid-cols-2 gap-2">
          {MODES.map((m) => {
            const on = value === m.key;
            return (
              <div
                key={m.key}
                className={cn(
                  "jsx-f5ae78e5cff69c4c generation-skill-card group relative min-w-0 overflow-hidden rounded-xl transition-colors duration-200",
                  on
                    ? "border border-accent-deep bg-surface text-foreground shadow-sm"
                    : "border border-line text-muted shadow-[0_8px_22px_rgba(15,23,42,0.04)] hover:bg-surface hover:text-foreground"
                )}
              >
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange(m.key)}
                  className="jsx-f5ae78e5cff69c4c generation-skill-card-select relative z-[1] flex w-full min-w-0 items-start gap-2.5 rounded-xl p-3 text-left"
                >
                  <span className="generation-skill-card-layout flex w-full min-w-0 items-center gap-2.5">
                    <span className="generation-skill-card-image inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-subtle-action p-1">
                      <img
                        alt=""
                        draggable={false}
                        className="h-full w-full rounded-md object-contain"
                        src={m.thumb}
                      />
                    </span>
                    <span className="generation-skill-card-content min-w-0 flex-1 gap-0.5 min-h-[52px]">
                      <span className="jsx-f5ae78e5cff69c4c generation-skill-card-title block truncate text-[12px] font-semibold leading-5 text-foreground">
                        {m.label}
                      </span>
                      <span className="jsx-f5ae78e5cff69c4c generation-skill-card-desc line-clamp-2 block text-[10px] leading-4 text-muted">
                        {m.desc}
                      </span>
                    </span>
                  </span>
                </button>
                {on ? (
                  <span className="jsx-f5ae78e5cff69c4c generation-skill-card-check pointer-events-none absolute inset-0 z-[2]">
                    <span className="toolbox-option-check-badge absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent-deep text-on-accent shadow-sm ring-2 ring-surface">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden
                        data-slot="icon"
                        className="toolbox-option-check-icon h-2 w-2 shrink-0"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(panel, document.body);
}

const MAX_PROMPT = 4000;

export default function DepthVideoClonePage() {
  const { push } = useToast();
  const [mode, setMode] = useState("depth");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("Seedance-2.5");
  const [spec, setSpec] = useState("9:16 · 480P · 20s");
  const [tab, setTab] = useState("examples");
  const [busy, setBusy] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoThumb, setVideoThumb] = useState<string | null>(null);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [slotPickerKey, setSlotPickerKey] = useState<string | null>(null);
  const [slotAssets, setSlotAssets] = useState<Record<string, AssetItem[]>>({});
  const refs = Object.values(slotAssets).reduce((a, l) => a + l.length, 0);

  const current = MODES.find((m) => m.key === mode) ?? MODES[0];

  const applyVideoAsset = (a: AssetItem) => {
    setVideoName(a.name);
    // 本地上传是 blob 视频可直接播；资产库示例用封面图占位
    const playable = /\.mp4|\.mov|\.webm|^blob:/i.test(a.url);
    setVideoUrl(a.url);
    setVideoThumb(playable ? null : (a.thumb ?? a.url));
  };

  const clearVideo = () => {
    if (videoUrl && videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    setVideoName(null);
    setVideoUrl(null);
    setVideoThumb(null);
  };

  const gen = () => {
    if (!videoUrl) {
      push({ tone: "warning", title: "请先上传参考视频" });
      return;
    }
    if (!prompt.trim()) {
      push({ tone: "warning", title: "请先描述要替换的内容" });
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      push({
        tone: "success",
        title: "已提交复刻任务",
        description: "在右侧队列查看进度",
      });
    }, 1800);
  };

  return (
    <>
      <ToolboxShell
      editor={
        <div className={PANEL}>
          <div className="depth-video-clone-editor flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            {/* —— 面板头：技能触发器 + 新建 —— */}
            <div className={PANEL_HEADER}>
              <div className="depth-video-clone-editor-header flex items-center justify-between gap-2">
                <div className="jsx-f5ae78e5cff69c4c depth-video-clone-mode-selector relative flex min-w-0 items-center gap-1">
                  <SkillTrigger
                    ariaLabel={`当前技能：${current.label}`}
                    label={current.label}
                    desc={current.desc}
                    width={260}
                    imageUrl="/images/gen/skill-depth-video-clone.png"
                    onClick={() => setModeOpen((v) => !v)}
                    imageClassName="ai-image-skill-image-visual relative z-[1] h-full w-full object-contain rounded-lg overflow-hidden object-contain"
                    descClassName="jsx-f5ae78e5cff69c4c generation-skill-trigger-desc mt-1 block whitespace-nowrap text-[10px] leading-3 text-[#6B7280]"
                    chevronClassName="generation-skill-trigger-chevron h-3.5 w-3.5 shrink-0 stroke-2 transition-transform rotate-90"
                  />
                  {modeOpen && (
                    <GenerationSkillPanel
                      value={mode}
                      onChange={(k) => {
                        setMode(k);
                        setModeOpen(false);
                      }}                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("");
                    setSlotAssets({});
                    clearVideo();
                  }}
                  className="ui-button ui-button-ghost inline-flex items-center justify-center px-5 py-3 text-sm transition-all duration-200 disabled:pointer-events-none disabled:opacity-55 rounded-xl font-medium text-muted hover:bg-black/[0.035] hover:text-accent-deep depth-video-clone-new h-8 shrink-0 gap-1 px-2 text-xs font-semibold !text-accent-deep"
                  aria-label="新建"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="h-3 w-3 shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  新建
                </button>
              </div>
            </div>

            <div className="depth-video-clone-editor-content generation-root flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pb-1">
              <section
                data-reference-slot-preview-root="true"
                className="depth-video-clone-input-shell grid min-h-0 flex-1 gap-3 border shadow-sm transition-colors mb-1 grid-rows-[auto_minmax(0,3.5fr)_minmax(10rem,1fr)] rounded-xl px-3 py-3 max-sm:grid-rows-[auto_auto_minmax(10rem,1fr)]"
              >
                {/* —— 工具条 + 参考槽位（同一个 grid row，orig 实测 header 内含 toolbar + slots） —— */}
                <div className="depth-video-clone-input-header min-w-0">
                  <div className="depth-video-clone-input-toolbar flex h-7 items-center justify-between px-1 text-[10px] font-medium text-muted">
                    <span className="depth-video-clone-reference-count">
                      {refs} / {MAX_REFS}
                    </span>
                    <span className="ui-hover-tooltip-trigger inline-flex items-center justify-center outline-none">
                      <button
                        type="button"
                        aria-label="展开编辑"
                        onClick={() => push({ tone: "neutral", title: "已展开编辑（演示）", description: "全屏编辑态前端演示，无需后端。" })}
                        className="depth-video-clone-fullscreen-toggle inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:text-foreground"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.6}
                          stroke="currentColor"
                          aria-hidden
                          className="h-4 w-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 4H4v5m11-5h5v5m0 6v5h-5M4 15v5h5"
                          />
                        </svg>
                      </button>
                    </span>
                  </div>

                  {/* —— 参考槽位 —— */}
                  <section className="depth-video-clone-reference-slots min-w-0 px-3 pb-1 pt-2">
                    <div
                      data-reference-slot-preview-anchor="true"
                      className="reference-slot-uploader relative flex w-full min-w-0 flex-1 items-start overflow-visible"
                      aria-busy="false"
                      style={
                        {
                          "--reference-slot-card-size": "64px",
                          "--reference-slot-preview-top":
                            "calc(var(--reference-slot-card-size) + 1.5rem)",
                        } as React.CSSProperties
                      }
                    >
                      <div
                        className="reference-slot-list flex w-fit max-w-full min-w-0 items-start sm:pl-[var(--reference-slot-list-padding-left)] gap-3.5"
                        style={
                          {
                            "--reference-slot-list-padding-left": "2.34375px",
                          } as React.CSSProperties
                        }
                      >
                        {SLOTS.map((s, i) => (
                          <Fragment key={s.key}>
                            {i > 0 && (
                              <span className="reference-slot-divider mt-2 h-[calc(var(--reference-slot-card-size)-16px)] w-px shrink-0 self-start bg-line max-sm:invisible" />
                            )}
                            <section
                              data-reference-slot-key={s.key}
                              data-reference-drop-target-id={`slot:${s.key}`}
                              data-reference-drop-solt-key={s.key}
                              className="reference-slot-card group/reference-slot relative flex w-[var(--reference-slot-card-size)] shrink-0 flex-col items-center hover:z-[80] cursor-pointer max-sm:w-fit"
                            >
                              <button
                                type="button"
                                onClick={() => setSlotPickerKey(s.key)}
                                aria-label={`添加${s.label}`}
                                className="reference-slot-upload-hitarea absolute inset-0 z-0 disabled:cursor-default rounded-xl"
                              />
                              <div className="reference-slot-card-stage pointer-events-none relative z-[1] h-[var(--reference-slot-card-size)] w-[var(--reference-slot-card-size)] shrink-0">
                                <div className="reference-slot-trigger absolute inset-0 overflow-hidden border border-line bg-subtle shadow-sm transition-colors group-hover/reference-slot:border-[#999] rounded-xl ">
                                  {(() => {
                                    const picked = slotAssets[s.key]?.[0];
                                    const cover = picked?.thumb ?? picked?.url ?? s.cover;
                                    return cover ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        alt=""
                                        draggable={false}
                                        className="reference-slot-cover-image h-full w-full object-cover"
                                        src={cover}
                                      />
                                    ) : null;
                                  })()}
                                  <span className="reference-slot-cover-upload-icon absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#5c5c5c] text-white shadow-sm" aria-hidden="true">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={1.5}
                                      stroke="currentColor"
                                      aria-hidden="true"
                                      data-slot="icon"
                                      className="h-2.5 w-2.5 stroke-2"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                                      />
                                    </svg>
                                  </span>
                                </div>
                              </div>
                              <span className="reference-slot-label mt-1 flex h-4 max-w-max shrink-0 items-center justify-center whitespace-nowrap bg-transparent text-[10px] font-medium leading-none">
                                <span className="reference-slot-title text-[#555]">
                                  添加{s.label}
                                </span>
                                <span className="reference-slot-optional ml-0.5 text-[#888]">
                                  (可选)
                                </span>
                              </span>
                            </section>
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>

                {/* —— 参考视频上传 —— */}
                <section
                  data-reference-slot-preview-boundary="true"
                  className="depth-video-clone-source flex min-h-0 flex-col max-sm:min-h-64"
                  style={{ "--depth-video-clone-source-aspect": 0.5625 } as React.CSSProperties}
                >
                  <div className="depth-video-clone-source-trigger group relative flex min-h-0 w-full flex-1 overflow-hidden rounded-lg text-left border border-dashed transition-colors hover:border-[#999]">
                    {videoUrl ? (
                      <div className="relative flex h-full w-full min-h-0 flex-1 flex-col">
                        {videoThumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={videoThumb}
                            alt={videoName ?? ""}
                            draggable={false}
                            className="h-full min-h-0 w-full flex-1 bg-black object-contain"
                          />
                        ) : (
                          /* eslint-disable-next-line jsx-a11y/media-has-caption */
                          <video
                            src={videoUrl}
                            controls
                            playsInline
                            preload="metadata"
                            className="h-full min-h-0 w-full flex-1 bg-black object-contain"
                          />
                        )}
                        <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            已选择 {videoName}
                          </span>
                          <button
                            type="button"
                            onClick={clearVideo}
                            className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-black/[0.035] hover:text-foreground"
                          >
                            重新选择
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVideoPickerOpen(true)}
                          aria-label="更换参考视频"
                          className="absolute inset-0 h-full w-full cursor-pointer"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setVideoPickerOpen(true)}
                        className="flex h-full w-full flex-col items-center justify-center px-4 text-center"
                      >
                        <span className="depth-video-clone-source-empty flex h-full w-full flex-col items-center justify-center px-4 text-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            aria-hidden
                            className="h-7 w-7 text-accent-deep"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                            />
                          </svg>
                          <span className="mt-2 text-xs font-semibold text-foreground">
                            添加参考视频
                          </span>
                          <span className="mt-1 text-[10px] text-muted">
                            必选 · 建议 4-60 秒 · 支持 MP4、MOV、WebM
                          </span>
                        </span>
                      </button>
                    )}
                  </div>
                </section>

                {/* —— 补充说明 —— */}
                <div className="depth-video-clone-extra relative flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="depth-video-clone-mention-input relative flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border shadow-inner transition-shadow [&_[data-mention-editor]]:!text-[13px] [&_[data-mention-placeholder]]:!text-[13px]">
                    <div className="depth-video-clone-mention-viewport flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                      <MentionEditor
                        value={prompt}
                        onChange={setPrompt}
                        maxChars={MAX_PROMPT}
                        rootClassName="markdown-mention-editor-root ui-markdown-mention-editor relative flex min-h-0 flex-1 flex-col"
                        placeholder="补充说明：可要求保持口播内容不变，修改商品价格、单价，也可@元素引用已上传图片。"
                        shellClassName="milkdown-editor-shell relative flex min-h-0 flex-1 flex-col min-h-0 rounded-none border-0 bg-transparent shadow-none cursor-text"
                      />
                    </div>
                    <div className="depth-video-clone-mention-toolbar min-w-0 shrink-0 px-2 pb-1">
                      <div className="speech-input-toolbar flex min-h-[var(--toolbar-size,32px)] w-full min-w-0 shrink-0 flex-nowrap items-start gap-2 max-sm:min-h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:min-h-[var(--toolbar-size,44px)]">
                        <div className="speech-input-toolbar-main relative min-h-[var(--toolbar-size,32px)] min-w-0 flex-1 max-sm:min-h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:min-h-[var(--toolbar-size,44px)]">
                          <div className="speech-input-toolbar-details flex min-h-[var(--toolbar-size,32px)] min-w-0 flex-wrap items-center gap-1.5 pr-10 max-sm:min-h-[var(--toolbar-size,44px)] max-sm:pr-14 [@media(pointer:coarse)]:min-h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:pr-14 transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none visible translate-y-0 opacity-100 delay-0">
                            <span
                              className="depth-video-clone-extra-char-count whitespace-nowrap text-[10px] tabular-nums text-muted"
                              aria-live="polite"
                            >
                              {prompt.length} / {MAX_PROMPT}
                            </span>
                          </div>
                          <div className="speech-input-toolbar-slot pointer-events-none absolute inset-x-0 top-0 flex h-[var(--toolbar-size,32px)] min-w-0 items-center max-sm:h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:h-[var(--toolbar-size,44px)]">
                            <div
                              className="speech-input-controls flex min-h-[var(--toolbar-size,32px)] w-full min-w-0 shrink-0 items-center justify-end gap-2 text-foreground max-sm:min-h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:min-h-[var(--toolbar-size,44px)] pointer-events-none"
                              data-speech-active="false"
                              role="group"
                              aria-label="语音输入控制"
                            >
                              <span className="ui-hover-tooltip-trigger inline-flex items-center justify-center outline-none ">
                                <button
                                  type="button"
                                  aria-label="语音输入"
                                  onClick={() => push({ tone: "neutral", title: "正在聆听…（演示）" })}
                                  className="speech-input-controls-microphone flex h-[var(--toolbar-size,32px)] w-[var(--toolbar-size,32px)] shrink-0 touch-manipulation items-center justify-center rounded-full max-sm:h-[var(--toolbar-size,44px)] max-sm:w-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:w-[var(--toolbar-size,44px)] pointer-events-auto text-muted hover:bg-[#f1f1f1] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    aria-hidden
                                    data-slot="icon"
                                    className="h-[var(--toolbar-icon-size,20px)] w-[var(--toolbar-icon-size,20px)]"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M12 3.5a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-5 0V6A2.5 2.5 0 0 1 12 3.5Zm-6 8.5a6 6 0 0 0 12 0M12 18v3"
                                    />
                                  </svg>
                                </button>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* —— 底部 2 列选择器 —— */}
            <div className="video-generation-settings-selectors relative z-[300] grid shrink-0 gap-2 grid-cols-2">
                <div className="generation-model-picker relative min-w-0">
                  <PopoverSelect
                    label="模型"
                    value={model}
                    onChange={setModel}
                    ariaLabel="模型"
                    className="min-w-0"
                    icon={
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src="/logo-bytedance.svg"
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        width={14}
                        height={14}
                        decoding="async"
                        className="video-model-glyph h-3.5 w-3.5 [[data-site-tone=dark]_&]:invert"
                      />
                    }
                    summary={
                      <span className="video-generation-settings-model-summary mt-px flex min-w-0 items-center gap-1 text-[10px] font-semibold leading-snug text-foreground">
                        <span className="video-generation-settings-model-label min-w-0 truncate">
                          {model}
                        </span>
                      </span>
                    }
                    options={[
                      {
                        value: "Seedance-2.5",
                        label: "Seedance-2.5",
                        description: "画质与动态平衡",
                      },
                      {
                        value: "Seedance-2.0",
                        label: "Seedance-2.0",
                        description: "性价比",
                      },
                      {
                        value: "Seedance-2.0 Mini",
                        label: "Seedance-2.0 Mini",
                        description: "极速低成本",
                      },
                    ]}
                  />
                </div>
                <div className="generation-settings-picker relative min-w-0">
                  <PopoverSelect
                    label="视频设置"
                    value={spec}
                    onChange={setSpec}
                    ariaLabel="视频比例、分辨率与时长"
                    align="end"
                    className="min-w-0"
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        aria-hidden
                        data-slot="icon"
                        className="h-3.5 w-3.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
                        />
                      </svg>
                    }
                    summary={
                      <span className="mt-px flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] font-semibold leading-snug tabular-nums text-foreground">
                        <span className="inline-flex shrink-0 items-center gap-0.5">
                          <span className="inline-flex shrink-0 items-center justify-center">
                            <span className="rounded-[1px] border-[1.25px] border-current" />
                          </span>
                          9:16
                        </span>
                        <span>·</span>
                        <span className="shrink-0 tabular-nums">480P</span>
                        <span>·</span>
                        <span className="shrink-0">20s</span>
                      </span>
                    }
                    options={[
                      { value: "9:16 · 480P · 20s", label: "9:16 · 480P · 20s" },
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
                credits={prompt.trim() && videoUrl ? 14 : null}
                disabled={!prompt.trim() || !videoUrl}
                loading={busy}
                onClick={gen}
                bare
              />
            </div>
          </div>
        </div>
      }
      preview={
        <PreviewPanel
          tabs={[
            {
              key: "examples",
              label: "参考示例",
              panel: (
                <div className="result-example-display flex h-full min-h-0 w-full flex-col items-center justify-center gap-5 overflow-y-auto px-4 py-6 text-center">
                  <div className="result-example-heading flex max-w-2xl flex-col items-center gap-3">
                    <h2 className="result-example-title text-xl font-bold leading-none text-foreground max-2xl:text-lg/none">
                      效果示例
                    </h2>
                    <div className="result-example-description text-sm leading-none text-muted max-xl:text-xs/none">
                      <p className="result-example-description-line">
                        上传参考视频，查看复刻效果
                      </p>
                    </div>
                  </div>
                  <div className="result-example-content relative aspect-video min-h-0 max-h-[70%] w-full max-w-5xl shrink-0">
                    <div className="result-example-stage absolute inset-0 flex min-h-0 flex-col gap-3">
                      <div className="result-example-single flex h-full min-h-0 w-full items-center justify-center">
                        <div className="result-example-video-frame relative h-full min-w-0 max-w-full overflow-hidden rounded-2xl">
                          <div className="interactive-video-cover relative h-full max-w-full overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src="/images/gen/example-video-1.png"
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="video-thumbnail-image interactive-video-cover-poster block h-full max-h-full w-auto max-w-full object-contain"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "favorites",
              label: "收藏",
              panel: (
                <div className="favorite-batch-login flex min-h-0 flex-1 flex-col items-center justify-center gap-3.5 rounded-[1.8rem] px-6 py-10 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="favorite-batch-login-icon h-20 w-20 shrink-0 text-subtle opacity-[0.55]"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                    />
                  </svg>
                  <p className="favorite-batch-login-text text-sm font-normal text-subtle opacity-90">
                    请先登录再查看收藏任务。
                  </p>
                </div>
              ),
            },
          ]}
          activeTab={tab}
          onTabChange={setTab}
        />
      }
      queue={
        <QueuePanel
          headerAction={
            <button
              type="button"
              onClick={() => push({ tone: "neutral", title: "草稿已清空（演示）" })}
              className="toolbox-queue-clear-drafts inline-flex h-6 shrink-0 items-center bg-transparent p-0 text-[10px] leading-none text-muted transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-40"
            >
              清空草稿
            </button>
          }
          collapsedDraft={<QueueCollapsedDraft />}
        >
          <QueueDraftCard />
        </QueuePanel>
      }
      />
      {guideOpen ? (
        <FeatureGuidePopover
          step={guideStep}
          total={GUIDE_STEPS.length}
          onSkip={() => setGuideOpen(false)}
          onNext={() => {
            if (guideStep + 1 >= GUIDE_STEPS.length) {
              setGuideOpen(false);
            } else {
              setGuideStep((v) => v + 1);
            }
          }}
        />
      ) : null}
      <AssetPickerModal
        open={videoPickerOpen}
        kind="video"
        title="选择参考视频"
        subtitle="参考视频会保存至资产库，处理期间始终可见。"
        maxSelect={1}
        onClose={() => setVideoPickerOpen(false)}
        onConfirm={(assets) => {
          if (assets[0]) applyVideoAsset(assets[0]);
        }}
      />
      <AssetPickerModal
        open={slotPickerKey !== null}
        kind={slotPickerKey === "voice" ? "audio" : "image"}
        title={slotPickerKey === "voice" ? "选择声音参考" : "选择图片参考"}
        subtitle={slotPickerKey === "voice" ? "声音会保存至资产库，可用于替换原片声音。" : "参考图片会保存至资产库，处理期间始终可见。"}
        maxSelect={slotPickerKey === "voice" ? 1 : 4}
        onClose={() => setSlotPickerKey(null)}
        onConfirm={(assets) => {
          if (slotPickerKey) {
            const key = slotPickerKey;
            setSlotAssets((p) => ({ ...p, [key]: assets }));
          }
        }}
      />
    </>
  );
}
