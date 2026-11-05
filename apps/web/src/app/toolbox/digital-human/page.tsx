"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PANEL,
  PANEL_HEADER,
  PreviewPanel,
  QueuePanel,
  SubmitBar,
  ToolHeader,
  ToolboxShell,
} from "@/components/features/BenchWorkspace";
import { AssetPickerModal, type AssetItem } from "@/components/features/AssetPickerModal";
import { useToast } from "@/components/features/ToastHost";
import { cn } from "@/lib/cn";

/**
 * 原站 /toolbox/digital-human（2026-10-30 实测逐字复刻）
 *
 *  .toolbox-editor-panel-root
 *   └─ div.relative.z-[1].flex.flex-col.gap-2
 *      ├─ .toolbox-editor-panel-header  h32  返回 + 数字人 + 新建
 *      ├─ div.relative.flex.flex-1.flex-col.gap-2.5.overflow-hidden.pr-1
 *      │   ├─ div.min-h-0.flex-1.overflow-y-auto
 *      │   │   └─ div.flex.min-h-full.flex-col.gap-3
 *      │   │       ├─ section.flex.shrink-0.flex-col.space-y-2
 *      │   │       │   ├─ h2.shrink-0.text-sm.font-semibold  "1. 上传形象"
 *      │   │       │   └─ div.flex.h-\[18rem\].rounded-2xl.border.p-2.5.shadow-soft
 *      │   │       │       └─ button.flex.h-full.rounded-xl.border-dashed
 *      │   │       │           └─ div.flex.flex-col.items-center.gap-2
 *      │   │       │               ├─ svg 28×28
 *      │   │       │               ├─ span.text-sm.font-semibold 形象素材
 *      │   │       │               └─ span.text-xs.text-muted 可选择图片或视频
 *      │   │       └─ div.shrink-0
 *      │   │           └─ section.space-y-3.rounded-2xl.border.p-3.shadow-sm
 *      │   │               ├─ h2.text-sm.font-semibold  "2. 音频输入"
 *      │   │               └─ div.grid.gap-2 > div.grid.grid-cols-3.gap-2
 *      │   │                   └─ 3 × button 132×48
 *      │   └─ section.shrink-0.rounded-xl.border.p-3  [aria-label=操作指引] 4 步
 *      └─ div.relative.z-\[1\].shrink-0.space-y-1.5.pt-1  ← 提交条
 */

const AUDIO_MODES = [
  { label: "生成音频", icon: "sparkles" },
  { label: "直接录音", icon: "mic" },
  { label: "上传音频", icon: "upload" },
] as const;

const GUIDE: {
  title: string;
  description: string;
  icon: "person" | "mic" | "check" | "sparkles";
}[] = [
  {
    title: "上传形象",
    description: "选择人物图片做口播，或选择视频进入改口型模式。",
    icon: "person",
  },
  {
    title: "准备音频",
    description:
      "可生成音频、直接录音，也可上传已有 MP3 / WAV；图片口播音频需小于 60 秒。",
    icon: "mic",
  },
  {
    title: "确认素材",
    description: "检查形象和音频都已选中，再查看预计积分。",
    icon: "check",
  },
  {
    title: "开始生成",
    description: "提交后在右侧队列查看进度，完成后中间区域预览成片。",
    icon: "sparkles",
  },
];

export default function DigitalHumanPage() {
  const { push } = useToast();
  const router = useRouter();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [audio, setAudio] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const [tab, setTab] = useState("preview");
  const [busy, setBusy] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [audioPickerOpen, setAudioPickerOpen] = useState(false);

  const ready = !!avatar && !!audio;

  const gen = () => {
    if (!ready) {
      push({ tone: "warning", title: "请先确认形象与音频" });
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      push({
        tone: "success",
        title: "已提交数字人任务",
        description: "在右侧队列查看进度",
      });
    }, 1600);
  };

  return (
    <>
    <ToolboxShell
      editor={
        <div className={PANEL}>
          <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            {/* —— 面板头 —— */}
            <div className={PANEL_HEADER}>
              <ToolHeader
                title="数字人"
                onBack={() => router.back()}
                onNew={() => {
                  setAvatar(null);
                  setAudio(null);
                  setScript("");
                }}
              />
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden pr-1 max-lg:min-h-[34rem]">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-h-full flex-col gap-3">
                  {/* —— 1. 上传形象 —— */}
                  <section className="flex shrink-0 flex-col space-y-2">
                    <h2 className="shrink-0 text-sm font-semibold text-foreground">
                      1. 上传形象
                    </h2>
                    <div className="flex h-[18rem] min-h-0 min-w-0 flex-col rounded-2xl border border-line p-2.5 shadow-soft sm:h-[20rem]">
                        <button
                          type="button"
                          onClick={() => setAvatarPickerOpen(true)}
                          className="flex h-full w-full min-w-0 items-center justify-center rounded-xl border border-dashed   text-left transition  "
                        >
                          <div className="flex flex-col items-center gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              aria-hidden
                              data-slot="icon"
                              className="h-7 w-7 text-accent-deep"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                              />
                            </svg>
                          <span className="text-sm font-semibold text-foreground">
                            {avatar ?? "形象素材"}
                          </span>
                          <span className="text-xs text-muted">
                            可选择图片或视频
                          </span>
                        </div>
                      </button>
                    </div>
                  </section>

                  {/* —— 2. 音频输入 —— */}
                  <div className="shrink-0">
                    <section className="space-y-3 rounded-2xl border border-line p-3 shadow-sm">
                      <h2 className="text-sm font-semibold text-foreground">
                        2. 音频输入
                      </h2>
                      <div className="grid gap-2">
                        <div className="grid grid-cols-3 gap-2">
                          {AUDIO_MODES.map((m) => (
                            <button
                              key={m.label}
                              type="button"
                              onClick={() => {
                                if (m.label === "上传音频") {
                                  setAudioPickerOpen(true);
                                  return;
                                }
                                setAudio(m.label);
                              }}
                              aria-pressed={audio === m.label}
                              className={cn(
                                audio === m.label
                                  ? "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-semibold transition   text-muted  hover:bg-surface/90 hover:text-foreground  border-accent bg-bg-action text-fg"
                                  : "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-semibold transition   text-muted  hover:bg-surface/90 hover:text-foreground "
                              )}
                            >
                              <AudioIcon name={m.icon} />
                              <span>{m.label}</span>
                            </button>
                          ))}
                        </div>
                        {audio === "生成音频" && (
                          <textarea
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                            rows={3}
                            placeholder="输入要生成的口播文案"
                            className="w-full resize-none rounded-lg border border-line bg-surface p-2 text-xs outline-none"
                          />
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              {/* —— 操作指引 —— */}
              <section
                aria-label="操作指引"
                className="shrink-0 rounded-xl border p-2.5 sm:p-3"
              >
                <h3 className="text-xs font-semibold text-foreground">
                  操作指引
                </h3>
                <ol className="mt-2 space-y-2">
                  {GUIDE.map((s, i) => (
                    <li key={s.title} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg  text-[11px] font-bold text-accent-deep">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                          <GuideIcon name={s.icon} />
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

            <div className="relative z-[1] shrink-0 space-y-1.5 pt-1">
              <SubmitBar
                label="开始生成"
                credits={ready ? 80 : null}
                disabled={!ready}
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
              key: "preview",
              label: "预览",
              panel: (
                <div className="toolbox-preview-panel-pane min-h-0 flex-1 flex h-full min-h-0 flex-col justify-center overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                      选择右侧队列或历史中的数字人成片后，会在这里播放预览。
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: "history",
              label: "历史",
              panel: (
                <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border-0 px-4 py-10 text-center shadow-soft">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="relative z-[1] h-14 w-14 shrink-0 text-subtle opacity-[0.55]"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                    />
                  </svg>
                  <p className="relative z-[1] mt-3 max-w-sm text-xs leading-relaxed text-muted">
                    还没有可展示的历史视频。生成完成后，成片会出现在这里。
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
    <AssetPickerModal
      open={avatarPickerOpen}
      kind="media"
      title="选择形象参考"
      subtitle="参考素材会保存至资产库，处理期间始终可见。"
      maxSelect={1}
      onClose={() => setAvatarPickerOpen(false)}
      onConfirm={(assets: AssetItem[]) => {
        if (assets[0]) setAvatar(assets[0].name);
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
        if (assets[0]) setAudio(assets[0].name);
      }}
    />
    </>
  );
}

function GuideIcon({ name }: { name: "person" | "mic" | "check" | "sparkles" }) {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.5,
    stroke: "currentColor",
    "aria-hidden": true,
    "data-slot": "icon",
    className: "h-3.5 w-3.5 shrink-0 text-accent-deep",
  } as const;

  if (name === "person") {
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
        />
      </svg>
    );
  }
  if (name === "mic") {
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
        />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
      />
    </svg>
  );
}

function AudioIcon({ name }: { name: "sparkles" | "mic" | "upload" }) {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.6,
    stroke: "currentColor",
    "aria-hidden": true,
    className: "h-4 w-4 shrink-0",
  } as const;
  if (name === "mic") {
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3.5a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-5 0V6A2.5 2.5 0 0 1 12 3.5Zm-6 8.5a6 6 0 0 0 12 0M12 18v3"
        />
      </svg>
    );
  }
  if (name === "upload") {
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16"
        />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"
      />
    </svg>
  );
}
