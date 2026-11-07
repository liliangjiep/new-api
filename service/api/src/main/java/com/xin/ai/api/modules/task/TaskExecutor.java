package com.xin.ai.api.modules.task;

import com.xin.ai.adapters.adapters.RelayAdapter;
import com.xin.ai.adapters.base.ModelAdapter;
import com.xin.ai.adapters.router.ChannelRouter;
import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.common.ratelimit.RedisTokenBucket;
import com.xin.ai.domain.repository.DataStore;
import com.xin.ai.domain.repository.Rows;
import com.xin.ai.domain.service.AdminService;
import com.xin.ai.domain.service.RelayConfigService;
import com.xin.ai.domain.service.TaskOrchestrator;
import com.xin.ai.domain.service.UpstreamParamBuilder;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

/**
 * 任务执行器：把 pending 任务送进上游中转站，并驱动状态机与结算。
 * 行内注释1：编排顺序 —— 取接入点候选 → 逐站尝试（失败自动回退下一站）→ 轮询 → 成功结算 / 失败退回。
 * 行内注释2：接入点与密钥全部来自 MySQL 的 model_endpoints / model_channels，
 *            新增中转站 = 插一行数据，这里无需改代码。
 * 行内注释3：跨通道重试不重复扣费 —— 扣费在 submit 阶段已冻结，回退只换上游不动账。
 */
@Service
public class TaskExecutor {

    private static final Logger log = LoggerFactory.getLogger(TaskExecutor.class);

    /** 行内注释0：轮询节奏 —— 真实中转站生成需几十秒，每 3 秒查一次，最多 100 次（约 5 分钟）。 */
    private static final int MAX_POLL_TIMES = 100;
    private static final long POLL_INTERVAL_MS = 3000L;

    /** 上游模型映射：平台 model_key → 该站的上游模型名（DB 未配置时的兜底）。 */
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

    /** 默认参数映射：平台参数 → 上游参数。 */
    private static final Map<String, String> PARAM_KEYS = Map.of(
            "prompt", "prompt",
            "size", "size",
            "resolution", "resolution",
            "aspect_ratio", "aspect_ratio",
            "duration", "duration",
            "n", "n",
            "background", "background");

    private final DataStore store;
    private final TaskOrchestrator tasks;
    private final RelayAdapter adapter;
    private final RelayConfigService relayConfig;
    private final ChannelRouter router;
    /** 行内注释3.2：分布式令牌桶 —— 按通道限流，多实例共享配额。 */
    private final RedisTokenBucket tokenBucket;
    /** 行内注释9.5：上游参数装配 —— 把业务参数（asset_id/avatar_id/regions）翻译成上游要的 URL 与字段。 */
    private final UpstreamParamBuilder paramBuilder;

    public TaskExecutor(DataStore store, TaskOrchestrator tasks,
            @Qualifier("relayAdapter") RelayAdapter adapter,
            RelayConfigService relayConfig,
            ChannelRouter router,
            RedisTokenBucket tokenBucket,
            UpstreamParamBuilder paramBuilder) {
        this.store = store;
        this.tasks = tasks;
        this.adapter = adapter;
        this.relayConfig = relayConfig;
        this.router = router;
        this.tokenBucket = tokenBucket;
        this.paramBuilder = paramBuilder;
    }

    /**
     * 执行 —— 同步跑完整个上游生命周期，直接落到终态。
     * 行内注释4：回退细节 —— 每个候选站独立提交，失败即换下一站；
     *            全部失败才判任务失败并退回冻结积分。
     */
    public Map<String, Object> execute(String taskId) {
        Map<String, Object> task = store.find(TaskOrchestrator.T_TASKS, taskId).orElse(null);
        if (task == null) {
            throw new BizException(ErrorCode.TASK_NOT_FOUND);
        }
        String modelKey = Rows.str(task, "model_key", "");
        List<ModelAdapter.EndpointSnapshot> candidates = resolveEndpoints(modelKey, task);

        if (candidates.isEmpty()) {
            tasks.markFailed(taskId, "channel.not_configured",
                    "没有可用的中转站接入点，请先在后台「模型接入」配置 model_endpoints");
            return tasks.get(Rows.str(task, "user_id"), taskId);
        }

        ChannelRouter.RoutePlan plan = router.plan(candidates, Map.of());
        List<ModelAdapter.EndpointSnapshot> ordered = plan.candidates();
        if (ordered.isEmpty()) {
            tasks.markFailed(taskId, "channel.all_failed", "全部中转站均已熔断，请稍后重试");
            return tasks.get(Rows.str(task, "user_id"), taskId);
        }

        Map<String, Object> params = mapParams(Rows.map(task, "params"), modelKey,
                Rows.str(task, "user_id", ""));
        String idempotencyKey = Rows.str(task, "idempotency_key", "");
        String traceId = org.slf4j.MDC.get("traceId");

        ChannelRouter.FallbackResult submitted = router.submitWithFallback(ordered, ep -> {
            // 行内注释3.3：分通道限流 —— 取不到令牌说明这个站当前超了 RPM 配额，
            //             记为限流失败并回退到下一站（不回退会直接打爆上游）。
            if (!acquireToken(ep)) {
                return new ModelAdapter.ModelResponse(false, null, Map.of(),
                        "channel.rate_limited", "通道 " + ep.channelName() + " 当前超出 RPM 配额");
            }
            ModelAdapter.ModelRequest req = new ModelAdapter.ModelRequest(ep, params, idempotencyKey, traceId);
            return adapter.submit(req);
        });

        if (!submitted.ok()) {
            String reason = buildFailureReason(submitted);
            log.warn("所有中转站均失败 task={} attempts={}", taskId, submitted.attempts());
            tasks.markFailed(taskId,
                    submitted.errorCode() == null ? "channel.all_failed" : submitted.errorCode(), reason);
            return tasks.get(Rows.str(task, "user_id"), taskId);
        }

        ModelAdapter.EndpointSnapshot used = submitted.used();
        tasks.markRunning(taskId, used.channelId(), submitted.upstreamTaskId());

        // 行内注释5：轮询也用同一个站 —— 换站会导致上游任务 ID 认不出。
        // 行内注释5.1：真实中转站是异步生成 —— 一次轮询拿不到结果不等于失败，
        //             必须按间隔轮询到终态（succeeded/failed）或超时。
        ModelAdapter.ModelRequest pollReq = new ModelAdapter.ModelRequest(
                used, params, idempotencyKey, traceId);
        ModelAdapter.ModelResponse polled = pollUntilTerminal(pollReq, submitted.upstreamTaskId(), taskId);
        if (polled.ok()) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("result_urls", polled.raw().getOrDefault("result_urls", List.of()));
            result.put("type", polled.raw().getOrDefault("type", ""));
            result.put("billing", polled.raw().getOrDefault("billing", Map.of()));
            result.put("channel_id", used.channelId());
            result.put("channel_name", used.channelName());
            tasks.markSucceeded(taskId, result);
        } else {
            tasks.markFailed(taskId, polled.errorCode(),
                    polled.errorMessage() == null ? "上游生成失败" : polled.errorMessage());
        }
        return tasks.get(Rows.str(task, "user_id"), taskId);
    }

    /**
     * 取限流令牌 —— 通道未配 RPM 限制时不限流。
     * 行内注释3.4：速率取通道表的 rpm_limit（每分钟请求数），
     *             换算成每秒补充速率，桶容量给 rpm_limit 的一半（允许一半的突发）。
     */
    private boolean acquireToken(ModelAdapter.EndpointSnapshot ep) {
        if (tokenBucket == null || ep.channelId() == null) {
            return true;
        }
        int rpm = rpmLimitOf(ep.channelId());
        if (rpm <= 0) {
            return true;
        }
        double perSecond = rpm / 60.0d;
        int burst = Math.max(1, rpm / 2);
        return tokenBucket.tryAcquire(ep.channelId(), perSecond, burst);
    }

    /** 读通道的 RPM 限制 —— 从通道配置表取。 */
    private int rpmLimitOf(String channelId) {
        Map<String, Object> ch = relayConfig.findChannel(channelId);
        return ch == null ? 0 : (int) Rows.num(ch, "rpm_limit", 0);
    }

    /**
     * 接入点解析 —— 优先读 MySQL 的 model_endpoints（可多站回退），空则回落内置默认配置。
     */
    private List<ModelAdapter.EndpointSnapshot> resolveEndpoints(String modelKey, Map<String, Object> task) {
        List<ModelAdapter.EndpointSnapshot> eps = relayConfig.resolveEndpoints(modelKey);
        if (!eps.isEmpty()) {
            return eps;
        }
        // 行内注释6：DB 没配 → 用环境变量兜底（单站，无回退能力）。
        String apiKey = System.getenv("TOAPIS_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            return List.of();
        }
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("channel_id", "env_fallback");
        return List.of(new ModelAdapter.EndpointSnapshot(
                modelKey,
                System.getenv().getOrDefault("TOAPIS_BASE_URL", "https://toapis.cn"),
                UPSTREAM_MODEL.getOrDefault(modelKey, ""),
                "env_fallback",
                "环境变量兜底",
                apiKey,
                relayConfig.parseTemplate("{}", "toapis"),
                60000, 2, 100, config));
    }

    /**
     * 轮询直到终态 —— 真实中转站生成需要几十秒到几分钟。
     * 行内注释6：poll 返回 ok=true 表示已 succeeded；ok=false 且 errorCode=channel.failed 表示上游明确失败；
     *             其余（超时/网络错误）继续重试，超过上限才判失败。
     */
    private ModelAdapter.ModelResponse pollUntilTerminal(ModelAdapter.ModelRequest req,
            String upstreamTaskId, String taskId) {
        ModelAdapter.ModelResponse last = null;
        for (int i = 0; i < MAX_POLL_TIMES; i++) {
            ModelAdapter.ModelResponse res;
            try {
                res = adapter.poll(req, upstreamTaskId);
            } catch (Exception e) {
                res = new ModelAdapter.ModelResponse(false, upstreamTaskId, Map.of(),
                        "channel.request_failed", "轮询异常：" + e.getMessage());
            }
            last = res;
            if (res.ok()) {
                return res;
            }
            // 行内注释6.1：上游明确失败（channel.failed）—— 不重试，直接判失败。
            if ("channel.failed".equals(res.errorCode())) {
                return res;
            }
            // 行内注释6.2：进度回写 —— 前端进度条据此更新。
            Object progress = res.raw() == null ? null : res.raw().get("progress");
            if (progress instanceof Number n) {
                tasks.markProgress(taskId, n.intValue());
            }
            try {
                Thread.sleep(POLL_INTERVAL_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return res;
            }
        }
        return last == null
                ? new ModelAdapter.ModelResponse(false, upstreamTaskId, Map.of(),
                        "channel.timeout", "上游生成超时")
                : last;
    }

    /** 行内注释7：失败原因拼接 —— 把每一跳的失败都写进 fail_reason，便于后台排障。 */
    private String buildFailureReason(ChannelRouter.FallbackResult result) {
        StringBuilder sb = new StringBuilder("全部中转站失败");
        for (ChannelRouter.Attempt a : result.attempts()) {
            sb.append(" | ").append(a.channelName() == null ? a.channelId() : a.channelName())
                    .append(": ").append(a.errorCode()).append(" ").append(a.errorMessage());
        }
        return sb.toString();
    }

    /**
     * 参数映射 —— 把业务参数翻译成上游参数。
     * 行内注释7.1：原先这里只放行 prompt/size/resolution 等固定键，
     *             导致 video_asset_id / avatar_id / regions 这些业务字段被整段丢掉，
     *             上游拿到的请求体是空的。这里交给 UpstreamParamBuilder 统一处理：
     *             标准链路沿用白名单，工具类链路额外解析资产/形象 ID 成真实 URL。
     */
    private Map<String, Object> mapParams(Map<String, Object> params, String modelKey, String userId) {
        if (paramBuilder != null) {
            return paramBuilder.build(modelKey, params, userId);
        }
        // 行内注释7.2：装配器缺失时退化到白名单映射（保证任务不会因 Bean 缺失而整体不可用）。
        Map<String, Object> out = new LinkedHashMap<>();
        params.forEach((k, v) -> {
            if (PARAM_KEYS.containsKey(k)) {
                out.put(PARAM_KEYS.get(k), v);
            }
        });
        return out;
    }
}
