"use client";

import { useState } from "react";
import { AssetPickerModal, type AssetItem } from "@/components/features/AssetPickerModal";
import {
  PANEL,
  QueuePanel,
  ToolHeader,
  ToolboxShell,
} from "@/components/features/BenchWorkspace";
import { PopoverSelect } from "@/components/features/PopoverSelect";
import { useToast } from "@/components/features/ToastHost";
import { ApiError } from "@/lib/api";
import { waitTask } from "@/lib/backend/tasks";
import {
  submitQualityEnhance,
  submitSubtitleErase,
  submitWatermarkRemove,
} from "@/lib/backend/tools";

/**
 * 原站三个视频处理工具共用骨架（实测 /toolbox/video-quality-enhance 等）：
 *
 *  .toolbox-editor-panel-root
 *   └─ div.relative.z-[1].flex.flex-col.gap-2
 *      ├─ .toolbox-editor-panel-header  h32
 *      │   └─ 返回(32×32) + 分隔线 + 标题 + 新建(80×32)
 *      ├─ div.relative.flex.flex-1.flex-col.gap-2.5.overflow-hidden.pr-1
 *      │   ├─ section.flex.flex-1.flex-col.rounded-xl.border  ← 上传舞台
 *      │   │   └─ div.flex.p-2
 *      │   │       └─ div.SubtitleErasePlayer_eraseStage__6t259
 *      │   │           └─ button.relative.z-\[1\].flex.h-full.border-dashed  ← 32×32 svg
 *      │   │               ├─ span.mt-3.text-sm.font-semibold  上传视频
 *      │   │               └─ span.mt-1.text-\[11px\].text-muted
 *      │   └─ section.shrink-0.rounded-xl.border.p-3  [aria-label=操作指引]
 *      │       ├─ h3.text-xs.font-semibold  操作指引
 *      │       └─ ol.mt-2.space-y-2
 *      │           └─ li.flex.items-start.gap-2.5
 *      │               ├─ span.mt-0.5.grid.h-6.w-6.rounded-lg  "1"
 *      │               └─ div.min-w-0.flex-1
 *      │                   ├─ p.flex.items-center.gap-1.5.text-\[11px\].font-semibold  + svg 14×14
 *      │                   └─ p.mt-0.5.text-\[10px\].text-muted
 *      ├─ section.relative.z-\[300\].grid.grid-cols-2.gap-2  [aria-label=增强参数]
 *      └─ div.sticky.bottom-0.z-\[2\].flex.shrink-0.flex-col  ← 提交条
 */

export interface GuideStep {
  title: string;
  description: string;
  icon: string;
}

/** 行内注释8.1：框选区域 —— 坐标是百分比（0-100），与后端 regions 结构一致。 */
export interface EraseRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

/* —— 原站指引图标（逐字复刻 path d） —— */
const ICON_UPLOAD =
  "M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0 1 18 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 0 1 6 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621-.504-1.125-1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5";
const ICON_FRAME =
  "M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59";
const ICON_HAND =
  "M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15m.002 0h-.002";
const ICON_SPARK =
  "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z";
const ICON_TARGET =
  "M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z";
const ICON_ERASE =
  "M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88";

function StepIcon({ d }: { d: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
      data-slot="icon"
      className="h-3.5 w-3.5 shrink-0 text-accent-deep"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export function BenchVideoProcessTool({
  title,
  uploadTitle,
  uploadHint,
  cta,
  steps,
  controls,
  controlsInline,
  previewHint,
  nav,
  /** 行内注释9：真实提交回调 —— 传入选中视频的资产 ID，由各工具页决定打哪个后端接口。 */
  onSubmit,
}: {
  title: string;
  uploadTitle: string;
  uploadHint: string;
  cta: string;
  steps: GuideStep[];
  controls?: React.ReactNode;
  /** 渲染在「上传舞台」与「操作指引」之间的区块（原站 depth-video-clone / watermark-remove） */
  controlsInline?: React.ReactNode;
  previewHint: string;
  nav?: { id: string; title: string; sections: import("@/lib/skills").NavSection[] };
  onSubmit?: (videoAssetId: string, regions: EraseRegion[]) => Promise<void>;
}) {
  const { push } = useToast();
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  /** 行内注释9.1：选中视频的资产 ID —— 后端要的是 ast_* ID，不是文件 URL。 */
  const [videoAssetId, setVideoAssetId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const uploaded = !!uploadedName;
  const [busy, setBusy] = useState(false);
  /** 行内注释9.2：默认框选区域 —— 字幕擦除必带，否则后端直接 400。 */
  const [eraseRegions] = useState<EraseRegion[]>([{ x: 0, y: 0, w: 100, h: 100 }]);

  const go = async () => {
    if (!uploaded) {
      push({ tone: "warning", title: "请先上传视频" });
      return;
    }
    if (!videoAssetId) {
      push({ tone: "warning", title: "请先从资产库选择视频" });
      return;
    }
    setBusy(true);
    try {
      if (onSubmit) {
        await onSubmit(videoAssetId, eraseRegions);
      } else {
        push({ tone: "success", title: "已提交", description: title });
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "提交失败，请稍后重试";
      push({ tone: "danger", title: "提交失败", description: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <ToolboxShell
      nav={nav}
      editor={
        <div className={PANEL}>
          <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            {/* —— 面板头：返回 + 标题 + 新建 —— */}
            <div className="toolbox-editor-panel-header relative z-[1] shrink-0 backdrop-blur-sm">
              <ToolHeader
                title={title}
                onBack={() => window.history.back()}
                onNew={() => {
                  setUploadedName(null);
                  setVideoAssetId(null);
                }}
              />
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden pr-1 max-lg:min-h-[34rem] max-lg:overflow-y-auto">
              {/* —— 上传舞台 —— */}
              <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
                <div className="flex min-h-[14rem] flex-1 flex-col p-2 max-lg:min-h-[18rem]">
                  <div className="SubtitleErasePlayer_eraseStage__6t259 relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="relative z-[1] flex h-full w-full min-h-[12rem] flex-col items-center justify-center border border-dashed px-4 py-6 text-center transition"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        aria-hidden
                        data-slot="icon"
                        className="h-8 w-8 text-accent-deep"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                        />
                      </svg>
                      <span className="mt-3 text-sm font-semibold text-foreground">
                        {uploadedName ? `已选择 ${uploadedName}` : uploadTitle}
                      </span>
                      <span className="mt-1 max-w-[16rem] text-[11px] font-medium leading-relaxed text-muted">
                        {uploadHint}
                      </span>
                    </button>
                  </div>
                </div>
              </section>

              {/* —— 舞台与指引之间的参数区块 —— */}
              {controlsInline}

              {/* —— 操作指引 —— */}
              <section
                aria-label="操作指引"
                className="shrink-0 rounded-xl border p-2.5 sm:p-3"
              >
                <h3 className="text-xs font-semibold text-foreground">操作指引</h3>
                <ol className="mt-2 space-y-2">
                  {steps.map((s, i) => (
                    <li key={s.title} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-accent-deep">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                          <StepIcon d={s.icon} />
                          {s.title}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                          {s.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            {/* —— 参数区 —— */}
            {controls}
          </div>

          <div className="sticky bottom-0 z-[2] flex shrink-0 flex-col">
              <button
                type="button"
                onClick={go}
                disabled={!uploaded || busy}
                className="ui-button ui-button-primary inline-flex items-center justify-center px-5 py-3 text-sm transition-all duration-200 disabled:pointer-events-none disabled:opacity-55 rounded-xl border-0 bg-accent font-semibold tracking-wide text-on-accent shadow-glow toolbox-generation-submit-button relative w-full flex-wrap gap-x-5 gap-y-1 rounded-md py-1.5 text-xs"
              >
                <span className="generation-submit-title flex min-w-0 max-w-full items-center justify-center gap-2 truncate text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="h-4 w-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={ICON_SPARK} />
                  </svg>
                  <span className="generation-submit-label truncate">
                    {busy ? "提交中…" : cta}
                  </span>
                </span>
                <span className="generation-submit-credit font-credit pointer-events-none inline-flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-1 text-[10px] font-normal leading-snug [&_.credit-quote-price]:text-inherit">
                  预计 -- 积分
                </span>
              </button>
            </div>
        </div>
      }
      preview={
        <div className="card rounded-3xl border-0 shadow-premium backdrop-blur-lg toolbox-preview-panel relative flex min-h-0 min-w-0 flex-col overflow-hidden p-3 sm:p-4 lg:h-full lg:min-h-0 lg:flex-1 !border !shadow-none">
          <div className="flex min-h-0 flex-1 flex-col gap-3 lg:overflow-hidden">
            <div className="flex shrink-0 flex-row flex-wrap items-end justify-between gap-x-4 gap-y-1 px-1">
              <div className="toolbox-preview-tabs-row flex flex-wrap items-center gap-0">
                <div className="toolbox-preview-tab-wrap flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => push({ tone: "neutral", title: "预览" })}
                    className="toolbox-preview-tab relative pb-2 text-xs tracking-tight transition-colors font-semibold text-foreground"
                  >
                    预览
                    <span
                      aria-hidden
                      className="absolute inset-x-[28%] bottom-0 h-0.5 rounded-full bg-foreground transition-opacity opacity-100"
                    />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-y-contain">
              <div className="flex h-full min-h-0 flex-col justify-center overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="video-result-preview-idle flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="video-result-preview-idle-icon h-9 w-9 shrink-0 text-muted"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                    />
                  </svg>
                  <p className="video-result-preview-idle-description max-w-sm text-xs leading-relaxed text-muted">
                    {previewHint}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
      queue={
        <QueuePanel />
      }
    />
    <AssetPickerModal
      open={pickerOpen}
      kind="video"
      title="选择参考视频"
      subtitle="参考视频会保存至资产库，处理期间始终可见。"
      maxSelect={1}
      onClose={() => setPickerOpen(false)}
      onConfirm={(assets: AssetItem[]) => {
        if (assets[0]) {
          setUploadedName(assets[0].name);
          setVideoAssetId(assets[0].id);
        }
      }}
    />
    </>
  );
}

/* —— 视频画质增强 —— */
export function QualityEnhanceTool() {
  const { push } = useToast();
  const [version, setVersion] = useState("大模型版");
  const [spec, setSpec] = useState("1080P · 无");
  return (
    <BenchVideoProcessTool
      title="画质增强"
      uploadTitle="上传视频"
      uploadHint="支持 5 分钟以内的 mp4 / mov / avi 等格式"
      cta="开始增强"
      previewHint="处理完成后会在这里预览增强后的视频。"
      onSubmit={async (videoAssetId) => {
        const task = await submitQualityEnhance({
          video_asset_id: videoAssetId,
          target: spec.split(" · ")[0],
        });
        push({ tone: "success", title: "已提交画质增强", description: "在右侧队列查看进度" });
        const done = await waitTask(task.id);
        if (done.status === "succeeded") {
          push({ tone: "success", title: "画质增强完成" });
        } else {
          push({
            tone: "warning",
            title: "增强失败",
            description: done.fail_reason || done.error_code || "上游未返回结果",
          });
        }
      }}
      steps={[
        {
          title: "上传视频",
          description: "点击画面中央上传，支持 5 分钟以内的 mp4 / mov 等格式。",
          icon: ICON_UPLOAD,
        },
        {
          title: "选择目标画质",
          description: "根据原视频分辨率选择更高一档的输出规格。",
          icon: ICON_TARGET,
        },
        {
          title: "开始增强",
          description: "确认积分消耗后提交，画质增强将提升视频清晰度。",
          icon: ICON_SPARK,
        },
      ]}
      controls={
        <section
          aria-label="增强参数"
          className="relative z-[300] grid shrink-0 grid-cols-2 gap-2"
        >
          <div className="generation-model-picker relative min-w-0">
            <PopoverSelect
              label="版本"
              value={version}
              onChange={setVersion}
              ariaLabel="版本"
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
                  <path strokeLinecap="round" strokeLinejoin="round" d={ICON_SPARK} />
                </svg>
              }
              summary={
                <span className="mt-px block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(8px,2.2vw,10px)] font-semibold leading-snug text-foreground">
                  {version}
                </span>
              }
              options={[
                {
                  value: "大模型版",
                  label: "大模型版",
                  description: "画质最佳，速度较慢",
                },
                { value: "极速版", label: "极速版", description: "速度优先" },
              ]}
            />
          </div>
          <div className="generation-settings-picker relative min-w-0">
            <PopoverSelect
              label="视频设置"
              value={spec}
              onChange={setSpec}
              ariaLabel="分辨率与补帧"
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
                  <span className="shrink-0 tabular-nums">1080P</span>
                  <span aria-hidden>·</span>
                  <span className="shrink-0">无</span>
                </span>
              }
              options={[
                { value: "1080P · 无", label: "1080P · 无" },
                { value: "1080P · 30fps", label: "1080P · 30fps" },
                { value: "2K · 60fps", label: "2K · 60fps" },
                { value: "4K · 60fps", label: "4K · 60fps" },
              ]}
            />
          </div>
        </section>
      }
    />
  );
}

/* —— 视频字幕擦除 —— */
export function SubtitleEraseTool() {
  const { push } = useToast();
  return (
    <BenchVideoProcessTool
      title="视频字幕擦除"
      uploadTitle="上传视频"
      uploadHint="支持 30 秒以内的 mp4 / mov / avi 等格式"
      cta="开始擦除"
      previewHint="处理完成后会在这里预览擦除后的视频。"
      onSubmit={async (videoAssetId, regions) => {
        // 行内注释10：字幕擦除必须带框选区域 —— 后端会校验每个区域的宽高。
        const task = await submitSubtitleErase({
          video_asset_id: videoAssetId,
          regions: regions.length > 0 ? regions : [{ x: 0, y: 0, w: 100, h: 100 }],
        });
        push({ tone: "success", title: "已提交字幕擦除", description: "在右侧队列查看进度" });
        const done = await waitTask(task.id);
        if (done.status === "succeeded") {
          push({ tone: "success", title: "字幕擦除完成" });
        } else {
          push({
            tone: "warning",
            title: "擦除失败",
            description: done.fail_reason || done.error_code || "上游未返回结果",
          });
        }
      }}
      steps={[
        {
          title: "上传视频",
          description: "点击画面中央上传，支持 30 秒以内的 mp4 / mov 等格式。",
          icon: ICON_UPLOAD,
        },
        {
          title: "框选字幕",
          description: "在视频预览上拖拽描框，覆盖字幕所在区域。",
          icon: ICON_FRAME,
        },
        {
          title: "微调区域",
          description: "拖动框体可平移，拖动四角手柄可调整大小。",
          icon: ICON_HAND,
        },
        {
          title: "开始擦除",
          description: "确认积分消耗后提交，系统将自动去除框内字幕。",
          icon: ICON_ERASE,
        },
      ]}
    />
  );
}

/* —— 视频去水印 —— */
export function WatermarkRemoveTool() {
  const { push } = useToast();
  const [regions, setRegions] = useState<string[]>(["78,4 / 96,14"]);
  const [selected, setSelected] = useState(0);
  return (
    <BenchVideoProcessTool
      title="视频去水印"
      uploadTitle="上传视频"
      uploadHint="支持 30 秒以内的 mp4 / mov / avi 等格式；超过 2K（长边 2048）将自动压缩至 2K 后处理"
      cta="开始去水印"
      previewHint="处理完成后会在这里预览去水印后的视频。"
      onSubmit={async (videoAssetId) => {
        const task = await submitWatermarkRemove({ video_asset_id: videoAssetId });
        push({ tone: "success", title: "已提交去水印", description: "在右侧队列查看进度" });
        const done = await waitTask(task.id);
        if (done.status === "succeeded") {
          push({ tone: "success", title: "去水印完成" });
        } else {
          push({
            tone: "warning",
            title: "去水印失败",
            description: done.fail_reason || done.error_code || "上游未返回结果",
          });
        }
      }}
      steps={[
        {
          title: "上传视频",
          description: "点击画面中央上传，支持 30 秒以内的 mp4 / mov 等格式。",
          icon: ICON_UPLOAD,
        },
        {
          title: "框选水印",
          description: "在视频预览上拖拽描框，可连续标定多个水印或 logo。",
          icon: ICON_FRAME,
        },
        {
          title: "微调区域",
          description: "点击区域后可平移，拖动四角手柄可调整大小。",
          icon: ICON_HAND,
        },
        {
          title: "开始去水印",
          description: "确认积分消耗后提交，系统将修复框内画面。",
          icon: ICON_SPARK,
        },
      ]}
      controlsInline={
        <section className="shrink-0 rounded-xl border p-2.5 sm:p-3">
          <div className="grid grid-cols-4 gap-1.5">
            {regions.map((r, i) => (
              <div
                key={r}
                data-selected={selected === i}
                className="relative flex h-11 min-w-0 items-center overflow-hidden rounded-lg border px-2 py-1 transition text-foreground"
              >
                <button
                  type="button"
                  onClick={() => { setSelected(i); push({ tone: 'neutral', title: '已选中水印区 ' + (i + 1) }); }}
                  aria-label={`水印区 ${i + 1}: 左上 78,4 · 右下 96,14`}
                  className="min-w-0 flex-1 rounded-md pr-4 text-left"
                >
                  <span className="min-w-0 flex-1 leading-none">
                    <span className="block truncate text-[10px] font-semibold">
                      水印区 {i + 1}
                    </span>
                    <span className="mt-0.5 block truncate text-[9px] font-medium text-muted">
                      {r}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`删除区域 ${i + 1}`}
                  disabled={regions.length <= 1}
                  onClick={() => setRegions((p) => p.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full transition cursor-not-allowed"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="h-3 w-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              aria-label="新增水印区"
              onClick={() => setRegions((p) => [...p, "20,20 / 40,30"])}
              className="grid h-11 min-w-0 place-items-center rounded-lg border border-dashed text-muted transition hover:text-accent-deep"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden
                data-slot="icon"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </button>
          </div>
        </section>
      }
    />
  );
}
