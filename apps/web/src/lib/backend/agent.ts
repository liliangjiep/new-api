/**
 * Agent 后端封装（真调用）。
 * 行内注释1：对话走 POST /agent/chat 的 SSE 流 —— 用 streamSse 消费。
 * 行内注释2：会话与消息走后端存储，刷新页面历史不会丢。
 */

import { api } from "@/lib/api";
import { streamSse, type SseEvent } from "@/lib/backend/sse";

export interface AgentSession {
  id: string;
  title: string;
  skill: string;
  created_at: string;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface AgentSkill {
  id: string;
  label: string;
  description?: string;
}

export async function listSessions(): Promise<AgentSession[]> {
  return api.get<AgentSession[]>("/agent/sessions");
}

export async function createSession(body: {
  title: string;
  skill?: string;
}): Promise<AgentSession> {
  return api.post<AgentSession>("/agent/sessions", body);
}

export async function deleteSession(id: string): Promise<void> {
  return api.delete<void>(`/agent/sessions/${id}`);
}

export async function listMessages(sessionId: string): Promise<AgentMessage[]> {
  return api.get<AgentMessage[]>(`/agent/sessions/${sessionId}/messages`);
}

export async function listSkills(): Promise<AgentSkill[]> {
  return api.get<AgentSkill[]>("/agent/skills");
}

/**
 * 流式对话 —— 逐 token 回调。
 * @param onToken 每个片段文本
 * @param onMeta  会话 ID 等元信息
 */
export async function chatStream(
  body: { session_id?: string; message: string; skill?: string; model?: string },
  hooks: {
    onToken?: (text: string) => void;
    onMeta?: (sessionId: string) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  await streamSse(
    "/agent/chat",
    {
      session_id: body.session_id ?? "",
      message: body.message,
      skill: body.skill ?? "",
      model: body.model ?? "",
    },
    {
      signal: hooks.signal,
      doneEvent: "done",
      failEvent: "failed",
      onEvent: (ev: SseEvent) => {
        if (ev.event === "token") {
          const parsed = safeParse(ev.data);
          if (parsed && typeof parsed.text === "string") {
            hooks.onToken?.(parsed.text);
          }
        } else if (ev.event === "meta") {
          const parsed = safeParse(ev.data);
          if (parsed && typeof parsed.session_id === "string") {
            hooks.onMeta?.(parsed.session_id);
          }
        }
      },
    },
  );
}

/** 语音转写 —— 未接入语音服务时后端会明确返回 available=false。 */
export async function transcribe(audioAssetId: string): Promise<{
  text: string;
  available: boolean;
  message: string;
}> {
  return api.post("/speech-input/transcribe", { audio_asset_id: audioAssetId });
}

function safeParse(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s);
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
