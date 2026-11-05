"use client";

import { useRef, useState } from "react";
import { WorkspaceShell } from "@/components/features/WorkspaceShell";
import { useToast } from "@/components/features/ToastHost";
import { Button, Textarea } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/surfaces";
import { Send, Square, RotateCcw, Plus, Paperclip, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const AGENT_PINNED = {
  id: "agent-pinned",
  title: "Agent",
  sections: [],
  variant: "agent" as const,
};

interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const PRESETS = ["写一条探店口播文案", "把这款面膜卖点转成 30s 脚本", "生成 3 条同城引流标题", "分析这条爆款为什么火"];
const SKILLS = ["智能编导", "视频生成", "图片生成", "字幕擦除", "画质增强", "厂家介绍视频"];

export default function AgentCloudPage() {
  const { push } = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [skill, setSkill] = useState<string | null>(null);
  const [skillOpen, setSkillOpen] = useState(false);
  const [model, setModel] = useState("Seedance 2.0");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const send = (text?: string) => {
    const v = (text ?? input).trim();
    if (!v || streaming) return;
    const um: Msg = { id: `u_${Date.now()}`, role: "user", text: v };
    setMsgs((p) => [...p, um]);
    setInput("");
    setStreaming(true);
    const full = `收到：${v}\n\n这是 Agent 演示回复（mock 流式输出）。${skill ? `已挂载技能「${skill}」` : "未挂载技能"} · 模型 ${model}。\n\n下一步可：1）追问细节 2）换技能重跑 3）转到对应工具页精调。`;
    const am: Msg = { id: `a_${Date.now()}`, role: "assistant", text: "" };
    setMsgs((p) => [...p, am]);
    let i = 0;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      i += 6;
      const slice = full.slice(0, i);
      setMsgs((p) => p.map((m) => (m.id === am.id ? { ...m, text: slice } : m)));
      if (i >= full.length) {
        if (timer.current) clearInterval(timer.current);
        setStreaming(false);
      }
    }, 40);
  };

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    setStreaming(false);
    push({ tone: "neutral", title: "已停止生成" });
  };

  const regenerate = () => {
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    if (!lastUser) {
      push({ tone: "warning", title: "还没有提问", description: "先输入一句话试试" });
      return;
    }
    setMsgs((p) => p.filter((m) => !(m.role === "assistant" && m.id === p[p.length - 1]?.id)));
    send(lastUser.text);
  };

  const newChat = () => {
    if (timer.current) clearInterval(timer.current);
    setStreaming(false);
    setMsgs([]);
    setInput("");
    push({ tone: "neutral", title: "已新建对话（演示）" });
  };

  return (
    <WorkspaceShell pinned={AGENT_PINNED}>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* 顶栏 */}
        <div className="flex shrink-0 items-center gap-2 border-b border-line bg-background px-4 py-2.5 sm:px-6">
          <Button variant="secondary" size="sm" onClick={newChat}><Plus className="size-3.5" aria-hidden />新任务</Button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSkillOpen((v) => !v)}
              aria-expanded={skillOpen}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-medium hover:border-line-strong"
            >
              <Sparkles className="size-3.5 text-accent" aria-hidden />
              {skill ?? "挂载技能"}
              <ChevronDown className="size-3 text-subtle" aria-hidden />
            </button>
            {skillOpen ? (
              <div className="absolute left-0 top-9 z-50 w-52 rounded-xl border border-line bg-surface p-1.5 shadow-xl">
                <button type="button" onClick={() => { setSkill(null); setSkillOpen(false); }} className="flex h-8 w-full items-center rounded-lg px-2 text-xs hover:bg-surface-2">不挂载</button>
                {SKILLS.map((s) => (
                  <button key={s} type="button" onClick={() => { setSkill(s); setSkillOpen(false); push({ tone: "success", title: `已挂载 ${s}` }); }} className={cn("flex h-8 w-full items-center justify-between rounded-lg px-2 text-xs hover:bg-surface-2", skill === s && "bg-accent-soft/40")}>
                    {s}{skill === s ? <span className="text-accent">✓</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <select value={model} onChange={(e) => setModel(e.target.value)} aria-label="模型选择" className="h-8 rounded-lg border border-line bg-surface px-2 text-xs">
            <option>Seedance 2.0</option>
            <option>Doubao Seed 2.0 Lite</option>
            <option>GLM 5.3 Flash</option>
          </select>
          <span className="ml-auto flex items-center gap-2">
            {skill ? <Badge tone="accent">{skill}</Badge> : <Badge tone="neutral">通用对话</Badge>}
            {msgs.length > 0 ? <Button variant="ghost" size="sm" onClick={regenerate} disabled={streaming}><RotateCcw className="size-3.5" aria-hidden />重跑</Button> : null}
          </span>
        </div>

        {/* 消息区 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {msgs.length === 0 ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
              <p className="text-lg font-semibold">我是你的 AI 创作助手</p>
              <p className="mt-1.5 text-xs text-muted">挂载技能后可直接调用工具链 · 所有输出均为前端演示，无需后端</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {PRESETS.map((p) => (
                  <button key={p} type="button" onClick={() => send(p)} className="rounded-full border border-line bg-surface px-3.5 py-2 text-xs hover:border-accent hover:text-accent-deep">{p}</button>
                ))}
              </div>
            </div>
          ) : (
            <ol className="mx-auto flex max-w-2xl flex-col gap-4">
              {msgs.map((m) => (
                <li key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed", m.role === "user" ? "bg-accent text-on-accent" : "border border-line bg-surface")}>
                    {m.text || <span className="text-muted">生成中…</span>}
                  </div>
                </li>
              ))}
              {streaming ? <li className="text-[11px] text-subtle">流式输出中…可随时停止</li> : null}
            </ol>
          )}
        </div>

        {/* 输入区 */}
        <div className="shrink-0 border-t border-line bg-background px-4 pb-4 pt-3 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl border border-line bg-surface p-2 shadow-sm focus-within:border-accent">
              <Textarea rows={2} value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入任务，按 Enter 发送，Shift+Enter 换行" aria-label="Agent 输入"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} className="border-0 bg-transparent !ring-0" />
              <div className="flex items-center gap-1.5 px-1 pb-0.5">
                <button type="button" aria-label="添加附件" onClick={() => push({ tone: "neutral", title: "附件（演示）", description: "图片 / 视频 / 音频均可作为参考" })} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"><Paperclip className="size-4" aria-hidden /></button>
                <span className="text-[11px] text-subtle">{input.length} 字 · 回车发送</span>
                <span className="flex-1" />
                {streaming ? (
                  <Button size="sm" variant="secondary" onClick={stop}><Square className="size-3.5" aria-hidden />停止</Button>
                ) : (
                  <Button size="sm" onClick={() => send()} disabled={!input.trim()}><Send className="size-3.5" aria-hidden />发送</Button>
                )}
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-subtle">TODO(API): 接入 POST /agent/chat（SSE 流式）与 GET /agent/skills 技能挂载。</p>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
