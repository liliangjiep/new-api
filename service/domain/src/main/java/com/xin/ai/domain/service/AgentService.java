package com.xin.ai.domain.service;

import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.domain.catalog.Catalog;
import com.xin.ai.domain.repository.MemStore;
import com.xin.ai.domain.repository.Rows;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Agent 服务：会话、消息、技能挂载、云端运行时占位。
 * 行内注释1：会话与消息按用户隔离；消息流由 SSE 端点边生成边推送。
 * 行内注释2：cloud-runtime 为沙箱占位 —— 只回 pod 标识与状态，不真的起 Pod（架构 §12 待定项 2）。
 */
@Service
public class AgentService {

    public static final String T_SESSIONS = "agent_sessions";
    public static final String T_MESSAGES = "agent_messages";

    private final MemStore store;

    public AgentService(MemStore store) {
        this.store = store;
    }

    public List<Map<String, Object>> listSessions(String userId) {
        return store.listWhere(T_SESSIONS, r -> Rows.str(r, "user_id").equals(userId)).stream()
                .sorted((a, b) -> Rows.str(b, "created_at").compareTo(Rows.str(a, "created_at")))
                .map(s -> Rows.row(
                        "id", Rows.str(s, "id"),
                        "title", Rows.str(s, "title", "新会话"),
                        "skill", Rows.str(s, "skill", ""),
                        "created_at", Rows.str(s, "created_at")))
                .toList();
    }

    public Map<String, Object> createSession(String userId, String title, String skill) {
        String id = "ags_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        Map<String, Object> s = Rows.row(
                "id", id, "user_id", userId,
                "title", title == null || title.isBlank() ? "新会话" : title.trim(),
                "skill", skill == null ? "" : skill,
                "created_at", Times.full(Times.now()));
        store.put(T_SESSIONS, id, s);
        return Rows.row("id", id, "title", Rows.str(s, "title"), "skill", Rows.str(s, "skill"),
                "created_at", Rows.str(s, "created_at"));
    }

    public void deleteSession(String userId, String sessionId) {
        Map<String, Object> s = store.find(T_SESSIONS, sessionId).orElse(null);
        if (s == null || !Rows.str(s, "user_id").equals(userId)) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        store.delete(T_SESSIONS, sessionId);
        store.deleteWhere(T_MESSAGES, r -> Rows.str(r, "session_id").equals(sessionId));
    }

    public List<Map<String, Object>> messages(String userId, String sessionId) {
        Map<String, Object> s = store.find(T_SESSIONS, sessionId).orElse(null);
        if (s == null || !Rows.str(s, "user_id").equals(userId)) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        return store.listWhere(T_MESSAGES, r -> Rows.str(r, "session_id").equals(sessionId)).stream()
                .sorted((a, b) -> Rows.num(a, "seq") - Rows.num(b, "seq"))
                .map(m -> Rows.row(
                        "id", Rows.str(m, "id"),
                        "role", Rows.str(m, "role"),
                        "content", Rows.str(m, "content", ""),
                        "created_at", Rows.str(m, "created_at")))
                .toList();
    }

    // 行内注释3：追加消息 —— seq 单调递增，供 SSE 增量推送。
    public Map<String, Object> appendMessage(String userId, String sessionId, String role, String content) {
        Map<String, Object> s = store.find(T_SESSIONS, sessionId).orElse(null);
        if (s == null || !Rows.str(s, "user_id").equals(userId)) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        int seq = (int) store.countWhere(T_MESSAGES, r -> Rows.str(r, "session_id").equals(sessionId));
        String id = "msg_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        store.put(T_MESSAGES, id, Rows.row(
                "id", id, "session_id", sessionId, "user_id", userId,
                "role", role, "content", content, "seq", seq,
                "created_at", Times.full(Times.now())));
        return Rows.row("id", id, "role", role, "content", content);
    }

    // 行内注释4：可挂载技能 —— 6 项，与前端 agent-chat 技能选择器一致。
    public List<Map<String, Object>> skills() {
        return Catalog.AGENT_SKILLS;
    }

    // 行内注释5：云端运行时 —— 占位实现，返回 pod 标识与 pending 状态。
    public Map<String, Object> cloudRuntime(String userId, String task) {
        String podId = "pod_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        return Rows.row("pod_id", podId, "status", "pending", "task", task == null ? "" : task);
    }

    // 行内注释6：桌面会话 —— 占位实现，返回会话 URL。
    public Map<String, Object> desktopSession(String userId) {
        String sessionId = "dsk_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        return Rows.row("session_id", sessionId, "session_url", "https://cloud.local.invalid/session/" + sessionId);
    }
}
