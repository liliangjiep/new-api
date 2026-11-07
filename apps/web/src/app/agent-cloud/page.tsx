"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { WorkspaceShell } from "@/components/features/WorkspaceShell";
import { useToast } from "@/components/features/ToastHost";
import { Button, Textarea } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/surfaces";
import { Send, Square, RotateCcw, Plus, Paperclip, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { chatStream, listSessions, listSkills, listMessages, type AgentSession, type AgentSkill } from "@/lib/backend/agent";
import { ApiError } from "@/lib/api";

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
/** 行内注释1：技能列表来自后端 GET /agent/skills —— 未加载前先用这份兜底名。 */
const FALLBACK_SKILLS = ["智能编导", "视频生成", "图片生成", "字幕擦除", "画质增强", "厂家介绍视频"];

export default function AgentCloudPage() {
  const { push } = useToast();
  const searchParams = useSearchParams();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [skill, setSkill] = useState<string | null>(null);
  const [skillOpen, setSkillOpen] = useState(false);
  const [model, setModel] = useState("Seedance 2.0");
  /** 行内注释2：会话 ID —— 后端 SSE 的 meta 事件会回传，之后的对话都挂在同一个会话上。 */
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [skills, setSkills] = useState<string[]>(FALLBACK_SKILLS);
  const abortRef = useRef<AbortController | null>(null);

  /**
   * 行内注释3：加载历史会话与技能 —— 刷新页面不丢对话记录。
   */
  useEffect(() => {
    void (async () => {
      try {
        const [ss, sk] = await Promise.all([listSessions(), listSkills()]);
        setSessions(ss ?? []);
        if (sk && sk.length > 0) {
          setSkills(sk.map((s) => s.label ?? s.id).filter(Boolean));
        }
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "加载失败";
        push({ tone: "warning", title: "加载失败", description: msg });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 行内注释3.1：从 URL 带 session=xxx 进来时（侧栏点「最近」跳转），载入该会话的历史消息。
   *             此前切会话只清空消息区，历史消息接口 GET /agent/sessions/{id}/messages 从未被调用。
   */
  const loadSessionMessages = useCallback(async (sid: string) => {
    try {
      const list = await listMessages(sid);
      setMsgs(
        (list ?? []).map((m, i) => ({
          id: `h_${sid}_${i}`,
          role: m.role === "user" ? "user" : "assistant",
          text: m.content,
        })),
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "加载历史消息失败";
      push({ tone: "warning", title: "加载历史消息失败", description: msg });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sid = searchParams.get("session");
    if (!sid) return;
    setSessionId(sid);
    void loadSessionMessages(sid);
  }, [searchParams, loadSessionMessages]);

  const send = useCallback(
    async (text?: string) => {
      const v = (text ?? input).trim();
      if (!v || streaming) return;
      const um: Msg = { id: `u_${Date.now()}`, role: "user", text: v };
      const am: Msg = { id: `a_${Date.now()}`, role: "assistant", text: "" };
      setMsgs((p) => [...p, um, am]);
      setInput("");
      setStreaming(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        // 行内注释4：真 SSE —— 后端逐段推 token，前端逐段追加。
        await chatStream(
          { session_id: sessionId ?? "", message: v, skill: skill ?? "", model },
          {
            signal: ctrl.signal,
            onToken: (chunk) => {
              setMsgs((p) => p.map((m) => (m.id === am.id ? { ...m, text: m.text + chunk } : m)));
            },
            onMeta: (sid) => {
              setSessionId(sid);
              // 行内注释4.1：会话建好后刷新侧栏列表。
              void listSessions().then(setSessions).catch(() => undefined);
            },
          },
        );
        // 行内注释4.2：没有收到任何内容 → 明确提示，不要留一条空白消息。
        setMsgs((p) => {
          const cur = p.find((m) => m.id === am.id);
          if (cur && !cur.text.trim()) {
            return p.map((m) => (m.id === am.id ? { ...m, text: "（后端未返回内容）" } : m));
          }
          return p;
        });
      } catch (e) {
        if (!ctrl.signal.aborted) {
          const msg = e instanceof ApiError ? e.message : (e as Error)?.message ?? "对话失败";
          push({ tone: "danger", title: "对话失败", description: msg });
          setMsgs((p) => p.filter((m) => m.id !== am.id));
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [input, streaming, sessionId, skill, model, push],
  );

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    push({ tone: "neutral", title: "已停止生成" });
  };

  const regenerate = () => {
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    if (!lastUser) {
      push({ tone: "warning", title: "还没有提问", description: "先输入一句话试试" });
      return;
    }
    setMsgs((p) => {
      const last = p[p.length - 1];
      if (last && last.role === "assistant") {
        return p.slice(0, -1);
      }
      return p;
    });
    void send(lastUser.text);
  };

  const newChat = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setMsgs([]);
    setSessionId(null);
    setInput("");
    push({ tone: "neutral", title: "已新建对话" });
  };

  const openSession = (s: AgentSession) => {
    abortRef.current?.abort();
    setStreaming(false);
    setSessionId(s.id);
    // 行内注释4.3：切会话要载入历史消息 —— 之前只清空了消息区，用户看不到之前聊的内容。
    void loadSessionMessages(s.id);
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
                {skills.map((s) => (
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
          {sessions.length > 0 ? (
            <select
              value={sessionId ?? ""}
              onChange={(e) => {
                const sid = e.target.value;
                if (!sid) {
                  setSessionId(null);
                  setMsgs([]);
                } else {
                  const s = sessions.find((x) => x.id === sid);
                  if (s) openSession(s);
                }
              }}
              aria-label="历史会话"
              className="h-8 max-w-[160px] rounded-lg border border-line bg-surface px-2 text-xs"
            >
              <option value="">当前新对话</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          ) : null}
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
              <p className="mt-1.5 text-xs text-muted">挂载技能后可直接调用工具链 · 对话走后端 SSE 流式接口</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {PRESETS.map((p) => (
                  <button key={p} type="button" onClick={() => void send(p)} className="rounded-full border border-line bg-surface px-3.5 py-2 text-xs hover:border-accent hover:text-accent-deep">{p}</button>
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
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} className="border-0 bg-transparent !ring-0" />
              <div className="flex items-center gap-1.5 px-1 pb-0.5">
                <button type="button" aria-label="添加附件" onClick={() => push({ tone: "neutral", title: "附件", description: "请到对应工具页上传素材后引用" })} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"><Paperclip className="size-4" aria-hidden /></button>
                <span className="text-[11px] text-subtle">{input.length} 字 · 回车发送</span>
                <span className="flex-1" />
                {streaming ? (
                  <Button size="sm" variant="secondary" onClick={stop}><Square className="size-3.5" aria-hidden />停止</Button>
                ) : (
                  <Button size="sm" onClick={() => void send()} disabled={!input.trim()}><Send className="size-3.5" aria-hidden />发送</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
