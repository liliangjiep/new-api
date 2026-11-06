package com.xin.ai.api.modules.agent;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.security.AuthContext;
import com.xin.ai.common.security.CurrentUser;
import com.xin.ai.domain.service.AgentService;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Agent 与语音输入接口（文档 §2.6）。
 * 行内注释1：chat 为 SSE 流式，stop/regenerate 语义由前端在收到 done 事件后处理。
 * 行内注释2：transcribe 走真实语音服务需第三方密钥，当前返回占位文本（见状态文档 TODO）。
 */
@RestController
@RequestMapping("/api/v1")
public class AgentController extends BaseController {

    private final AgentService agent;

    public AgentController(AgentService agent) {
        this.agent = agent;
    }

    /** 流式对话。 */
    @PostMapping(value = "/agent/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@CurrentUser AuthContext.Principal user, @RequestBody ChatRequest req) {
        SseEmitter emitter = new SseEmitter(300_000L);
        try {
            String sessionId = req.sessionId();
            if (sessionId == null || sessionId.isBlank()) {
                sessionId = String.valueOf(agent.createSession(user.userId(), "新会话", req.skill()).get("id"));
            }
            agent.appendMessage(user.userId(), sessionId, "user", req.message());
            emitter.send(SseEmitter.event().name("meta")
                    .data(Map.of("session_id", sessionId, "skill", req.skill() == null ? "" : req.skill())));
            // 行内注释3：占位回复 —— 接入真实文本模型后改为边生成边推送 token。
            agent.appendMessage(user.userId(), sessionId, "assistant", placeholderReply(req.message()));
            emitter.send(SseEmitter.event().name("token")
                    .data(Map.of("text", placeholderReply(req.message()))));
            emitter.send(SseEmitter.event().name("done").data(Map.of("session_id", sessionId)));
            emitter.complete();
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
        return emitter;
    }

    /** 会话列表。 */
    @GetMapping("/agent/sessions")
    public ApiResponse<List<Map<String, Object>>> sessions(@CurrentUser AuthContext.Principal user) {
        return list(agent.listSessions(user.userId()));
    }

    @PostMapping("/agent/sessions")
    public ApiResponse<Map<String, Object>> createSession(@CurrentUser AuthContext.Principal user,
            @RequestBody CreateSessionRequest req) {
        return ok(agent.createSession(user.userId(), req.title(), req.skill()));
    }

    @DeleteMapping("/agent/sessions/{id}")
    public ApiResponse<Void> deleteSession(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        agent.deleteSession(user.userId(), id);
        return ok();
    }

    /** 会话消息。 */
    @GetMapping("/agent/sessions/{id}/messages")
    public ApiResponse<List<Map<String, Object>>> messages(@CurrentUser AuthContext.Principal user,
            @PathVariable String id) {
        return list(agent.messages(user.userId(), id));
    }

    /** 可挂载技能。 */
    @GetMapping("/agent/skills")
    public ApiResponse<List<Map<String, Object>>> skills() {
        return list(agent.skills());
    }

    /** 云端运行时（占位）。 */
    @PostMapping("/agent/cloud-runtime")
    public ApiResponse<Map<String, Object>> cloudRuntime(@CurrentUser AuthContext.Principal user,
            @RequestBody CloudRuntimeRequest req) {
        return ok(agent.cloudRuntime(user.userId(), req.task()));
    }

    /** 桌面会话（占位）。 */
    @PostMapping("/agent/cloud-runtime/desktop-session")
    public ApiResponse<Map<String, Object>> desktopSession(@CurrentUser AuthContext.Principal user) {
        return ok(agent.desktopSession(user.userId()));
    }

    /** 语音转写 —— 需第三方语音服务密钥，当前为占位实现。 */
    @PostMapping("/speech-input/transcribe")
    public ApiResponse<Map<String, Object>> transcribe(@CurrentUser AuthContext.Principal user,
            @RequestBody TranscribeRequest req) {
        return ok(Map.of("text", ""));
    }

    private String placeholderReply(String message) {
        return "已收到你的需求，正在生成方案。";
    }

    // ---------------- 请求体 ----------------

    public record ChatRequest(String sessionId, String message, String skill, String model) {}

    public record CreateSessionRequest(String title, String skill) {}

    public record CloudRuntimeRequest(String task) {}

    public record TranscribeRequest(String audioAssetId) {}
}
