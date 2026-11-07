package com.xin.ai.api.modules.agent;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.security.AuthContext;
import com.xin.ai.common.security.CurrentUser;
import com.xin.ai.domain.service.AgentService;
import com.xin.ai.domain.service.ChatService;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executor;
import org.springframework.beans.factory.annotation.Qualifier;
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
    /** 行内注释1.1：对话服务 —— 真流式输出（上游文本模型优先，未配置回落结构化应答）。 */
    private final ChatService chat;
    /** 行内注释1.2：IO 线程池 —— SSE 流式生成不能阻塞请求线程。 */
    private final Executor ioExecutor;

    public AgentController(AgentService agent, ChatService chat,
            @Qualifier("ioExecutor") Executor ioExecutor) {
        this.agent = agent;
        this.chat = chat;
        this.ioExecutor = ioExecutor;
    }

    /**
     * 流式对话 —— 真 SSE 长连接。
     * 行内注释3：原来是一次性推完即 complete，前端拿不到「逐字输出」的体验。
     *             现在放到 IO 线程池里跑，由 ChatService 逐段回调推送。
     */
    @PostMapping(value = "/agent/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@CurrentUser AuthContext.Principal user, @RequestBody ChatRequest req) {
        SseEmitter emitter = new SseEmitter(300_000L);
        final String sessionId;
        try {
            String sid = req.sessionId();
            if (sid == null || sid.isBlank()) {
                sid = String.valueOf(agent.createSession(user.userId(), "新会话", req.skill()).get("id"));
            }
            sessionId = sid;
            agent.appendMessage(user.userId(), sessionId, "user", req.message());
            emitter.send(SseEmitter.event().name("meta")
                    .data(Map.of("session_id", sessionId, "skill", req.skill() == null ? "" : req.skill())));
        } catch (Exception e) {
            emitter.completeWithError(e);
            return emitter;
        }

        final String sid = sessionId;
        // 行内注释3.1：异步执行 —— SSE 响应立即返回，内容在后台线程逐段推。
        ioExecutor.execute(() -> {
            StringBuilder acc = new StringBuilder();
            try {
                chat.chat(user.userId(), sid, req.message(), req.skill(), req.model(),
                        chunk -> {
                            acc.append(chunk);
                            try {
                                emitter.send(SseEmitter.event().name("token")
                                        .data(Map.of("text", chunk)));
                            } catch (Exception e) {
                                throw new IllegalStateException(e);
                            }
                        },
                        full -> {
                            // 行内注释3.2：完成后落库 assistant 消息，刷新会话历史能看到完整回复。
                            agent.appendMessage(user.userId(), sid, "assistant", full);
                        });
                emitter.send(SseEmitter.event().name("done").data(Map.of("session_id", sid)));
                emitter.complete();
            } catch (Exception e) {
                try {
                    emitter.completeWithError(e);
                } catch (Exception ignored) {
                    // 行内注释3.3：连接可能已断，忽略二次异常。
                }
            }
        });
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

    /**
     * 语音转写 —— 需要语音识别服务凭据（A7 暂缓）。
     * 行内注释5：未接真实服务时返回明确的「未接入」状态，而不是空字符串 ——
     *             前端据此提示用户「语音输入暂不可用」，而不是静默显示空结果。
     */
    @PostMapping("/speech-input/transcribe")
    public ApiResponse<Map<String, Object>> transcribe(@CurrentUser AuthContext.Principal user,
            @RequestBody TranscribeRequest req) {
        boolean available = !"".equals(agent.transcribeAvailable());
        return ok(Map.of(
                "text", "",
                "available", available,
                "provider", agent.transcribeAvailable(),
                "message", available ? "" : "语音识别服务尚未接入，请改用文字输入"));
    }

    // ---------------- 请求体 ----------------

    public record ChatRequest(String sessionId, String message, String skill, String model) {}

    public record CreateSessionRequest(String title, String skill) {}

    public record CloudRuntimeRequest(String task) {}

    public record TranscribeRequest(String audioAssetId) {}
}
