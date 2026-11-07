package com.xin.ai.api.modules.task;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.dto.PageResult;
import com.xin.ai.common.security.AuthContext;
import com.xin.ai.common.security.CurrentUser;
import com.xin.ai.domain.service.BillingService;
import com.xin.ai.domain.service.TaskEventBus;
import com.xin.ai.domain.service.TaskOrchestrator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
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
    /** 行内注释2.1：事件总线 —— SSE 进度长连接。 */
    private final TaskEventBus events;

    public TaskController(BillingService billing, TaskOrchestrator tasks, TaskExecutor executor,
            TaskEventBus events) {
        this.billing = billing;
        this.tasks = tasks;
        this.executor = executor;
        this.events = events;
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

    /**
     * 进度事件流（SSE）—— 真长连接：任务状态一变就推。
     * 行内注释3：原实现是一次性推完即 complete，前端拿不到中间进度。
     *             现在订阅 TaskEventBus，任务 running/progress/done/failed 时实时推送；
     *             断线由前端降级为轮询 GET /tasks/{id}，两条通路数据同源。
     */
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
                emitter.complete();
                return emitter;
            }
            if ("failed".equals(status)) {
                emitter.send(SseEmitter.event().name("failed")
                        .data(Map.of("error_code", task.get("error_code"), "message", task.get("fail_reason"), "refunded", true)));
                emitter.complete();
                return emitter;
            }
            // 行内注释3.1：还没到终态 —— 挂上订阅，等事件推送。
            AtomicReference<Runnable> cancel = new AtomicReference<>();
            cancel.set(events.subscribe(id, ev -> {
                try {
                    switch (ev.type()) {
                        case TaskEventBus.EV_DONE -> {
                            emitter.send(SseEmitter.event().name("done").data(Map.of("result", ev.payload())));
                            emitter.complete();
                        }
                        case TaskEventBus.EV_FAILED -> {
                            emitter.send(SseEmitter.event().name("failed").data(Map.of(
                                    "error_code", ev.payload().get("error_code"),
                                    "message", ev.payload().get("message"),
                                    "refunded", true)));
                            emitter.complete();
                        }
                        default -> emitter.send(SseEmitter.event().name("progress").data(Map.of(
                                "progress", ev.progress(), "status", ev.status())));
                    }
                } catch (Exception e) {
                    emitter.completeWithError(e);
                }
            }));
            Runnable unsub = cancel.get();
            emitter.onCompletion(unsub);
            emitter.onTimeout(unsub);
            emitter.onError(e -> unsub.run());
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

    /**
     * 批次事件流（SSE）—— 真长连接，逐个子任务推送进度。
     * 行内注释4：批次内每个任务完成都会触发事件，这里统一转成批次级进度推送。
     */
    @GetMapping(value = "/batches/{id}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter batchEvents(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        SseEmitter emitter = new SseEmitter(300_000L);
        try {
            Map<String, Object> batch = tasks.getBatch(user.userId(), id);
            emitter.send(SseEmitter.event().name("progress")
                    .data(Map.of("batch_id", id, "status", batch.get("status"))));
            // 行内注释4.1：批次内任务列表 —— 逐个订阅，任一任务状态变化即刷新批次进度。
            List<Map<String, Object>> items = batch.get("tasks") instanceof List<?> l
                    ? (List<Map<String, Object>>) l : List.of();
            List<Runnable> unsubs = new java.util.ArrayList<>();
            for (Map<String, Object> t : items) {
                String tid = String.valueOf(t.get("id"));
                unsubs.add(events.subscribe(tid, ev -> {
                    try {
                        emitter.send(SseEmitter.event().name("progress").data(Map.of(
                                "batch_id", id, "task_id", tid,
                                "type", ev.type(), "status", ev.status())));
                        if (TaskEventBus.EV_DONE.equals(ev.type()) || TaskEventBus.EV_FAILED.equals(ev.type())) {
                            emitter.complete();
                        }
                    } catch (Exception e) {
                        emitter.completeWithError(e);
                    }
                }));
            }
            Runnable unsub = () -> unsubs.forEach(Runnable::run);
            emitter.onCompletion(unsub);
            emitter.onTimeout(unsub);
            emitter.onError(e -> unsub.run());
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
