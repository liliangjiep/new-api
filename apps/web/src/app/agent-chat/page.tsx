import { redirect } from "next/navigation";

/**
 * 原站 /agent-chat 会 302 到 /agent-cloud（2026-11-01 实测：
 *   请求 https://susu.da-ai.cc/agent-chat → 最终 URL https://susu.da-ai.cc/agent-cloud，title「Agent」）。
 * 这里保持一致：服务端直接重定向，避免出现两个不同的 Agent 页。
 */
export default function AgentChatPage() {
  redirect("/agent-cloud");
}
