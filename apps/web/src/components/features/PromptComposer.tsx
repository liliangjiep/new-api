"use client";

import { Fragment, useState } from "react";
import { cn } from "@/lib/cn";
import { AssetPickerModal, type AssetItem } from "@/components/features/AssetPickerModal";
import { useToast } from "@/components/features/ToastHost";

/**
 * 原站提示词编辑器（prompt-composer-root 实测 class 逐字复刻）
 *
 *  div.prompt-composer-root  relative flex flex-col rounded-xl border
 *      border-color rgba(0,0,0,.06)  bg #fcfcfc  px-2  shadow-sm
 *   ├─ div.prompt-reference-uploader   p-2 gap-1.5
 *   │   ├─ div.prompt-reference-header  min-h-6
 *   │   │   ├─ div.ai-image-reference-header-leading → span "0 / 9"
 *   │   │   └─ div.prompt-library-actions  3 × 28×28 按钮
 *   │   └─ div.prompt-materials-section
 *   │       └─ div.prompt-toolbar-shell-wrap > .prompt-toolbar-shell > .prompt-toolbar-materials
 *   │           └─ .prompt-material-tray > div.flex.items-center.gap-1.5
 *   │               └─ .prompt-reference-slot-content > .reference-slot-uploader
 *   │                   └─ .reference-slot-list > section.reference-slot-card 64×84
 *   ├─ div.prompt-editor-shell         flex-1 pb-2.5
 *   │   └─ .prompt-editor-viewport > .markdown-mention-editor-root
 *   │       └─ .milkdown-editor-container > .milkdown-editor-shell
 *   │           ├─ placeholder (absolute, text-sm leading-6 text-muted)
 *   │           └─ .milkdown-editor-root > .milkdown > .ProseMirror.editor
 *   └─ div.prompt-reference-bottom-action  px-3
 *       ├─ span.prompt-reference-char-count  "0 / 2000"
 *       ├─ div.prompt-reference-speech-slot > .speech-input-controls
 *       │   └─ button.speech-input-controls-microphone  32×32 rounded-full
 *       └─ div.prompt-reference-action  （仅视频页）
 */

export interface ReferenceSlot {
  id: string;
  label: string;
  optional?: boolean;
  src?: string;
  required?: boolean;
}

export function PromptComposer({
  count,
  maxCount,
  charCount,
  maxChars,
  placeholder,
  slots,
  onAddSlot,
  onSlotClick,
  action,
  countClassName,
  countLabelClassName,
  fullscreenClassName,
  toolbarZClassName = "z-10",
  rootClassName,
  children,
  onPickSlot,
  pickedSrc,
}: {
  count: number;
  maxCount: number;
  charCount: number;
  maxChars: number;
  placeholder: React.ReactNode;
  slots: ReferenceSlot[];
  onAddSlot: () => void;
  onSlotClick?: (id: string) => void;
  /** 视频页「超级编导」等右侧动作 */
  action?: React.ReactNode;
  countClassName?: string;
  countLabelClassName?: string;
  fullscreenClassName?: string;
  toolbarZClassName?: string;
  rootClassName?: string;
  /** 自定义编辑区（默认 textarea） */
  children?: React.ReactNode;
  /** 选中资产后回调（资产库弹窗确认时） */
  onPickSlot?: (slotId: string, assets: AssetItem[]) => void;
  /** 外部已选封面（slotId -> url），用于回显 */
  pickedSrc?: Record<string, string>;
}) {
  const { push } = useToast();
  const [pickerSlot, setPickerSlot] = useState<string | null>(null);
  const [localSrc, setLocalSrc] = useState<Record<string, string>>({});
  const [myOpen, setMyOpen] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [speechOn, setSpeechOn] = useState(false);
  const mergedSrc = { ...localSrc, ...(pickedSrc ?? {}) };
  const openFor = (id: string) => {
    if (onSlotClick) {
      onSlotClick(id);
      return;
    }
    setPickerSlot(id);
  };
  const pickerKind = (pickerSlot?.includes("voice") || pickerSlot?.includes("audio") || pickerSlot?.includes("sound")) ? "audio" as const : (pickerSlot?.includes("video") ? "video" as const : "image" as const);
  return (
    <>
    {expanded ? (
      <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="展开编辑">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-xl border border-line bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <span className="text-sm font-semibold">展开编辑（演示）</span>
            <button type="button" aria-label="关闭展开编辑" onClick={() => setExpanded(false)} className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-muted hover:text-foreground">关闭</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 text-sm text-muted">提示词编辑器全屏演示。全屏态可正常关闭，无需后端。</div>
        </div>
      </div>
    ) : null}
    {myOpen ? (
      <div className="absolute right-0 top-9 z-[90] w-64 rounded-xl border border-line bg-background p-2 shadow-xl" role="dialog" aria-label="我的提示词">
        <p className="px-2 py-1 text-xs font-semibold text-muted">我的提示词（演示）</p>
        {saved.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted">暂无保存，点击左侧下载图标即可保存一条演示。</p>
        ) : saved.map((s) => (
          <p key={s} className="truncate px-2 py-1 text-xs">{s}</p>
        ))}
        <button type="button" onClick={() => setMyOpen(false)} className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs font-semibold text-muted hover:bg-muted hover:text-foreground">关闭</button>
      </div>
    ) : null}
    <AssetPickerModal
      open={pickerSlot !== null}
      kind={pickerKind}
      title={pickerKind === "audio" ? "选择声音参考" : pickerKind === "video" ? "选择参考视频" : "选择图片参考"}
      subtitle="参考素材会保存至资产库，处理期间始终可见。"
      maxSelect={pickerKind === "audio" ? 1 : 4}
      onClose={() => setPickerSlot(null)}
      onConfirm={(assets) => {
        if (pickerSlot && assets[0]) {
          const cover = assets[0].thumb ?? assets[0].url;
          if (cover) setLocalSrc((p) => ({ ...p, [pickerSlot]: cover }));
          onPickSlot?.(pickerSlot, assets);
        }
        // 保持原计数行为：选中即 +1
        onAddSlot();
      }}
    />
    {/* 原站 class（实测）：
      prompt-composer-root relative flex flex-col overflow-x-visible rounded-xl
      border border-line shadow-sm min-h-0 flex-1 relative flex min-h-0 flex-1
      flex-col px-2 flex w-full min-h-0 flex-col
      max-lg:h-[min(66vh,34rem)] max-lg:min-h-[22rem] lg:flex-1 !bg-background
    关键：min-h-0 + flex-1 + lg:flex-1 缺一不可，否则编辑器不撑满
    （实测 ours height=220px flexGrow=0 vs orig 662px flexGrow=1）。 */}
    <div
      className={
        rootClassName ??
        "prompt-composer-root relative flex flex-col overflow-x-visible rounded-xl border border-line shadow-sm min-h-0 flex-1 relative flex min-h-0 flex-1 flex-col px-2 flex w-full min-h-0 flex-col max-lg:h-[min(66vh,34rem)] max-lg:min-h-[22rem] lg:flex-1 !bg-background"
      }
    >
      {/* —— 参考素材区 —— */}
      <div className="prompt-reference-uploader flex min-w-0 shrink-0 flex-col gap-1.5 p-2">
        <div className="prompt-reference-header flex min-h-6 items-center justify-between gap-2">
          <div
            className={
              countClassName ??
              "ai-image-reference-header-leading flex min-w-0 items-center gap-2"
            }
          >
            <span
              className={
                countLabelClassName ??
                "shrink-0 text-[10px] font-medium tabular-nums text-muted"
              }
            >
              {count} / {maxCount}
            </span>
          </div>
          <div className="prompt-library-actions shrink-0 relative flex flex-row items-center gap-1">
            <span className="ui-hover-tooltip-trigger inline-flex items-center justify-center outline-none ">
              <button
                type="button"
                aria-label="保存当前提示词"
                onClick={() => {
                  setSaved((p) => [`提示词 ${p.length + 1} · ${new Date().toLocaleTimeString()}`, ...p].slice(0, 5));
                  push({ tone: "success", title: "已保存到我的提示词" });
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--canvas-text-muted)] transition hover:bg-white/[0.58] hover:text-[var(--canvas-text)] disabled:cursor-not-allowed disabled:opacity-40 "
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
                    d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859M12 3v8.25m0 0-3-3m3 3 3-3"
                  />
                </svg>
              </button>
            </span>
            <span className="ui-hover-tooltip-trigger inline-flex items-center justify-center outline-none ">
              <button
                type="button"
                aria-label="我的提示词"
                onClick={() => setMyOpen((v) => !v)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--canvas-text-muted)] transition hover:bg-white/[0.58] hover:text-[var(--canvas-text)] disabled:cursor-not-allowed disabled:opacity-40 "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3.75" y="4.75" width="4.75" height="4.75" rx="0.85" />
                  <rect x="3.75" y="14.5" width="4.75" height="4.75" rx="0.85" />
                  <line x1="10.75" y1="6.5" x2="20.25" y2="6.5" />
                  <line x1="10.75" y1="9.25" x2="19.75" y2="9.25" />
                  <line x1="10.75" y1="16.25" x2="20.25" y2="16.25" />
                  <line x1="10.75" y1="19" x2="19.75" y2="19" />
                </svg>
              </button>
            </span>
            <span className="ui-hover-tooltip-trigger inline-flex items-center justify-center outline-none ">
              <button
                type="button"
                aria-label="展开编辑"
                onClick={() => setExpanded(true)}
                className={
                  fullscreenClassName ??
                  "ai-image-prompt-fullscreen-toggle inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--canvas-text-muted)] transition hover:bg-white/[0.58] hover:text-[var(--canvas-text)]"
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden
                  data-slot="icon"
                  className="h-4 w-4 shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                  />
                </svg>
              </button>
            </span>
          </div>
        </div>

        <div className="prompt-materials-section shrink-0">
          <div className="prompt-toolbar-shell-wrap relative">
            <div
              className={cn(
                "prompt-toolbar-shell relative flex w-full shrink-0 items-center justify-start gap-2",
                toolbarZClassName
              )}
            >
              <div className="prompt-toolbar-materials min-w-0 flex-1 overflow-visible">
                <div className="prompt-material-tray w-full min-w-0">
                  <div className="flex w-full min-w-0 items-center gap-1.5">
                    <div className="prompt-reference-slot-content min-w-0 flex-1">
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
                          {slots.map((slot, i) => (
                            <Fragment key={slot.id}>
                              {i > 0 && (
                                <span className="reference-slot-divider mt-2 h-[calc(var(--reference-slot-card-size)-16px)] w-px shrink-0 self-start bg-line max-sm:invisible" aria-hidden="true" />
                              )}
                              <section
                                data-reference-slot-key={slot.id}
                                data-reference-drop-target-id={`slot:${slot.id}`}
                                data-reference-drop-solt-key={slot.id}
                                className="reference-slot-card group/reference-slot relative flex w-[var(--reference-slot-card-size)] shrink-0 flex-col items-center hover:z-[80] cursor-pointer max-sm:w-fit"
                              >
                                <button
                                  type="button"
                                  onClick={() => openFor(slot.id)}
                                  aria-label={`添加${slot.label}`}
                                  className="reference-slot-upload-hitarea absolute inset-0 z-0 disabled:cursor-default rounded-xl"
                                />
                                <div className="reference-slot-card-stage pointer-events-none relative z-[1] h-[var(--reference-slot-card-size)] w-[var(--reference-slot-card-size)] shrink-0">
                                  <div className="reference-slot-trigger absolute inset-0 overflow-hidden border border-line bg-subtle shadow-sm transition-colors group-hover/reference-slot:border-[#999] rounded-xl ">
                                    {(() => {
                                      const cover = mergedSrc[slot.id] ?? slot.src;
                                      return cover ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={cover}
                                        alt=""
                                        draggable={false}
                                        className="reference-slot-cover-image h-full w-full object-cover"
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
                                        aria-hidden
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
                                    {slot.label}
                                  </span>
                                  {slot.optional && (
                                    <span className="reference-slot-optional ml-0.5 text-[#888]">
                                      (可选)
                                    </span>
                                  )}
                                </span>
                              </section>
                            </Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* —— 编辑区 —— */}
      <div className="prompt-editor-shell relative flex flex-1 flex-col overflow-hidden pb-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="prompt-editor-viewport relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden  ">
          {children ?? (
            <div className="markdown-mention-editor-root ui-markdown-mention-editor relative flex min-h-0 flex-1 flex-col prompt-markdown-editor flex min-h-0 flex-1 flex-col">
              <div className="milkdown-editor-container relative flex min-h-0 flex-1 flex-col">
                <div className="milkdown-editor-shell relative flex min-h-0 flex-1 flex-col min-h-[100px] rounded-none border-0 bg-transparent shadow-none cursor-text">
                  {charCount === 0 ? (
                  <div className="pointer-events-none absolute z-[1] text-sm leading-6 text-muted">
                    {placeholder}
                  </div>
                  ) : null}
                  <div className="milkdown-editor-root min-h-0 h-full w-full flex-1 cursor-text overflow-y-auto p-2 text-sm leading-6">
                    <div className="milkdown">
                      <div className="ProseMirror editor" role="textbox" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="markdown-mention-editor-speech min-w-0 shrink-0 contents" />
            </div>
          )}
        </div>

        {/* —— 底部动作条 —— */}
        <div className="prompt-reference-bottom-action flex min-w-0 shrink-0 items-center gap-2 px-3 [&:has([data-speech-active=true])_.prompt-reference-char-count]:hidden [&:has([data-speech-active=true])_.prompt-reference-action]:hidden">
        <span
          className="prompt-reference-char-count shrink-0 whitespace-nowrap text-[10px] tabular-nums text-muted"
          aria-live="polite"
        >
          {charCount} / {maxChars}
        </span>
        <div className="prompt-reference-speech-slot min-h-8 min-w-0 flex-1 max-sm:min-h-11 [@media(pointer:coarse)]:min-h-11">
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
                onClick={() => {
                  setSpeechOn((v) => !v);
                  push({ tone: "neutral", title: speechOn ? "语音输入已停止（演示）" : "正在聆听…（演示）", description: "前端复刻演示，无需后端即可交互。" });
                }}
                data-speech-active={speechOn}
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
        {action && (
          <div className="prompt-reference-action shrink-0">{action}</div>
        )}
        </div>
      </div>
    </div>
    </>
  );
}

/**
 * 原站参考槽（reference-slot-card）—— 供其它页面复用
 */
export function ReferenceSlot({
  label,
  optional,
  src,
  onClick,
}: {
  label: string;
  optional?: boolean;
  src?: string;
  onClick?: () => void;
}) {
  return (
    <section className="reference-slot-card group/reference-slot relative flex w-[var(--reference-slot-card-size)] shrink-0 flex-col items-center hover:z-[80] cursor-pointer max-sm:w-fit">
      <button
        type="button"
        onClick={onClick}
        aria-label={`添加 ${label}`}
        className="reference-slot-upload-hitarea absolute inset-0 z-0 disabled:cursor-default rounded-xl"
      />
      <div className="reference-slot-card-stage pointer-events-none relative z-[1] h-[var(--reference-slot-card-size)] w-[var(--reference-slot-card-size)] shrink-0">
        <div className="reference-slot-trigger absolute inset-0 overflow-hidden rounded-xl border border-line bg-subtle shadow-sm transition-colors group-hover/reference-slot:border-[#999]">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              className="reference-slot-cover-image h-full w-full object-cover"
            />
          ) : null}
          <span className="reference-slot-cover-upload-icon absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#5c5c5c] text-white shadow-sm" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
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
        <span className="reference-slot-title text-[#555]">{label}</span>
        {optional && (
          <span className="reference-slot-optional ml-0.5 text-[#888]">(可选)</span>
        )}
      </span>
    </section>
  );
}

/**
 * 原站 52px 选择器触发器外壳（toolbox-selector-trigger）
 */
export function SelectorTrigger({
  icon,
  label,
  children,
  onClick,
  ariaLabel,
  open,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  open?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      aria-expanded={open ?? false}
      onClick={onClick}
      // 原站 class（实测）：
      //   toolbox-selector-trigger flex h-[52px] w-full cursor-pointer list-none
      //   items-center gap-2 rounded-xl border px-2 py-2 text-left text-[11px]
      //   font-medium text-foreground shadow-none outline-none ring-0 transition
      //   hover:border-line-strong hover:bg-surface/90
      //   data-[open=true]:border-line-strong data-[open=true]:bg-surface/90
      className={cn(
        "toolbox-selector-trigger flex h-[52px] w-full cursor-pointer list-none items-center gap-2 rounded-xl border px-2 py-2 text-left text-[11px] font-medium text-foreground shadow-none outline-none ring-0 transition hover:border-line-strong hover:bg-surface/90 data-[open=true]:border-line-strong data-[open=true]:bg-surface/90"
      )}
    >
      {icon && (
        <span className="toolbox-selector-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted shadow-none">
          {icon}
        </span>
      )}
      <span className="toolbox-selector-text min-w-0 flex-1 text-left">
        <span className="toolbox-selector-label block text-[10px] font-semibold leading-tight text-muted">
          {label}
        </span>
        {children}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden
        className="toolbox-selector-chevron h-3 w-3 shrink-0 text-muted"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m19.5 8.25-7.5 7.5-7.5-7.5"
        />
      </svg>
    </button>
  );
}
