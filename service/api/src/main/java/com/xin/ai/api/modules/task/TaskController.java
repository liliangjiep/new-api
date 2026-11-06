package com.xin.ai.api.modules.task;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.dto.PageResult;
import com.xin.ai.common.security.AuthContext;
import com.xin.ai.common.security.CurrentUser;
import com.xin.ai.domain.service.BillingService;
import com.xin.ai.domain.service.TaskOrchestrator;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 任务统一链路（文档 §2.3）。
 * 行内注释1：报价→提交→轮询→重试/取消 五步，幂等键贯穿。
 * 行内注释2：SSE 断线时前端降级轮询 GET /tasks/{id}，两条通路数据同源。
 */
@RestController
@RequestMapping("/api/v1")
public class TaskController extends BaseController {

    private final BillingService billing;
    private final TaskOrchestrator tasks;
    private final TaskExecutor executor;

    public TaskController(BillingService billing, TaskOrchestrator tasks, TaskExecutor executor) {
        this.billing = billing;
        this.tasks = tasks;
        this.executor = executor;
    }

    // 行内注释1：立即执行 —— 同步跑完上游链路并落终态，便于联调时直接看到结果。
    @PostMapping("/tasks/{id}/execute")
    public ApiResponse<Map<String, Object>> execute(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        tasks.get(user.userId(), id);
        return ok(executor.execute(id));
    }

    /** 报价 —— 返回 15 分钟有效的指纹。 */
    @PostMapping("/tasks/quote")
    public ApiResponse<Map<String, Object>> quote(@CurrentUser AuthContext.Principal user,
            @RequestBody QuoteRequest req) {
        return ok(billing.quote(user.userId(), req.modelKey(), req.spec(),
                req.count() == null ? 1 : req.count(),
                req.params() == null ? Map.of() : req.params()));
    }

    /** 提交任务 —— 幂等键冲突返回首单。 */
    @PostMapping("/tasks/submit")
    public ApiResponse<Map<String, Object>> submit(@CurrentUser AuthContext.Principal user,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody SubmitRequest req) {
        String key = idempotencyKey != null ? idempotencyKey : req.idempotencyKey();
        return ok(tasks.submit(user.userId(), req.modelKey(), req.spec(),
                req.count() == null ? 1 : req.count(),
                req.params() == null ? Map.of() : req.params(),
                req.quoteFingerprint(), key));
    }

    /** 任务列表。 */
    @GetMapping("/tasks")
    public ApiResponse<PageResult<Map<String, Object>>> list(@CurrentUser AuthContext.Principal user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String query) {
        int size = Math.min(Math.max(pageSize, 1), 100);
        int p = Math.max(page, 1);
        List<Map<String, Object>> items = tasks.list(user.userId(), status, query, p, size);
        long total = tasks.count(user.userId(), status, query);
        return page(items, p, size, total);
    }

    /** 任务详情。 */
    @GetMapping("/tasks/{id}")
    public ApiResponse<Map<String, Object>> detail(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        return ok(tasks.get(user.userId(), id));
    }

    /** 重试失败任务。 */
    @PostMapping("/tasks/{id}/retry")
    public ApiResponse<Map<String, Object>> retry(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        return ok(tasks.retry(user.userId(), id));
    }

    /** 取消排队中的任务并全额退回积分。 */
    @PostMapping("/tasks/{id}/cancel")
    public ApiResponse<Map<String, Object>> cancel(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        return ok(tasks.cancel(user.userId(), id));
    }

    /** 进度事件流（SSE）—— 事件名 progress / done / failed。 */
    @GetMapping(value = "/tasks/{id}/progress", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter progress(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        SseEmitter emitter = new SseEmitter(300_000L);
        try {
            Map<String, Object> task = tasks.get(user.userId(), id);
            String status = String.valueOf(task.get("status"));
            emitter.send(SseEmitter.event().name("progress")
                    .data(Map.of("progress", task.get("progress"), "status", status)));
            if ("succeeded".equals(status)) {
                emitter.send(SseEmitter.event().name("done").data(Map.of("result", task.get("result"))));
            } else if ("failed".equals(status)) {
                emitter.send(SseEmitter.event().name("failed")
                        .data(Map.of("error_code", task.get("error_code"), "message", task.get("fail_reason"), "refunded", true)));
            }
            emitter.complete();
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
        return emitter;
    }

    /** 批量提交 —— 返回批次。 */
    @PostMapping("/tasks/batches")
    public ApiResponse<Map<String, Object>> submitBatch(@CurrentUser AuthContext.Principal user,
            @RequestBody BatchRequest req) {
        return ok(tasks.submitBatch(user.userId(), req.items()));
    }

    @GetMapping("/batches")
    public ApiResponse<PageResult<Map<String, Object>>> listBatches(@CurrentUser AuthContext.Principal user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        int size = Math.min(Math.max(pageSize, 1), 100);
        int p = Math.max(page, 1);
        List<Map<String, Object>> items = tasks.listBatches(user.userId(), p, size);
        return page(items, p, size, items.size());
    }

    @GetMapping("/batches/{id}")
    public ApiResponse<Map<String, Object>> batchDetail(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        return ok(tasks.getBatch(user.userId(), id));
    }

    /** 批次事件流（SSE）。 */
    @GetMapping(value = "/batches/{id}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter batchEvents(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        SseEmitter emitter = new SseEmitter(300_000L);
        try {
            Map<String, Object> batch = tasks.getBatch(user.userId(), id);
            emitter.send(SseEmitter.event().name("progress")
                    .data(Map.of("batch_id", id, "status", batch.get("status"))));
            emitter.complete();
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
        return emitter;
    }

    // ---------------- 请求体 ----------------

    public record QuoteRequest(String modelKey, String spec, Integer count, Map<String, Object> params) {}

    public record SubmitRequest(String modelKey, String spec, Integer count, Map<String, Object> params,
            String quoteFingerprint, String idempotencyKey) {}

    public record BatchRequest(List<Map<String, Object>> items) {}
}
