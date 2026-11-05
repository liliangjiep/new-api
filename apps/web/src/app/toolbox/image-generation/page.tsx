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
import { IMAGE_NAV } from "@/lib/skills";

const IMAGE_SKILLS: SkillItem[] = IMAGE_NAV.flatMap((s) =>
  s.items.map((i) => {
    const m = /skill_pack=([^&]+)/.exec(i.href);
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
 * 原站 /toolbox/image-generation（2026-10-30 实测逐字复刻）
 *
 *  编辑区 397.5px
 *   └─ .toolbox-editor-panel-root  p-2 gap-4
 *      └─ div.relative.z-[1].flex.flex-col.gap-2
 *         ├─ .toolbox-editor-panel-header  h52
 *         │   ├─ .image-generation-skill-selector  145×52  → 图片创作
 *         │   └─ button.ui-button.ui-button-ghost  80×32  新建
 *         ├─ .generation-root.generation-controller  flex-1 gap-2
 *         │   ├─ .prompt-composer-root
 *         │   │   ├─ 参考区 "0 / 9" + 3 个 28×28 按钮 + 1 个 64×84 槽位
 *         │   │   ├─ 编辑器 placeholder "请输入图片内容；输入 / 选择生成技能，输入 @ 引用上方参考图片。"
 *         │   │   └─ 底栏 "0 / 2000" + 语音按钮
 *         │   └─ .generation-controller-actions
 *         │       ├─ .generation-controller-selectors  grid-cols-2  模型 / 图片设置  52px
 *         │       └─ .generation-controller-submit  40px  立即生成图片
 *         └─ （提交条在 actions 内）
 */

const MAX_REFS = 9;
const MAX_PROMPT = 2000;

export default function ImageGenerationPage() {
  const { push } = useToast();
  const [skill, setSkill] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [refs, setRefs] = useState(0);
  const [model, setModel] = useState("LC Image 2.5 Pro");
  const [setting, setSetting] = useState("自适应 · 1K 高 · PNG");
  const [tab, setTab] = useState("favorites");
  const [results, setResults] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const gen = () => {
    if (!prompt.trim()) {
      push({ tone: "warning", title: "请先描述画面" });
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setResults(["/images/toapi/result-1.png", "/images/toapi/result-2.png"]);
      setBusy(false);
      setTab("examples");
      push({ tone: "success", title: "图片已生成" });
    }, 1500);
  };

  return (
    <ToolboxShell
      nav={{
        id: "workspace-navigation-image",
        title: "AI 图片",
        sections: IMAGE_NAV,
      }}
      wrapEditor
      editor={
        <div className={PANEL}>
          <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            {/* —— 面板头：技能触发器 + 新建 —— */}
            <div className={`${PANEL_HEADER} !bg-transparent !backdrop-blur-none`}>
              <div className="flex items-center justify-between gap-2">
                <div className="jsx-f5ae78e5cff69c4c image-generation-skill-selector relative flex min-w-0 items-center gap-1">
                  <SkillSelector
                    items={IMAGE_SKILLS}
                    selectedId={skill}
                    onChange={(id) => setSkill(id)}
                    ariaLabel="选择图片生成技能"
                    defaultLabel="图片创作"
                    triggerVisual={
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          skill
                            ? `/images/gen/skill-${skill}.jpg`
                            : "/images/gen/skill-image-creation-v2.png"
                        }
                        alt=""
                        draggable={false}
                        className="relative z-[1] h-full w-full rounded-lg object-contain"
                      />
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("");
                    setRefs(0);
                    setResults([]);
                  }}
                  aria-label="新建"
                  // 原站 resolved（实测）：80×32、padding 12px/20px、font 12px/600、
                  // radius 10px、gap 4px、color rgb(24,24,24)。
                  className="ui-button ui-button-ghost inline-flex items-center justify-center px-5 py-3 text-sm transition-all duration-200 disabled:pointer-events-none disabled:opacity-55 rounded-xl font-medium text-muted hover:bg-black/[0.035] hover:text-accent-deep  inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold !text-accent-deep   disabled:opacity-40"
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

            <div className="generation-root generation-controller flex min-h-0 min-w-0 flex-1 flex-col gap-2 max-lg:h-[520px] max-lg:flex-none image-generation-controller">
              {/* —— 提示词编辑器 —— */}
              <PromptComposer
                count={refs}
                maxCount={MAX_REFS}
                charCount={prompt.length}
                maxChars={MAX_PROMPT}
                placeholder="请输入图片内容；输入 / 选择生成技能，输入 @ 引用上方参考图片。"
                slots={[
                  {
                    id: "product",
                    label: "添加图片",
                    optional: true,
                    src: "/toolboxs/depth-video-clone/ref-image.png",
                  },
                ]}
                onAddSlot={() => setRefs((n) => Math.min(MAX_REFS, n + 1))}
              >
                <MentionEditor
                  value={prompt}
                  onChange={setPrompt}
                  maxChars={MAX_PROMPT}
                />
              </PromptComposer>

              {/* —— 底部：2 列选择器 + 提交 —— */}
              <div className="generation-controller-actions flex shrink-0 flex-col gap-2">
                <div className="generation-controller-selectors shrink-0 relative z-[300] grid grid-cols-2 gap-2">
                  <div className="generation-model-picker relative min-w-0">
                    <PopoverSelect
                      label="模型"
                      value={model}
                      onChange={setModel}
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
                            d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
                          />
                        </svg>
                      }
                      summary={
                        <span className="model-summary-text mt-px flex min-w-0 items-baseline gap-1.5">
                          <span className="model-summary-title min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(8px,2.2vw,10px)] font-semibold leading-snug text-foreground">
                            {model}
                          </span>
                        </span>
                      }
                      options={[
                        {
                          value: "LC Image 2.5 Pro",
                          label: "LC Image 2.5 Pro",
                          description: "画质优先",
                        },
                        {
                          value: "LC Image 2.5 Fast",
                          label: "LC Image 2.5 Fast",
                          description: "速度优先",
                        },
                        {
                          value: "LC Image 2.5",
                          label: "LC Image 2.5",
                          description: "标准",
                        },
                      ]}
                    />
                  </div>
                  <div className="generation-settings-picker relative min-w-0">
                    <PopoverSelect
                      label="图片设置"
                      value={setting}
                      onChange={setSetting}
                      ariaLabel="图片设置"
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
                            <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-[2px] border border-dashed border-current" />
                            自适应
                          </span>
                          <span>·</span>
                          <span className="shrink-0 tabular-nums">1K</span>
                          <span className="ai-image-quality-summary shrink-0">高</span>
                          <span>·</span>
                          <span className="shrink-0">PNG</span>
                        </span>
                      }
                      options={[
                        {
                          value: "自适应 · 1K 高 · PNG",
                          label: "自适应 · 1K 高 · PNG",
                        },
                        {
                          value: "1:1 · 1K 高 · PNG",
                          label: "1:1 · 1K 高 · PNG",
                        },
                        {
                          value: "3:4 · 2K 高 · PNG",
                          label: "3:4 · 2K 高 · PNG",
                        },
                        {
                          value: "16:9 · 1K 高 · JPEG",
                          label: "16:9 · 1K 高 · JPEG",
                        },
                      ]}
                    />
                  </div>
                </div>

                <SubmitBar
                  label="立即生成图片"
                  credits={prompt.trim() ? 4 : null}
                  disabled={!prompt.trim()}
                  loading={busy}
                  onClick={gen}
                />
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
                      图片创作
                    </h2>
                    <div className="result-example-description text-sm leading-none text-muted max-xl:text-xs/none">
                      <p className="result-example-description-line">
                        上传参考图片，描述你的想法
                      </p>
                    </div>
                  </div>
                  <div className="result-example-content relative aspect-video min-h-0 max-h-[70%] w-full max-w-5xl shrink-0">
                    <div className="result-example-stage absolute inset-0 flex min-h-0 flex-col gap-3">
                      <div className="result-example-single flex h-full min-h-0 w-full items-center justify-center">
                        {results.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                            {results.map((s, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={i}
                                src={s}
                                alt={`结果 ${i + 1}`}
                                className="aspect-square w-full rounded-lg border border-line object-cover"
                              />
                            ))}
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src="/images/gen/example-image-1.png"
                            alt=""
                            loading="eager"
                            className="result-example-image min-h-0 max-h-full max-w-full rounded-2xl object-contain"
                          />
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
                <div className="favorite-batch-login flex min-h-0 flex-1 flex-col items-center justify-center gap-3.5 rounded-[1.8rem]  px-6 py-10 text-center">
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
                      d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
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
  );
}
