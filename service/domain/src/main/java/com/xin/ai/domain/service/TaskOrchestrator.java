package com.xin.ai.domain.service;

import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.domain.repository.DataStore;
import com.xin.ai.domain.repository.Rows;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * 任务服务：统一任务链（报价→冻结→提交→执行→结算/退回）。
 * 行内注释1：任务状态机 pending → running → succeeded/failed，与前端 TASK_STATUS_META 一致。
 * 行内注释2：幂等键唯一 —— 重复提交返回首单，不重复冻结积分。
 * 行内注释3：任务记录 params/result 为 JSON 字符串，便于存 jsonb 字段。
 */
@Service
public class TaskOrchestrator {

    public static final String T_TASKS = "tasks";
    public static final String T_BATCHES = "task_batches";
    public static final String T_BATCH_ITEMS = "task_batch_items";

    private final DataStore store;
    private final BillingService billing;

    public TaskOrchestrator(DataStore store, BillingService billing) {
        this.store = store;
        this.billing = billing;
    }

    // 行内注释4：提交 —— 校验报价 → 冻结积分 → 建任务（pending）。
    public Map<String, Object> submit(String userId, String modelKey, String spec, int count,
            Map<String, Object> params, String quoteFingerprint, String idempotencyKey) {
        String idem = idempotencyKey == null || idempotencyKey.isBlank()
                ? UUID.randomUUID().toString() : idempotencyKey;

        // 幂等：已存在同键任务直接返回首单
        Map<String, Object> existing = store.listWhere(T_TASKS, r -> Rows.strEq(r, "idempotency_key", idem))
                .stream().findFirst().orElse(null);
        if (existing != null) {
            return view(existing);
        }

        Map<String, Object> quoteRow = billing.validateQuote(userId, quoteFingerprint);
        int points = Rows.num(quoteRow, "points");
        String taskId = "tsk_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);

        billing.freeze(userId, points, "任务冻结 · " + modelKey, taskId);

        Map<String, Object> task = Rows.row(
                "id", taskId, "user_id", userId,
                "model_key", modelKey, "model", Rows.str(quoteRow, "model", modelKey),
                "spec", Rows.str(quoteRow, "spec", ""),
                "capability", capabilityOf(modelKey),
                "title", titleOf(Rows.str(quoteRow, "model", modelKey), params),
                "status", "pending", "progress", 0,
                "points", points, "points_frozen", points, "points_charged", 0,
                "idempotency_key", idem,
                "quote_fingerprint", quoteFingerprint,
                "params", params == null ? Map.of() : params,
                "result", Map.of(),
                "fail_reason", "",
                "channel_id", "", "upstream_task_id", "",
                "created_at", Times.full(Times.now()),
                "updated_at", Times.full(Times.now()));
        store.put(T_TASKS, taskId, task);
        return view(task);
    }

    // 行内注释5：任务详情视图 —— 含 fail_reason 与 usage_record 追溯信息。
    public Map<String, Object> get(String userId, String taskId) {
        Map<String, Object> task = requireOwned(userId, taskId);
        return view(task);
    }

    // 行内注释6：任务列表 —— 按用户隔离，支持状态筛选与关键字（标题/ID）。
    public List<Map<String, Object>> list(String userId, String status, String query, int page, int pageSize) {
        List<Map<String, Object>> all = store.listWhere(T_TASKS, r -> Rows.strEq(r, "user_id", userId)).stream()
                .sorted((a, b) -> Rows.str(b, "created_at").compareTo(Rows.str(a, "created_at")))
                .filter(r -> status == null || status.isBlank() || status.equals(Rows.str(r, "status")))
                .filter(r -> query == null || query.isBlank()
                        || Rows.str(r, "title", "").contains(query)
                        || Rows.strContains(r, "id", query))
                .toList();
        int from = Math.min((page - 1) * pageSize, all.size());
        int to = Math.min(from + pageSize, all.size());
        return all.subList(from, to).stream().map(this::view).toList();
    }

    public long count(String userId, String status, String query) {
        return list(userId, status, query, 1, Integer.MAX_VALUE).size();
    }

    // 行内注释7：取消 —— 仅 pending 可取消，取消后全额退回冻结积分。
    // 行内注释7.1：状态写 canceled 而不是 failed —— 「用户主动取消」与「生成失败」
    //             是两件事，前端任务中心要分别展示、也只有 failed 才允许重试。
    // 行内注释7.2：必须清掉 points_frozen —— 否则后续任何一次 markFailed/markSucceeded
    //             都会拿这行冻结额再退一次款，凭空造出积分（取消后再执行即可复现）。
    public Map<String, Object> cancel(String userId, String taskId) {
        Map<String, Object> task = requireOwned(userId, taskId);
        if (!"pending".equals(Rows.str(task, "status"))) {
            throw new BizException(ErrorCode.COMMON_CONFLICT, Map.of("message", "任务已开始，无法取消"));
        }
        int frozen = Rows.num(task, "points_frozen");
        store.update(T_TASKS, taskId, Rows.row(
                "status", "canceled", "error_code", "task.cancelled",
                "fail_reason", "用户取消",
                "points_frozen", 0, "points_charged", 0,
                "updated_at", Times.full(Times.now())));
        billing.refund(userId, frozen, "任务取消退回", taskId);
        return view(requireOwned(userId, taskId));
    }

    // 行内注释8：重试 —— 仅 failed 可重试，重新冻结并回到 pending。
    // 行内注释8.1：只有 failed 能重试 —— canceled 是用户主动放弃，不该被重试复活。
    public Map<String, Object> retry(String userId, String taskId) {
        Map<String, Object> task = requireOwned(userId, taskId);
        if (!"failed".equals(Rows.str(task, "status"))) {
            throw new BizException(ErrorCode.COMMON_CONFLICT, Map.of("message", "仅失败任务可重试"));
        }
        int points = Rows.num(task, "points");
        billing.freeze(userId, points, "任务重试冻结", taskId);
        store.update(T_TASKS, taskId, Rows.row(
                "status", "pending", "progress", 0, "points_frozen", points,
                "points_charged", 0, "fail_reason", "", "error_code", "",
                "updated_at", Times.full(Times.now())));
        return view(requireOwned(userId, taskId));
    }

    // 行内注释9：推进 —— 供 Worker/上游回调写进度（pending→running→succeeded/failed）。
    public void markRunning(String taskId, String channelId, String upstreamTaskId) {
        store.update(T_TASKS, taskId, Rows.row(
                "status", "running", "progress", 10,
                "channel_id", channelId == null ? "" : channelId,
                "upstream_task_id", upstreamTaskId == null ? "" : upstreamTaskId,
                "updated_at", Times.full(Times.now())));
    }

    public void markProgress(String taskId, int progress) {
        store.update(T_TASKS, taskId, Rows.row(
                "progress", Math.max(0, Math.min(100, progress)),
                "updated_at", Times.full(Times.now())));
    }

    // 行内注释10：成功结算 —— 冻结转实扣，状态置 succeeded。
    // 行内注释10.1：幂等护栏 —— 任务已是终结态（succeeded/failed/canceled）就直接返回。
    //             没有这道护栏时，「取消后再执行一次」会二次结算，把冻结额再扣一遍。
    public void markSucceeded(String taskId, Map<String, Object> result) {
        Map<String, Object> task = store.find(T_TASKS, taskId).orElse(null);
        if (task == null || isTerminal(Rows.str(task, "status"))) {
            return;
        }
        String userId = Rows.str(task, "user_id");
        int charged = Rows.num(task, "points_frozen");
        store.update(T_TASKS, taskId, Rows.row(
                "status", "succeeded", "progress", 100,
                "points_charged", charged, "points_frozen", 0,
                "result", result == null ? Map.of() : result,
                "updated_at", Times.full(Times.now())));
        billing.settle(userId, charged, "任务结算 · " + Rows.str(task, "title", ""), taskId);
    }

    // 行内注释11：失败退回 —— 释放冻结并回补余额。
    // 行内注释11.1：同样有幂等护栏 —— 终结态任务不再重复退款。
    public void markFailed(String taskId, String errorCode, String message) {
        Map<String, Object> task = store.find(T_TASKS, taskId).orElse(null);
        if (task == null || isTerminal(Rows.str(task, "status"))) {
            return;
        }
        String userId = Rows.str(task, "user_id");
        int frozen = Rows.num(task, "points_frozen");
        store.update(T_TASKS, taskId, Rows.row(
                "status", "failed", "error_code", errorCode,
                "fail_reason", message == null ? "" : message,
                "points_frozen", 0, "points_charged", 0,
                "updated_at", Times.full(Times.now())));
        billing.refund(userId, frozen, "任务失败退回", taskId);
    }

    /** 终结态判定 —— succeeded / failed / canceled 都不可再改账。 */
    private boolean isTerminal(String status) {
        return "succeeded".equals(status) || "failed".equals(status) || "canceled".equals(status);
    }

    // 行内注释12：批量提交 —— 一个 batch 挂多个 task，供批次列表与 SSE 事件流使用。
    public Map<String, Object> submitBatch(String userId, List<Map<String, Object>> items) {
        if (items == null || items.isEmpty()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "items 不能为空"));
        }
        String batchId = "bat_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        List<String> taskIds = new ArrayList<>();
        for (Map<String, Object> item : items) {
            Map<String, Object> task = submit(
                    userId,
                    Rows.str(item, "model_key", ""),
                    Rows.str(item, "spec", ""),
                    Math.max(1, Rows.num(item, "count", 1)),
                    Rows.map(item, "params"),
                    Rows.str(item, "quote_fingerprint", ""),
                    Rows.str(item, "idempotency_key", ""));
            taskIds.add(Rows.str(task, "id"));
        }
        store.put(T_BATCHES, batchId, Rows.row(
                "id", batchId, "user_id", userId, "item_count", taskIds.size(),
                "status", "running", "created_at", Times.full(Times.now())));
        taskIds.forEach(tid -> store.put(T_BATCH_ITEMS, batchId + ":" + tid, Rows.row(
                "id", tid, "batch_id", batchId, "user_id", userId)));
        return Rows.row("id", batchId, "status", "running", "item_count", taskIds.size(),
                "task_ids", taskIds, "created_at", Times.full(Times.now()));
    }

    public List<Map<String, Object>> listBatches(String userId, int page, int pageSize) {
        List<Map<String, Object>> all = store.listWhere(T_BATCHES, r -> Rows.strEq(r, "user_id", userId)).stream()
                .sorted((a, b) -> Rows.str(b, "created_at").compareTo(Rows.str(a, "created_at")))
                .toList();
        int from = Math.min((page - 1) * pageSize, all.size());
        int to = Math.min(from + pageSize, all.size());
        return all.subList(from, to);
    }

    public Map<String, Object> getBatch(String userId, String batchId) {
        Map<String, Object> batch = store.find(T_BATCHES, batchId).orElse(null);
        if (batch == null || !Rows.strEq(batch, "user_id", userId)) {
            throw new BizException(ErrorCode.TASK_NOT_FOUND);
        }
        List<String> taskIds = store.listWhere(T_BATCH_ITEMS, r -> Rows.strEq(r, "batch_id", batchId))
                .stream().map(r -> Rows.str(r, "id")).toList();
        List<Map<String, Object>> tasks = taskIds.stream()
                .map(id -> store.find(T_TASKS, id).orElse(null))
                .filter(java.util.Objects::nonNull)
                .map(this::view)
                .toList();
        return Rows.row("id", batchId, "status", Rows.str(batch, "status"),
                "item_count", Rows.num(batch, "item_count"), "tasks", tasks,
                "created_at", Rows.str(batch, "created_at"));
    }

    // 行内注释13：视图装配 —— 对外字段名与前端契约一致（snake_case）。
    private Map<String, Object> view(Map<String, Object> task) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("id", Rows.str(task, "id"));
        v.put("title", Rows.str(task, "title", ""));
        v.put("capability", Rows.str(task, "capability", ""));
        v.put("status", Rows.str(task, "status"));
        v.put("progress", Rows.num(task, "progress"));
        v.put("points", Rows.num(task, "points"));
        v.put("points_charged", Rows.num(task, "points_charged"));
        // 行内注释6：model 回显模型展示名（来自报价快照），model_key 才是路由键。
        v.put("model", Rows.str(task, "model", Rows.str(task, "model_key", "")));
        v.put("model_key", Rows.str(task, "model_key", ""));
        v.put("fail_reason", Rows.str(task, "fail_reason", ""));
        v.put("error_code", Rows.str(task, "error_code", ""));
        v.put("result", Rows.map(task, "result"));
        v.put("params", Rows.map(task, "params"));
        v.put("created_at", Rows.str(task, "created_at"));
        v.put("updated_at", Rows.str(task, "updated_at"));
        Map<String, Object> usage = Rows.map(task, "usage_record");
        if (!usage.isEmpty()) {
            v.put("usage_record", usage);
        }
        return v;
    }

    private Map<String, Object> requireOwned(String userId, String taskId) {
        Map<String, Object> task = store.find(T_TASKS, taskId).orElse(null);
        if (task == null || !Rows.strEq(task, "user_id", userId)) {
            // 越权一律 404，不暴露资源存在性
            throw new BizException(ErrorCode.TASK_NOT_FOUND);
        }
        return task;
    }

    // 行内注释14：model_key → 能力域映射 —— 取 model_key 第一段（image/video/stone…）。
    private String capabilityOf(String modelKey) {
        if (modelKey == null || modelKey.isBlank()) {
            return "image";
        }
        String head = modelKey.split("\\.")[0];
        return switch (head) {
            case "image-speak" -> "image-speak";
            case "stone" -> "stone-effect";
            case "factory" -> "stone-video";
            case "lipsync" -> "lipsync";
            case "video" -> modelKey.contains("erase") ? "erase"
                    : modelKey.contains("process") ? "video-process" : "video";
            default -> head;
        };
    }

    // 行内注释15：任务标题 —— 优先用 params 里的 title/prompt 摘要，否则用 model_key。
    // 行内注释8：任务标题 —— 优先用户填的 title，其次提示词摘要，最后回落模型展示名。
    private String titleOf(String modelName, Map<String, Object> params) {
        Map<String, Object> p = params == null ? Map.of() : params;
        String title = Rows.str(p, "title", "");
        if (!title.isBlank()) {
            return title;
        }
        String prompt = Rows.str(p, "prompt", "");
        if (!prompt.isBlank()) {
            return prompt.length() > 20 ? prompt.substring(0, 20) + "…" : prompt;
        }
        return modelName;
    }
}
