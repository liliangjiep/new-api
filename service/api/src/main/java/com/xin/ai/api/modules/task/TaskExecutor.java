package com.xin.ai.api.modules.task;

import com.xin.ai.adapters.adapters.ToApiAdapter;
import com.xin.ai.adapters.base.ModelAdapter;
import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.domain.repository.MemStore;
import com.xin.ai.domain.repository.Rows;
import com.xin.ai.domain.service.AdminService;
import com.xin.ai.domain.service.TaskOrchestrator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

/**
 * 任务执行器：把 pending 任务送进上游（ToAPI），并驱动状态机与结算。
 * 行内注释1：编排顺序 —— 取接入点 → 提交上游 → 轮询 → 成功结算 / 失败退回，跨通道重试不重复扣费。
 * 行内注释2：接入点从 model_endpoints 读取；无配置时回落 ToAPI 默认模型映射。
 * 行内注释3：同步执行（当前实现），后续可迁到 worker 模块做异步队列。
 */
@Service
public class TaskExecutor {

    private static final Logger log = LoggerFactory.getLogger(TaskExecutor.class);

    /** 上游模型映射：平台 model_key → ToAPI 上游模型名。 */
    private static final Map<String, String> UPSTREAM_MODEL = Map.of(
            "image.t2i.1k", "gpt-image-2",
            "image.t2i.2k", "gpt-image-2",
            "image.t2i.4k", "gpt-image-2",
            "stone.effect.2k", "gpt-image-2",
            "stone.effect.4k", "gpt-image-2",
            "stone.effect.set6", "gpt-image-2",
            "video.t2v.720p", "seedance-2-mini",
            "video.t2v.mini", "seedance-2-mini",
            "video.batch.480p", "seedance-2-mini",
            "video.i2v.kling", "seedance-2-mini");

    /** ToAPI 参数映射：平台参数 → 上游参数。 */
    private static final Map<String, String> PARAM_KEYS = Map.of(
            "prompt", "prompt",
            "size", "size",
            "resolution", "resolution",
            "aspect_ratio", "aspect_ratio",
            "duration", "duration",
            "n", "n",
            "background", "background");

    private final MemStore store;
    private final TaskOrchestrator tasks;
    private final ToApiAdapter adapter;

    public TaskExecutor(MemStore store, TaskOrchestrator tasks,
            @Qualifier("toApiAdapter") ToApiAdapter adapter) {
        this.store = store;
        this.tasks = tasks;
        this.adapter = adapter;
    }

    // 行内注释4：执行 —— 同步跑完整个上游生命周期，直接落到终态。
    public Map<String, Object> execute(String taskId) {
        Map<String, Object> task = store.find(TaskOrchestrator.T_TASKS, taskId).orElse(null);
        if (task == null) {
            throw new BizException(ErrorCode.TASK_NOT_FOUND);
        }
        String modelKey = Rows.str(task, "model_key", "");
        ModelAdapter.EndpointSnapshot endpoint = resolveEndpoint(modelKey, task);
        ModelAdapter.ModelRequest request = new ModelAdapter.ModelRequest(
                endpoint,
                mapParams(Rows.map(task, "params"), modelKey),
                Rows.str(task, "idempotency_key", ""),
                org.slf4j.MDC.get("traceId"));

        ModelAdapter.ModelResponse submitted = adapter.submit(request);
        if (!submitted.ok()) {
            // 行内注释5：上游提交失败 —— 立即退回冻结积分，任务判失败。
            tasks.markFailed(taskId, submitted.errorCode(),
                    submitted.errorMessage() == null ? "上游提交失败" : submitted.errorMessage());
            return tasks.get(Rows.str(task, "user_id"), taskId);
        }
        tasks.markRunning(taskId, "toapi", submitted.upstreamTaskId());

        ModelAdapter.ModelResponse polled = adapter.poll(request, submitted.upstreamTaskId());
        if (polled.ok()) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("result_urls", polled.raw().getOrDefault("result_urls", List.of()));
            result.put("type", polled.raw().getOrDefault("type", ""));
            result.put("billing", polled.raw().getOrDefault("billing", Map.of()));
            tasks.markSucceeded(taskId, result);
        } else {
            tasks.markFailed(taskId, polled.errorCode(),
                    polled.errorMessage() == null ? "上游生成失败" : polled.errorMessage());
        }
        return tasks.get(Rows.str(task, "user_id"), taskId);
    }

    // 行内注释6：接入点解析 —— 优先 model_endpoints 配置，回落内置 ToAPI 映射。
    private ModelAdapter.EndpointSnapshot resolveEndpoint(String modelKey, Map<String, Object> task) {
        List<Map<String, Object>> endpoints = store.listWhere(AdminService.T_ENDPOINTS,
                r -> Rows.str(r, "model_key").equals(modelKey) && Rows.bool(r, "enabled"));
        String baseUrl = "https://toapis.cn";
        String upstreamModel = UPSTREAM_MODEL.getOrDefault(modelKey, "");
        int timeout = 60000;
        if (!endpoints.isEmpty()) {
            Map<String, Object> first = endpoints.stream()
                    .sorted((a, b) -> Integer.compare(Rows.num(a, "sort_order", 100), Rows.num(b, "sort_order", 100)))
                    .findFirst().orElse(endpoints.get(0));
            baseUrl = Rows.str(first, "base_url", baseUrl);
            upstreamModel = Rows.str(first, "upstream_model", upstreamModel);
            timeout = Rows.num(first, "timeout_ms", timeout);
        }
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("channel_id", "toapi");
        config.put("secret_ref", "xin.toapi.api-key");
        return new ModelAdapter.EndpointSnapshot(modelKey, baseUrl, upstreamModel, "xin.toapi.api-key",
                timeout, 2, config);
    }

    // 行内注释7：参数映射 —— 只保留上游认识的键，避免把业务字段透传过去。
    private Map<String, Object> mapParams(Map<String, Object> params, String modelKey) {
        Map<String, Object> out = new LinkedHashMap<>();
        params.forEach((k, v) -> {
            if (PARAM_KEYS.containsKey(k)) {
                out.put(PARAM_KEYS.get(k), v);
            }
        });
        // 行内注释8：resolution 与 size 的默认推导 —— 由 spec 决定 1k/2k/4k。
        if (!out.containsKey("resolution")) {
            String spec = modelKey == null ? "" : modelKey;
            if (spec.endsWith("4k")) {
                out.put("resolution", "4k");
            } else if (spec.endsWith("2k")) {
                out.put("resolution", "2k");
            } else if (spec.contains("video")) {
                out.put("resolution", "720p");
                out.putIfAbsent("duration", 5);
                out.putIfAbsent("aspect_ratio", "16:9");
            } else {
                out.put("resolution", "1k");
            }
        }
        out.putIfAbsent("size", "1:1");
        out.putIfAbsent("n", 1);
        return out;
    }
}
