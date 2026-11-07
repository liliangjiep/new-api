"use client";

import { useState } from "react";
import {
  PANEL,
  QueuePanel,
  ToolHeader,
  ToolboxShell,
} from "@/components/features/BenchWorkspace";
import { AssetPickerModal, type AssetItem } from "@/components/features/AssetPickerModal";
import { useToast } from "@/components/features/ToastHost";
import { submitViralRemix } from "@/lib/backend/tools";
import { waitTask } from "@/lib/backend/tasks";
import { ApiError } from "@/lib/api";

/**
 * 原站 /toolbox/hot-video-remix「爆款裂变」（2026-10-30 实测逐字复刻）
 *
 *  main.workspace-main-content
 *   └─ div.toolbox-workspace-layout
 *      └─ section.max-w-shell
 *         └─ div.genify-toolbox-3col
 *            ├─ div.toolbox-edit-region  [aria-label=编辑区]
 *            │   └─ div.card.toolbox-editor-panel-root
 *            │       └─ div.relative.z-[1].flex.flex-col.gap-2
 *            │           ├─ div.toolbox-editor-panel-header      h32
 *            │           │   └─ ToolHeader（返回 · 爆款裂变 · 新建）
 *            │           ├─ div.relative.min-h-0.lg:flex-1.flex-col.gap-4.pr-1
 *            │           │   ├─ section.ui-hot-video-source-list.space-y-2
 *            │           │   │   ├─ div.flex.items-center.justify-between.gap-2
 *            │           │   │   │   └─ h3.source-video-title「1. 上传视频」
 *            │           │   │   └─ div.space-y-2
 *            │           │   │       └─ button.source-video-empty-trigger  438×82
 *            │           │   │           └─ span.source-video-empty-copy
 *            │           │   │               ├─ svg 24×24
 *            │           │   │               └─ span「支持 mp4 / mov / avi，最多 3 条」
 *            │           │   ├─ section.ui-hot-video-segments.space-y-2
 *            │           │   │   ├─ div.flex.items-center.justify-between.gap-2
 *            │           │   │   │   ├─ h3.segment-picker-title「2. 视频片段」
 *            │           │   │   │   └─ div.flex.gap-1  「自动拆分」「添加片段」h24
 *            │           │   │   └─ div.segment-picker-empty  min-h-[7rem]
 *            │           │   └─ section.ui-hot-video-audio.space-y-2
 *            │           │       ├─ div.flex.items-center.justify-between.gap-2
 *            │           │       │   ├─ h3.audio-picker-title「3. 音频」
 *            │           │       │   └─ button「上传音频」h24
 *            │           │       └─ div.rounded-xl.border.p-2  [role=radiogroup aria-label=成片音频]
 *            │           │           └─ div.space-y-1.5 > p.audio-picker-empty
 *            │           └─ div.sticky.bottom-0.z-[2]  ← 提交条「开始裂变」
 *            ├─ div.toolbox-preview-region  [aria-label=预览区]
 *            │   └─ div.card  标题「裂变视频」+ 全选/下载/删除 + 暂无裂变视频 + 共 0 条结果
 *            └─ div.toolbox-queue-region  [aria-label=最近任务]
 */

const MAX_VIDEOS = 3;

export function HotVideoRemixTool() {
  const { push } = useToast();
  const [videos, setVideos] = useState<string[]>([]);
  /** 行内注释11：源视频的资产 ID —— 后端要 ast_* ID，名字只是展示用。 */
  const [videoAssetIds, setVideoAssetIds] = useState<string[]>([]);
  const [segments, setSegments] = useState<string[]>([]);
  const [audio, setAudio] = useState<string | null>(null);
  /** 行内注释11.1：成片音频的资产 ID。 */
  const [audioAssetId, setAudioAssetId] = useState<string | null>(null);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [audioPickerOpen, setAudioPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const autoSplit = () => {
    if (videos.length === 0) {
      push({ tone: "warning", title: "请先上传视频" });
      return;
    }
    setSegments(["片段 1", "片段 2", "片段 3"]);
  };

  const submit = async () => {
    if (videos.length === 0) {
      push({ tone: "warning", title: "请先上传视频" });
      return;
    }
    if (videoAssetIds.length === 0) {
      push({ tone: "warning", title: "请先从资产库选择源视频" });
      return;
    }
    setBusy(true);
    try {
      // 行内注释12：裂变逐条提交 —— 每条源视频一个爆款混剪任务。
      for (const assetId of videoAssetIds) {
        const task = await submitViralRemix({
          source_video_asset_id: assetId,
          strategy: segments.length > 0 ? segments.join(",") : "auto",
        });
        const done = await waitTask(task.id);
        if (done.status === "succeeded") {
          push({
            tone: "success",
            title: "裂变完成",
            description: done.result?.result_urls?.[0] ?? "",
          });
        } else {
          push({
            tone: "warning",
            title: "裂变失败",
            description: done.fail_reason || done.error_code || "上游未返回结果",
          });
        }
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
      editor={
        <div className={PANEL}>
          <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            {/* —— 面板头：返回 + 爆款裂变 + 新建 —— */}
            <div className="toolbox-editor-panel-header relative z-[1] shrink-0 backdrop-blur-sm">
              <ToolHeader
                title="爆款裂变"
                onBack={() => window.history.back()}
                onNew={() => {
                  setVideos([]);
                  setSegments([]);
                  setAudio(null);
                }}
              />
            </div>

            <div className="relative min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-y-contain scrollbar-none flex min-h-0 flex-1 flex-col gap-4 pr-1">
              {/* —— 1. 上传视频 —— */}
              <section className="ui-hot-video-source-list space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="source-video-title text-xs font-semibold text-foreground">
                    1. 上传视频
                  </h3>
                </div>
                <div className="space-y-2">
                  {videos.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setVideoPickerOpen(true)}
                      aria-label="上传视频"
                      className="source-video-empty-trigger group flex min-h-[5rem] w-full flex-col items-center justify-center rounded-xl border border-solid   px-4 py-4 text-center transition  "
                    >
                      <span className="source-video-empty-copy flex flex-col items-center transition-transform duration-300 group-hover:scale-[1.02]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          aria-hidden
                          className="h-6 w-6 text-muted"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16"
                          />
                        </svg>
                        <span className="mt-2 text-xs font-semibold text-muted">
                          支持 mp4 / mov / avi，最多 {MAX_VIDEOS} 条
                        </span>
                      </span>
                    </button>
                  ) : (
                    <ul className="space-y-2">
                      {videos.map((v, i) => (
                        <li
                          key={v}
                          className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-foreground"
                        >
                          <span className="truncate">{v}</span>
                          <button
                            type="button"
                            aria-label={`移除 ${v}`}
                            onClick={() => {
                              setVideos((p) => p.filter((_, j) => j !== i));
                              setVideoAssetIds((p) => p.filter((_, j) => j !== i));
                            }}
                            className="text-muted transition hover:text-foreground"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.6}
                              stroke="currentColor"
                              aria-hidden
                              className="h-3.5 w-3.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 6l12 12M18 6 6 18"
                              />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {/* —— 2. 视频片段 —— */}
              <section className="ui-hot-video-segments space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="segment-picker-title text-xs font-semibold text-foreground">
                    2. 视频片段
                  </h3>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={autoSplit}
                      disabled={videos.length === 0}
                      className="inline-flex h-6 items-center rounded-md border   px-2 text-[10px] font-medium text-foreground transition hover:bg-surface disabled:pointer-events-none disabled:opacity-45"
                    >
                      自动拆分
                    </button>
                    <button
                      type="button"
                      onClick={() => setSegments((p) => [...p, `片段 ${p.length + 1}`])}
                      disabled={videos.length === 0}
                      className="inline-flex h-6 items-center rounded-md border   px-2 text-[10px] font-medium text-foreground transition hover:bg-surface disabled:pointer-events-none disabled:opacity-45"
                    >
                      添加片段
                    </button>
                  </div>
                </div>
                {segments.length === 0 ? (
                  <div className="segment-picker-empty flex min-h-[7rem] flex-col items-center justify-center rounded-xl border border-solid   px-4 text-center text-xs font-semibold text-muted">
                    <span>上传视频后，点击自动拆分或添加片段来生成可参与重组的片段。</span>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {segments.map((s, i) => (
                      <li
                        key={`${s}-${i}`}
                        className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-foreground"
                      >
                        <span className="truncate flex-1">{s}</span>
                        <button
                          type="button"
                          aria-label={`移除 ${s}`}
                          onClick={() => setSegments((p) => p.filter((_, j) => j !== i))}
                          className="text-muted transition hover:text-foreground"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.6}
                            stroke="currentColor"
                            aria-hidden
                            className="h-3.5 w-3.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 6l12 12M18 6 6 18"
                            />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* —— 3. 音频 —— */}
              <section className="ui-hot-video-audio space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="audio-picker-title text-xs font-semibold text-foreground">
                    3. 音频
                  </h3>
                  <button
                    type="button"
                    onClick={() => setAudioPickerOpen(true)}
                    className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border   px-2 text-[10px] font-medium text-foreground transition  hover:bg-surface"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      aria-hidden
                      className="h-3 w-3"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    上传音频
                  </button>
                </div>
                <div
                  role="radiogroup"
                  aria-label="成片音频"
                  className="rounded-xl border   p-2"
                >
                  <div className="space-y-1.5">
                    {audio ? (
                      <p className="audio-picker-empty py-3 text-center text-xs font-semibold text-muted">
                        {audio}
                      </p>
                    ) : (
                      <p className="audio-picker-empty py-3 text-center text-xs font-semibold text-muted">
                        上传视频或音频后可选择音轨
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* —— 提交条 —— */}
          <div className="sticky bottom-0 z-[2] flex shrink-0 flex-col">
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="ui-button ui-button-primary inline-flex items-center justify-center px-5 py-3 text-sm transition-all duration-200 disabled:pointer-events-none disabled:opacity-55 rounded-xl border-0 bg-accent font-semibold tracking-wide text-on-accent shadow-glow  toolbox-generation-submit-button relative w-full flex-wrap gap-x-5 gap-y-1 rounded-md py-1.5 text-xs  "
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                    />
                  </svg>
                  <span className="generation-submit-label truncate">
                    {busy ? "提交中…" : "开始裂变"}
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
          <div className="shrink-0 pb-2 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  裂变视频
                </h2>
                <p className="mt-0.5 text-xs font-medium text-muted">
                  提交任务后，这里会展示裂变生成的视频。
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={videos.length === 0}
                  onClick={() => push({ tone: "neutral", title: "已全选" })}
                  className="ui-button ui-button-secondary inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold text-foreground backdrop-blur-sm hover:bg-surface disabled:pointer-events-none disabled:opacity-55"
                >
                  <span className="mr-1.5 grid h-3.5 w-3.5 place-items-center rounded border border-line bg-surface/90" />
                  全选
                </button>
                <button
                  type="button"
                  disabled={videos.length === 0}
                  onClick={() => push({ tone: "neutral", title: "开始下载" })}
                  className="ui-button ui-button-secondary inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold text-foreground backdrop-blur-sm hover:bg-surface disabled:pointer-events-none disabled:opacity-55"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="mr-1 h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  下载
                </button>
                <button
                  type="button"
                  disabled={videos.length === 0}
                  onClick={() => push({ tone: "neutral", title: "已删除所选" })}
                  className="ui-button ui-button-secondary inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold text-foreground backdrop-blur-sm hover:bg-surface disabled:pointer-events-none disabled:opacity-55"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="mr-1 h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                  删除
                </button>
              </div>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain pt-2 scrollbar-none">
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden
                data-slot="icon"
                className="h-10 w-10 text-muted"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0 1 18 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 0 1 6 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621-.504-1.125-1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5"
                />
              </svg>
              <p className="mt-4 text-sm text-muted">暂无裂变视频</p>
            </div>
            <div className="shrink-0 pt-2 text-xs font-medium text-muted">共 0 条结果</div>
          </div>
        </div>
      }
      queue={
        <QueuePanel />
      }
    />
    <AssetPickerModal
      open={videoPickerOpen}
      kind="video"
      title="选择参考视频"
      subtitle="参考视频会保存至资产库，处理期间始终可见。"
      maxSelect={MAX_VIDEOS}
      onClose={() => setVideoPickerOpen(false)}
      onConfirm={(assets: AssetItem[]) => {
        if (assets.length === 0) return;
        setVideos((p) => [...p, ...assets.map((a) => a.name)].slice(0, MAX_VIDEOS));
        setVideoAssetIds((p) => [...p, ...assets.map((a) => a.id)].slice(0, MAX_VIDEOS));
      }}
    />
    <AssetPickerModal
      open={audioPickerOpen}
      kind="audio"
      title="选择参考音频"
      subtitle="参考音频会保存至资产库，处理期间始终可见。"
      maxSelect={1}
      onClose={() => setAudioPickerOpen(false)}
      onConfirm={(assets: AssetItem[]) => {
        if (assets[0]) {
          setAudio(assets[0].name);
          setAudioAssetId(assets[0].id);
        }
      }}
    />
    </>
  );
}
