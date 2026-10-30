"use client";

import { useEffect, useRef, useState } from "react";
import { StudioShell } from "@/components/layout/StudioShell";
import { Button, Input, Textarea } from "@/components/ui/primitives";
import { Card, CardBody, Badge, EmptyState, Tabs } from "@/components/ui/surfaces";
import { Modal } from "@/components/ui/overlays";
import { useToast } from "@/components/features/ToastHost";
import { cn } from "@/lib/cn";
import {
  MessagesSquare,
  Send,
  Paperclip,
  Plus,
  Sparkles,
  Wrench,
  Square,
  X,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  attachments?: string[];
}

interface Conversation {
  id: string;
  title: string;
  time: string;
  messages: Message[];
}

const AGENT_SKILLS = [
  { id: "s1", label: "商品图批量优化", desc: "对上传的 N 张图统一调色与裁切" },
  { id: "s2", label: "短视频脚本", desc: "按卖点生成带分镜的脚本" },
  { id: "s3", label: "文案润色", desc: "改写与精简中文营销文案" },
  { id: "s4", label: "翻译", desc: "中英互译，保留术语" },
];

// 行内注释1：会话各自存 messages —— 切换会话即切换 messages，互不串台
// 行内注释2：流式用 setInterval 逐字追加，stop 用 ref 存 timer，点停止即清掉
// 行内注释3：附件为前端 mock 文件名，真正上传联调后走 /media 直传
// 行内注释4：新建会话走 Modal 输入标题，创建后自动切过去
// 行内注释5：联调后替换为 SSE：POST /agent/conversations/{id}/messages
const seedMessages = (hint: string): Message[] => [
  { id: `m_init_${hint}`, role: "assistant", content: "你好，我是 xin.ai 助手。可以挂载技能后开始，也可以直接对话。" },
];

const INITIAL: Conversation[] = [
  { id: "c1", title: "商品图批量优化", time: "09:24", messages: seedMessages("c1") },
  {
    id: "c2",
    title: "短视频脚本生成",
    time: "昨天",
    messages: [
      ...seedMessages("c2"),
      { id: "c2_u1", role: "user", content: "帮我写一条 30 秒探厂口播脚本" },
      { id: "c2_a1", role: "assistant", content: "已按「到店实录」结构生成：开场钩子 3s → 展厅动线 15s → 工艺背书 8s → 行动召唤 4s。需要我展开成分镜吗？" },
    ],
  },
  {
    id: "c3",
    title: "竞品拆解",
    time: "10-28",
    messages: [
      ...seedMessages("c3"),
      { id: "c3_u1", role: "user", content: "拆一下这条爆款的结构" },
      { id: "c3_a1", role: "assistant", content: "结构：痛点前置（0-3s）→ 方案展示（3-18s）→ 信任背书（18-25s）。建议复用「痛点解决」技能包重拍一条。" },
    ],
  },
];

export default function AgentChatPage() {
  const { push } = useToast();
  const [convs, setConvs] = useState<Conversation[]>(INITIAL);
  const [activeId, setActiveId] = useState("c1");
  const [input, setInput] = useState("");
  const [mounted, setMounted] = useState<string[]>(["s1"]);
  const [streaming, setStreaming] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);
  const [mobileTab, setMobileTab] = useState("chat");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = convs.find((c) => c.id === activeId) ?? convs[0];
  const messages = active.messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeId]);

  // 行内注释6：组件卸载时清掉流式定时器，防止 setState 泄漏
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const patchMessages = (id: string, fn: (m: Message[]) => Message[]) =>
    setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, messages: fn(c.messages) } : c)));

  const send = () => {
    const text = input.trim();
    if ((!text && pendingFiles.length === 0) || streaming) return;
    const atts = [...pendingFiles];
    setInput("");
    setPendingFiles([]);
    const userMsg: Message = {
      id: `u${Date.now()}`,
      role: "user",
      content: text || "（仅发送附件）",
      attachments: atts.length > 0 ? atts : undefined,
    };
    patchMessages(active.id, (m) => [...m, userMsg]);
    setStreaming(true);

    // TODO(API): 替换为 SSE 流式连接 POST /agent/conversations/{id}/messages
    const skillHint =
      mounted.length > 0
        ? `命中「${AGENT_SKILLS.filter((s) => mounted.includes(s.id)).map((s) => s.label).join("、")}」技能，`
        : "";
    const reply =
      `已收到${atts.length > 0 ? `（含 ${atts.length} 个附件：${atts.join("、")}）` : ""}。我会先解析你的需求，` +
      skillHint +
      "然后按能力路由表选择可用模型并给出报价。";
    let i = 0;
    timerRef.current = setInterval(() => {
      i += 4;
      const chunk = reply.slice(0, i);
      patchMessages(active.id, (m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last?.role === "assistant" && last.streaming) {
          next[next.length - 1] = { ...last, content: chunk, streaming: true };
        } else {
          next.push({ id: `a${Date.now()}`, role: "assistant", content: chunk, streaming: true });
        }
        return next;
      });
      if (i >= reply.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setStreaming(false);
        patchMessages(active.id, (m) => m.map((x) => (x.streaming ? { ...x, streaming: false } : x)));
      }
    }, 22);
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setStreaming(false);
    patchMessages(active.id, (m) =>
      m.map((x) =>
        x.streaming ? { ...x, streaming: false, content: x.content + "（已停止）" } : x
      )
    );
    push({ tone: "neutral", title: "已停止生成" });
  };

  const createConv = () => {
    const title = newTitle.trim() || `新会话 ${convs.length + 1}`;
    const id = `c${Date.now()}`;
    setConvs((p) => [{ id, title, time: "刚刚", messages: seedMessages(id) }, ...p]);
    setActiveId(id);
    setNewTitle("");
    setNewOpen(false);
    push({ tone: "success", title: "会话已创建", description: title });
  };

  const switchConv = (id: string) => {
    if (streaming) stop();
    setActiveId(id);
    setMobileTab("chat");
  };

  const toggleSkill = (id: string) =>
    setMounted((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...id]));

  const pickFiles = (list: FileList | null) => {
    if (!list) return;
    const names = Array.from(list).slice(0, 5).map((f) => f.name);
    setPendingFiles((p) => [...p, ...names].slice(0, 5));
    push({ tone: "neutral", title: `已附加 ${names.length} 个文件`, description: "前端 mock：联调后走对象存储直传" });
  };

  const convList = (
    <Card className="hidden lg:block">
      <div className="border-b border-line px-3 py-2">
        <p className="text-sm font-medium text-fg">会话（{convs.length}）</p>
      </div>
      <CardBody className="space-y-1 p-2">
        {convs.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => switchConv(c.id)}
            aria-current={c.id === activeId}
            className={cn(
              "w-full rounded-xs px-2.5 py-2 text-left transition-colors",
              c.id === activeId ? "bg-surface-3" : "hover:bg-surface-2"
            )}
          >
            <span className="block truncate text-sm text-fg">{c.title}</span>
            <span className="tabular mt-0.5 block text-[11px] text-fg-subtle">
              {c.time} · {c.messages.length} 条
            </span>
          </button>
        ))}
      </CardBody>
    </Card>
  );

  const chatPanel = (
    <Card className="flex min-h-[560px] flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <p className="flex items-center gap-2 text-sm text-fg">
          <MessagesSquare className="size-4 text-accent" aria-hidden />
          {active.title}
        </p>
        {mounted.length > 0 && <Badge tone="accent">{mounted.length} 个技能已挂载</Badge>}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-md px-3.5 py-2.5 text-sm leading-relaxed",
                m.role === "user" ? "bg-accent text-accent-fg" : "border border-line bg-surface-2 text-fg"
              )}
            >
              {m.attachments && m.attachments.length > 0 && (
                <span className="mb-1.5 flex flex-wrap gap-1">
                  {m.attachments.map((a) => (
                    <Badge key={a} tone="neutral">
                      <Paperclip className="size-2.5" aria-hidden />
                      {a}
                    </Badge>
                  ))}
                </span>
              )}
              {m.content}
              {m.streaming && (
                <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-current align-middle" aria-hidden />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-line px-3 pt-2">
          {pendingFiles.map((f) => (
            <span key={f} className="flex items-center gap-1 rounded-xs border border-line bg-surface-2 px-2 py-1 text-[11px] text-fg-muted">
              <Paperclip className="size-3" aria-hidden />
              {f}
              <button
                type="button"
                aria-label={`移除${f}`}
                onClick={() => setPendingFiles((p) => p.filter((x) => x !== f))}
                className="text-fg-subtle hover:text-danger"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="border-t border-line p-3">
        <div className="rounded-md border border-line bg-surface-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/40">
          <Textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="输入内容，Ctrl+Enter 发送"
            aria-label="消息输入"
            className="border-0 bg-transparent focus:ring-0"
          />
          <div className="flex items-center gap-1 px-2 pb-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => pickFiles(e.target.files)}
            />
            <Button variant="ghost" size="icon-sm" aria-label="附加文件" onClick={() => fileRef.current?.click()}>
              <Paperclip className="size-3.5" />
            </Button>
            <span className="tabular text-[11px] text-fg-subtle">{input.length} 字</span>
            <div className="ml-auto flex items-center gap-1">
              {streaming && (
                <Button variant="ghost" size="icon-sm" aria-label="停止生成" onClick={stop}>
                  <Square className="size-3" />
                </Button>
              )}
              <Button size="sm" onClick={send} disabled={(!input.trim() && pendingFiles.length === 0) || streaming}>
                <Send className="size-3.5" aria-hidden />
                发送
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  const skillPanel = (
    <Card className="hidden lg:block">
      <div className="border-b border-line px-3 py-2">
        <p className="text-sm font-medium text-fg">可挂载技能</p>
      </div>
      <CardBody className="space-y-2">
        {AGENT_SKILLS.map((s) => {
          const on = mounted.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleSkill(s.id)}
              aria-pressed={on}
              className={cn(
                "w-full rounded-sm border px-2.5 py-2 text-left transition-colors",
                on ? "border-accent bg-accent-soft/30" : "border-line bg-surface-2 hover:border-line-strong"
              )}
            >
              <span className="flex items-center gap-1.5">
                <Wrench className={cn("size-3 shrink-0", on ? "text-accent" : "text-fg-subtle")} aria-hidden />
                <span className="truncate text-sm text-fg">{s.label}</span>
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-fg-subtle">{s.desc}</span>
            </button>
          );
        })}

        <div className="rounded-sm border border-dashed border-line p-3">
          <p className="flex items-center gap-1.5 text-xs text-fg-muted">
            <Sparkles className="size-3 text-accent" aria-hidden />
            云端 Agent
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-fg-subtle">
            TODO(SPEC): Agent Cloud 沙箱运行时待接入，当前仅本地技能
          </p>
        </div>
      </CardBody>
    </Card>
  );

  return (
    <StudioShell
      title="Agent 对话"
      description="技能挂载 · SSE 流式输出"
      actions={
        <Button variant="secondary" size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="size-3.5" aria-hidden />
          新会话
        </Button>
      }
    >
      <div className="mb-3 lg:hidden">
        <Tabs
          items={[
            { id: "chat", label: "对话" },
            { id: "convs", label: `会话（${convs.length}）` },
            { id: "skills", label: `技能（${mounted.length}）` },
          ]}
          value={mobileTab}
          onChange={setMobileTab}
        />
      </div>

      <div className="hidden gap-4 lg:grid lg:grid-cols-[220px_minmax(0,1fr)_260px]">
        {convList}
        {chatPanel}
        {skillPanel}
      </div>

      <div className="lg:hidden">
        {mobileTab === "chat" && chatPanel}
        {mobileTab === "convs" && (
          <Card>
            <CardBody className="space-y-1 p-2">
              {convs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => switchConv(c.id)}
                  className={cn(
                    "w-full rounded-xs px-2.5 py-2 text-left",
                    c.id === activeId ? "bg-surface-3" : "hover:bg-surface-2"
                  )}
                >
                  <span className="block truncate text-sm text-fg">{c.title}</span>
                  <span className="tabular mt-0.5 block text-[11px] text-fg-subtle">
                    {c.time} · {c.messages.length} 条
                  </span>
                </button>
              ))}
              <Button variant="secondary" size="sm" className="mt-2 w-full" onClick={() => setNewOpen(true)}>
                <Plus className="size-3.5" aria-hidden />
                新会话
              </Button>
            </CardBody>
          </Card>
        )}
        {mobileTab === "skills" && (
          <Card>
            <CardBody className="space-y-2">
              {AGENT_SKILLS.length === 0 ? (
                <EmptyState title="暂无可用技能" description="稍后再试" />
              ) : (
                AGENT_SKILLS.map((s) => {
                  const on = mounted.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSkill(s.id)}
                      aria-pressed={on}
                      className={cn(
                        "w-full rounded-sm border px-2.5 py-2 text-left",
                        on ? "border-accent bg-accent-soft/30" : "border-line bg-surface-2"
                      )}
                    >
                      <span className="text-sm text-fg">{s.label}</span>
                      <span className="mt-0.5 block text-[11px] text-fg-subtle">{s.desc}</span>
                    </button>
                  );
                })
              )}
            </CardBody>
          </Card>
        )}
      </div>

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="新建会话"
        description="创建后自动切换过去，历史互不干扰"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setNewOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={createConv}>
              创建并进入
            </Button>
          </>
        }
      >
        <label htmlFor="conv-title" className="mb-1.5 block text-xs font-medium text-fg-muted">
          会话标题
        </label>
        <Input
          id="conv-title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") createConv();
          }}
          placeholder={`如：新会话 ${convs.length + 1}`}
          autoFocus
        />
      </Modal>
    </StudioShell>
  );
}
