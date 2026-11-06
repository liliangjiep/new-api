"use client";

import { useState } from "react";
import {
  PANEL,
  PANEL_HEADER,
  PreviewPanel,
  QueuePanel,
  SubmitBar,
  ToolboxShell,
} from "@/components/features/BenchWorkspace";
import { PromptComposer } from "@/components/features/PromptComposer";
import { MentionEditor } from "@/components/features/MentionEditor";
import { PopoverSelect } from "@/components/features/PopoverSelect";
import { SkillSelector, type SkillItem } from "@/components/features/SkillSelector";
import { useToast } from "@/components/features/ToastHost";
import { VIDEO_NAV } from "@/lib/skills";
import { runTaskToCompletion, type TaskRecord } from "@/lib/backend/tasks";
import { ApiError } from "@/lib/api";

const VIDEO_SKILLS: SkillItem[] = VIDEO_NAV.flatMap((s) =>
  s.items.map((i) => {
    const m = /skill=([^&]+)/.exec(i.href);
    return {
      id: m?.[1] ?? i.label,
      label: i.label,
      description: i.description ?? "",
      category: { key: s.title, label: s.title },
      imageUrl: i.imageUrl,
    };
  }),
);

/**
 * 原站 /toolbox/video-generation（2026-10-30 实测逐字复刻）
 *
 *  编辑区 397.5px
 *   └─ .toolbox-editor-panel-root
 *      └─ div.video-generation-panel-content  gap-2
 *         ├─ .toolbox-editor-panel-header  h52
 *         │   ├─ .video-generation-skill-selector  145×52 → 视频创作
 *         │   └─ button.ui-button.ui-button-ghost  80×32  aria-label="清空配置并新建"
 *         ├─ .generation-root.generation-controller
 *         │   ├─ .prompt-composer-root
 *         │   │   ├─ "0 / 40" + 3 按钮
 *         │   │   ├─ 3 个 64×84 槽位（图片 / 角色 / 声音，1px 分隔线）
 *         │   │   ├─ placeholder "输入视频提示词，使用 @ 指定参考素材，或「帮我写」"
 *         │   │   └─ "0 / 12000" + 语音 + 「超级编导」90×28
 *         │   └─ .generation-controller-actions
 *         │       ├─ .video-generation-settings-selectors  grid-cols-2
 *         │       │    ├─ 模型  Seedance-2.5
 *         │       │    └─ 视频设置 9:16 · 480P · 25s
 *         │       └─ .generation-controller-submit  立即生成视频
 */

const MAX_MATERIALS = 40;
const MAX_PROMPT = 12000;

/**
 * 行内注释1：视频设置 → model_key / spec。
 * 后端定价表：video.t2v.720p（优速 14 分）、video.t2v.mini（轻量 3 分）、video.i2v.kling（参考生 18 分）。
 */
function resolveVideoModel(model: string, setting: string): { modelKey: string; spec: string } {
  if (model.includes("Kling")) {
    return { modelKey: "video.i2v.kling", spec: "Kling 4.0 720P 5 秒" };
  }
  if (model.includes("Mini")) {
    return { modelKey: "video.t2v.mini", spec: "720P 5 秒" };
  }
  // 行内注释1.1：480P 批量档 → video.batch.480p。
  if (/480P/i.test(setting) && /批量|batch/i.test(model + setting)) {
    return { modelKey: "video.batch.480p", spec: "5 镜 × 5 秒 480P" };
  }
  return { modelKey: "video.t2v.720p", spec: "720P 5 秒" };
}

/** 行内注释2：宽高比 + 时长 → 上游参数。 */
function resolveVideoParams(setting: string): Record<string, unknown> {
  const ratio = /(1:1|3:4|4:3|16:9|9:16)/.exec(setting)?.[1] ?? "9:16";
  const seconds = Number(/(\d+)s/.exec(setting)?.[1] ?? 5);
  const resolution = /(\d{3,4}P)/i.exec(setting)?.[1]?.toUpperCase() ?? "720P";
  return { aspect_ratio: ratio, duration: seconds, resolution };
}

export default function VideoGenerationPage() {
  const { push } = useToast();
  const [skill, setSkill] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(0);
  const [model, setModel] = useState("Seedance-2.5");
  const [setting, setSetting] = useState("9:16 · 480P · 25s");
  const [tab, setTab] = useState("examples");
  const [results, setResults] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState<TaskRecord | null>(null);

  /**
   * 行内注释3：真生成 —— 报价 → 提交 → 轮询终态 → 展示上游视频 URL。
   */
  const gen = async () => {
    if (!prompt.trim()) {
      push({ tone: "warning", title: "请先描述视频画面" });
      return;
    }
    setBusy(true);
    setProgress(0);
    setResults([]);
    try {
      const { modelKey, spec } = resolveVideoModel(model, setting);
      const task = await runTaskToCompletion(
        {
          modelKey,
          spec,
          count: 1,
          params: { prompt: prompt.trim(), ...resolveVideoParams(setting) },
        },
        {
          onTaskCreated: (t) => setCurrentTask(t),
          onProgress: (t) => setProgress(t.progress ?? 0),
        },
      );
      setCurrentTask(task);
      if (task.status === "succeeded") {
        const urls = task.result?.result_urls ?? [];
        setResults(urls);
        setTab("examples");
        push({
          tone: "success",
          title: "视频已生成",
          description: urls.length > 0 ? `由 ${task.result?.channel_name ?? "中转站"} 返回` : undefined,
        });
      } else {
        push({
          tone: "warning",
          title: "生成失败",
          description: task.fail_reason || task.error_code || "上游未返回结果",
        });
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "生成失败，请稍后重试";
      push({ tone: "warning", title: "生成失败", description: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <ToolboxShell
      nav={{
        id: "workspace-navigation-video",
        title: "AI 视频",
        sections: VIDEO_NAV,
      }}
      wrapEditor
      editor={
        <div className={PANEL}>
          <div className="video-generation-panel-content relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            {/* —— 面板头 —— */}
            <div className={PANEL_HEADER}>
              <div className="video-generation-header-actions flex items-center justify-between gap-2">
                <div className="jsx-f5ae78e5cff69c4c video-generation-skill-selector relative flex min-w-0 items-center gap-1">
                  <SkillSelector
                    items={VIDEO_SKILLS}
                    selectedId={skill}
                    onChange={(id) => setSkill(id)}
                    ariaLabel="选择视频生成技能"
                    defaultLabel="视频创作"
                    triggerVisual={
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          skill
                            ? `/images/gen/skill-${skill}.jpg`
                            : "/images/gen/skill-video-creation-v2.png"
                        }
                        alt=""
                        draggable={false}
                        className="video-generation-skill-default-visual relative z-[1] h-full w-full object-contain"
                      />
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("");
                    setCount(0);
                    setResults([]);
                  }}
                  aria-label="清空配置并新建"
                  className="ui-button ui-button-ghost inline-flex items-center justify-center px-5 py-3 text-sm transition-all duration-200 disabled:pointer-events-none disabled:opacity-55 rounded-xl font-medium text-muted hover:bg-black/[0.035] hover:text-accent-deep video-generation-new-button inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold !text-accent-deep disabled:opacity-40"
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

            <div className="generation-root generation-controller flex min-h-0 min-w-0 flex-1 flex-col gap-2 max-lg:h-[520px] max-lg:flex-none video-generation-controller">
              <PromptComposer
                count={count}
                maxCount={MAX_MATERIALS}
                charCount={prompt.length}
                maxChars={MAX_PROMPT}
                countClassName="video-generation-reference-header-left flex min-w-0 items-center gap-2"
                countLabelClassName="video-generation-reference-count shrink-0 text-[10px] font-medium tabular-nums text-muted"
                fullscreenClassName="video-generation-prompt-fullscreen-toggle inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-muted"
                toolbarZClassName="z-[400]"
                rootClassName="prompt-composer-root relative flex flex-col overflow-x-visible rounded-xl border border-line shadow-sm min-h-0 flex-1 video-generation-flow relative flex min-h-0 flex-1 flex-col px-2 flex w-full min-h-0 flex-col max-lg:h-[min(66vh,34rem)] max-lg:min-h-[22rem] lg:flex-1"
                placeholder={
                  <>
                    输入视频提示词，使用 @ 指定参考素材，或
                    <button
                      type="button"
                      onClick={() => { setPrompt("一位宇航员在霓虹城市中漫步，电影感，THE SUPER DIRECTOR 风格"); push({ tone: "success", title: "已填入示例提示词" }); }}
                      className="milkdown-mention-editor-placeholder-action pointer-events-auto ml-1 inline cursor-pointer whitespace-nowrap p-0 font-normal transition-colors text-foreground hover:text-foreground"
                    >
                      「帮我写」
                    </button>
                  </>
                }
                slots={[
                  {
                    id: "reference_1",
                    label: "添加图片",
                    optional: true,
                    src: "/toolboxs/depth-video-clone/ref-image.png",
                  },
                  {
                    id: "reference_2",
                    label: "添加角色",
                    optional: true,
                    src: "/toolboxs/depth-video-clone/ref-character.png",
                  },
                  {
                    id: "reference_4",
                    label: "添加声音",
                    optional: true,
                    src: "/toolboxs/depth-video-clone/ref-voice.png",
                  },
                ]}
                onAddSlot={() =>
                  setCount((n) => Math.min(MAX_MATERIALS, n + 1))
                }
                action={
                  <div className="prompt-reference-action ml-auto flex shrink-0 justify-end">
                    <button
                      type="button"
                      onClick={() => { setPrompt((v) => v || "城市夜景，雨后倒影，缓慢推镜，电影质感"); push({ tone: "success", title: "超级编导已润色（演示）" }); }}
                      className="video-generation-prompt-helper-button inline-flex h-7 items-center justify-center rounded-md bg-transparent px-2 text-xs font-semibold leading-none text-[#0471fe] shadow-none transition-colors hover:text-[#005bd3] disabled:pointer-events-none disabled:!text-muted disabled:opacity-60 disabled:hover:!text-muted"
                    >
                      <svg
                        className="video-generation-prompt-helper-icon mr-1 h-3.5 w-[22px] shrink-0"
                        viewBox="0 0 24 16"
                        fill="none"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <g className="video-generation-prompt-helper-icon-main" opacity="1">
                          <path
                            d="M7.2 1.4l1.3 3.55 3.55 1.3-3.55 1.3-1.3 3.55-1.3-3.55-3.55-1.3 3.55-1.3L7.2 1.4z"
                            fill="currentColor"
                          />
                        </g>
                        <g className="video-generation-prompt-helper-icon-small" opacity="0.26">
                          <path
                            d="M17.4 2.8l.65 1.72 1.72.65-1.72.65-.65 1.72-.65-1.72-1.72-.65 1.72-.65.65-1.72z"
                            fill="currentColor"
                          />
                          <path
                            d="M19.7 8.8l.48 1.25 1.25.48-1.25.48-.48 1.25-.48-1.25-1.25-.48 1.25-.48.48-1.25z"
                            fill="currentColor"
                          />
                        </g>
                      </svg>
                      <span className="video-generation-prompt-helper-text">
                        超级编导
                      </span>
                    </button>
                  </div>
                }
              >
                <MentionEditor
                  value={prompt}
                  onChange={setPrompt}
                  maxChars={MAX_PROMPT}
                  placeholder={
                    <>
                      输入视频提示词，使用 @ 指定参考素材，或
                      <button
                        type="button"
                        onClick={() => { setPrompt("一位宇航员在霓虹城市中漫步，电影感，THE SUPER DIRECTOR 风格"); push({ tone: "success", title: "已填入示例提示词" }); }}
                      className="milkdown-mention-editor-placeholder-action pointer-events-auto ml-1 inline cursor-pointer whitespace-nowrap p-0 font-normal transition-colors text-foreground hover:text-foreground"
                      >
                        「帮我写」
                      </button>
                    </>
                  }
                />
              </PromptComposer>

              <div className="generation-controller-actions flex shrink-0 flex-col gap-2">
                <div className="generation-controller-selectors shrink-0">
                  <div className="video-generation-settings-selectors relative z-[300] grid shrink-0 grid-cols-2 gap-2">
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
                            alt=""
                            aria-hidden
                            loading="lazy"
                            width={14}
                            height={14}
                            decoding="async"
                            className="video-model-glyph h-3.5 w-3.5 [[data-site-tone=dark]_&]:invert"
                            src="/images/toolbox/bytedance.svg"
                            style={{ color: "transparent" }}
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
                            description: "默认",
                          },
                          {
                            value: "Seedance-2.5 Lite",
                            label: "Seedance-2.5 Lite",
                            description: "速度优先",
                          },
                          {
                            value: "Seedance-1.5 Pro",
                            label: "Seedance-1.5 Pro",
                            description: "画质优先",
                          },
                        ]}
                      />
                    </div>
                    <div className="generation-settings-picker relative min-w-0">
                      <PopoverSelect
                        label="视频设置"
                        value={setting}
                        onChange={setSetting}
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
                            <span className="shrink-0">25s</span>
                          </span>
                        }
                        options={[
                          { value: "9:16 · 480P · 25s", label: "9:16 · 480P · 25s" },
                          { value: "16:9 · 480P · 25s", label: "16:9 · 480P · 25s" },
                          { value: "1:1 · 720P · 10s", label: "1:1 · 720P · 10s" },
                          { value: "9:16 · 1080P · 25s", label: "9:16 · 1080P · 25s" },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                <div className="generation-controller-submit video-generation-submit-bar sticky bottom-0 z-[2] flex shrink-0 flex-col">
                  <SubmitBar
                    label={busy && progress > 0 ? `生成中 ${progress}%` : "立即生成视频"}
                    credits={prompt.trim() ? 14 : null}
                    disabled={!prompt.trim()}
                    loading={busy}
                    onClick={gen}
                    bare
                    buttonClassName="ui-button ui-button-primary inline-flex items-center justify-center px-5 py-3 text-sm transition-all duration-200 disabled:pointer-events-none disabled:opacity-55 rounded-xl border-0 bg-accent font-semibold tracking-wide text-on-accent shadow-glow toolbox-generation-submit-button relative w-full flex-wrap gap-x-5 gap-y-1 rounded-md py-1.5 text-xs video-generation-submit-button data-[guide-active=true]:!bg-[#111] data-[guide-active=true]:!text-white data-[guide-active=true]:disabled:!opacity-100"
                    titleClassName="generation-submit-title flex min-w-0 max-w-full items-center justify-center gap-2 truncate text-center video-generation-submit-title"
                  />
                </div>
              </div>
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
                      视频创作
                    </h2>
                    <div className="result-example-description text-sm leading-none text-muted max-xl:text-xs/none">
                      <p className="result-example-description-line">
                        上传素材，用
                        <button
                          type="button"
                          onClick={() => { setPrompt("城市夜景，雨后倒影，缓慢推镜，电影质感"); setTab("examples"); push({ tone: "success", title: "超级编导已填入提示词" }); }}
                          className="result-example-description-action inline cursor-pointer border-0 bg-transparent p-0 text-[#0471fe] [&_strong]:text-[#0471fe]"
                        >
                          <strong className="result-example-description-emphasis font-bold text-foreground">
                            「超级编导」
                          </strong>
                        </button>
                        一键成片
                      </p>
                    </div>
                  </div>
                  <div className="result-example-content relative aspect-video min-h-0 max-h-[70%] w-full max-w-5xl shrink-0">
                    <div className="result-example-stage absolute inset-0 flex min-h-0 flex-col gap-3">
                      <div className="result-example-single flex h-full min-h-0 w-full items-center justify-center">
                        {results.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                            {results.map((s, i) => (
                              // 行内注释4：视频结果用 <video> 播放，图片结果用 <img> 预览。
                              <video
                                key={`v-${i}`}
                                src={s}
                                controls
                                playsInline
                                preload="metadata"
                                className="aspect-square w-full rounded-lg border border-line bg-black object-cover"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="result-example-video-frame relative h-full min-w-0 max-w-full overflow-hidden rounded-2xl">
                            <div className="interactive-video-cover relative h-full max-w-full overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src="/images/gen/example-video-1.png"
                                alt=""
                                loading="eager"
                                className="video-thumbnail-image interactive-video-cover-poster block h-full max-h-full w-auto max-w-full object-contain"
                              />
                            </div>
                          </div>
                        )}
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
        <QueuePanel />
      }
    />
    {/* 原站：视频生成页固定挂载一个空的引导层（video-generation-guide） */}
    <div className="video-generation-guide pointer-events-none fixed inset-0 z-[9000]" />
    </>
  );
}
