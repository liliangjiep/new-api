"use client";
import { useState } from "react";
import {
  PANEL,
  PANEL_BODY,
  PANEL_CONTENT,
  PANEL_HEADER,
  PreviewPanel,
  QueuePanel,
  ToolboxShell,
} from "@/components/features/BenchWorkspace";

/* 原站 /agent-cloud：左 导航列表(最近) / 中 对话区 / 右 最近任务 */
export default function AgentCloudPage() {
  const [tab, setTab] = useState("recent");
  const [q, setQ] = useState("");

  return (
    <ToolboxShell
      editor={
        <div className={PANEL}>
          <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            <div className={PANEL_HEADER}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">Agent</span>
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold !text-accent"
                  aria-label="新任务"
                >
                  新任务
                </button>
              </div>
            </div>
            <div className={`${PANEL_CONTENT} gap-2`}>
              <textarea
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="说说今天想做什么…"
                className="min-h-[140px] w-full flex-1 resize-none rounded-xl border border-line bg-background p-3 text-sm outline-none placeholder:text-fg-subtle"
              />
              <div className="flex items-center gap-2">
                <button type="button" className="text-[11px] text-muted">
                  语音输入
                </button>
                <button
                  type="button"
                  disabled={!q.trim()}
                  className="ml-auto rounded-full bg-fg px-4 py-1.5 text-xs font-medium text-bg disabled:opacity-40"
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      }
      preview={
        <PreviewPanel
          tabs={[
            {
              key: "chat",
              label: "对话",
              panel: (
                <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted">
                  新建任务开始多步创作，历史对话会出现在左侧。
                </div>
              ),
            },
          ]}
          activeTab="chat"
          onTabChange={() => undefined}
        />
      }
      queue={
        <QueuePanel>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setTab("recent")}
              aria-expanded={tab === "recent"}
              className="w-full rounded-lg bg-surface-2 px-2.5 py-2 text-left text-[13px]"
            >
              最近
            </button>
            <p className="rounded-lg border border-dashed border-line p-3 text-xs text-muted">暂无历史对话</p>
          </div>
        </QueuePanel>
      }
    />
  );
}
