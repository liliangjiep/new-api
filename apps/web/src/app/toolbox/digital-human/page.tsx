"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PANEL,
  PANEL_BODY,
  PANEL_CONTENT,
  PANEL_HEADER,
  PreviewPanel,
  QueuePanel,
  SubmitBar,
  ToolHeader,
  ToolboxShell,
} from "@/components/features/BenchWorkspace";
import { useToast } from "@/components/features/ToastHost";
import { cn } from "@/lib/cn";

/* 原站 /toolbox/digital-human（实测）：
 *  面板头：返回 + 新建
 *  1. 上传形象：readonly textbox（形象名）+ 「形象素材 可选择图片或视频」按钮
 *  2. 音频输入：生成音频 / 直接录音 / 上传音频 三个切换
 *  操作指引：4 步编号
 *  提交：开始生成 预计 -- 积分
 *  中栏 Tabs：预览 / 历史
 */
const AUDIO_MODES = ["生成音频", "直接录音", "上传音频"];

export default function DigitalHumanPage() {
  const { push } = useToast();
  const router = useRouter();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [audio, setAudio] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const [tab, setTab] = useState("preview");
  const [busy, setBusy] = useState(false);

  const ready = !!avatar && !!audio;

  const gen = () => {
    if (!ready) {
      push({ tone: "warning", title: "请先确认形象与音频" });
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      push({ tone: "success", title: "已提交数字人任务", description: "在右侧队列查看进度" });
    }, 1600);
  };

  return (
    <ToolboxShell
      editor={
        <div className={PANEL}>
          <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col gap-2">
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

            <div className={`${PANEL_BODY} flex flex-col gap-4`}>
              {/* —— 1. 上传形象 —— */}
              <section className="shrink-0">
                <h2 className="mb-2 text-sm font-medium">1. 上传形象</h2>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={avatar ?? ""}
                    placeholder="形象素材"
                    aria-label="形象素材"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAvatar(avatar ? null : "形象素材.png")}
                    className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 text-xs"
                  >
                    形象素材 可选择图片或视频
                  </button>
                </div>
              </section>

              {/* —— 2. 音频输入 —— */}
              <section className="shrink-0">
                <h2 className="mb-2 text-sm font-medium">2. 音频输入</h2>
                <div className="flex gap-2">
                  {AUDIO_MODES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAudio(t)}
                      aria-pressed={audio === t}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-1.5 text-xs transition-colors",
                        audio === t
                          ? "border-accent/60 bg-accent-soft/10"
                          : "border-line hover:border-line-strong"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {audio === "生成音频" && (
                  <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    rows={3}
                    placeholder="输入要生成的口播文案"
                    className="mt-2 w-full resize-none rounded-lg border border-line bg-surface-2 p-2 text-xs outline-none"
                  />
                )}
              </section>

              {/* —— 操作指引 —— */}
              <section aria-label="操作指引" className="shrink-0 rounded-xl border border-line bg-surface-2 p-3">
                <h3 className="text-xs font-medium text-foreground">操作指引</h3>
                <ol className="mt-1 list-decimal space-y-1 pl-4 text-[11px] text-muted">
                  <li>
                    <span className="font-medium text-fg">上传形象</span>
                    <span className="ml-1">选择人物图片做口播，或选择视频进入改口型模式。</span>
                  </li>
                  <li>
                    <span className="font-medium text-fg">准备音频</span>
                    <span className="ml-1">
                      可生成音频、直接录音，也可上传已有 MP3 / WAV；图片口播音频需小于 60 秒。
                    </span>
                  </li>
                  <li>
                    <span className="font-medium text-fg">确认素材</span>
                    <span className="ml-1">检查形象和音频都已选中，再查看预计积分。</span>
                  </li>
                  <li>
                    <span className="font-medium text-fg">开始生成</span>
                    <span className="ml-1">
                      提交后在右侧队列查看进度，完成后中间区域预览成片。
                    </span>
                  </li>
                </ol>
              </section>
            </div>

            <div className="sticky bottom-0 z-[2] shrink-0">
              <SubmitBar
                label="开始生成"
                credits={ready ? 80 : null}
                disabled={!ready}
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
                <div className="flex h-full min-h-0 flex-col items-center justify-center p-6 text-center text-xs text-muted">
                  <div>
                    <p>选择右侧队列或历史中的数字人成片后，会在这里播放预览。</p>
                    <p className="mt-1">还没有可展示的历史视频。生成完成后，成片会出现在这里。</p>
                  </div>
                </div>
              ),
            },
            {
              key: "history",
              label: "历史",
              panel: (
                <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted">
                  暂无历史成片。
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
          <ul className="space-y-2">
            <li className="rounded-lg border border-dashed border-line bg-surface-2 p-3 text-xs text-muted">
              还没有任务。生成完成后，成片会出现在这里。
            </li>
          </ul>
        </QueuePanel>
      }
    />
  );
}
