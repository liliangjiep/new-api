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

    /**
     * 上游模型映射：平台 model_key → 该站的上游模型名（DB 未配置时的兜底）。
     * 行内注释7.3：这份映射必须覆盖 V3 迁移里建的全部接入点 ——
     *             漏一个，该 model_key 走环境变量兜底通道时 upstream_model 就是空串，
     *             上游收到 "model": "" 会直接回 model_not_found。
     */
    private static final Map<String, String> UPSTREAM_MODEL = Map.ofEntries(
            Map.entry("image.t2i.1k", "gpt-image-2"),
            Map.entry("image.t2i.2k", "gpt-image-2"),
            Map.entry("image.t2i.4k", "gpt-image-2"),
            Map.entry("stone.effect.2k", "gpt-image-2"),
            Map.entry("stone.effect.4k", "gpt-image-2"),
            Map.entry("stone.effect.set6", "gpt-image-2"),
            Map.entry("video.t2v.720p", "seedance-2-mini"),
            Map.entry("video.t2v.mini", "seedance-2-mini"),
            Map.entry("video.batch.480p", "seedance-2-mini"),
            Map.entry("video.i2v.kling", "seedance-2-mini"),
            // 行内注释7.3.1：视频编辑类（画质增强 / 字幕擦除 / 水印擦除 / 图片口播 /
            //             改口型 / 厂家介绍视频）统一走 wan3.0-video ——
            //             它是当前 key 唯一支持多模态参考（reference_images / video_list /
            //             audio_with_roles）的视频模型。
            Map.entry("video.process.enhance", "wan3.0-video"),
            Map.entry("video.erase.subtitle", "wan3.0-video"),
            Map.entry("video.erase.watermark", "wan3.0-video"),
            Map.entry("image-speak.30s", "wan3.0-video"),
            Map.entry("image-speak.60s", "wan3.0-video"),
            Map.entry("image-speak.60s.light", "wan3.0-video"),
            Map.entry("lipsync.volc.1min", "wan3.0-video"),
            Map.entry("factory-video.60s", "wan3.0-video"),
            Map.entry("factory-video.60s.light", "wan3.0-video"),
            Map.entry("doubao-tts-2.0", "doubao-tts-2.0"));

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
    /** 行内注释5.2：产物登记 —— 生成成功后把 URL 落成 source=ai 的资产。 */
    private final com.xin.ai.domain.service.AssetService assets;

    public TaskExecutor(DataStore store, TaskOrchestrator tasks,
            @Qualifier("relayAdapter") RelayAdapter adapter,
            RelayConfigService relayConfig,
            ChannelRouter router,
            RedisTokenBucket tokenBucket,
            UpstreamParamBuilder paramBuilder,
            com.xin.ai.domain.service.AssetService assets) {
        this.store = store;
        this.tasks = tasks;
        this.adapter = adapter;
        this.relayConfig = relayConfig;
        this.router = router;
        this.tokenBucket = tokenBucket;
        this.paramBuilder = paramBuilder;
        this.assets = assets;
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
        // 行内注释3.3.1：终结态任务不再执行 —— 取消/已完成/已失败的任务再跑一次
        //                 会拿已经结算或退回的额度再动一次账。
        String status = Rows.str(task, "status", "");
        if ("succeeded".equals(status) || "failed".equals(status) || "canceled".equals(status)) {
            return tasks.get(Rows.str(task, "user_id"), taskId);
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
            List<String> urls = listOfUrls(polled.raw().get("result_urls"));
            result.put("result_urls", urls);
            result.put("type", polled.raw().getOrDefault("type", ""));
            result.put("billing", polled.raw().getOrDefault("billing", Map.of()));
            result.put("channel_id", used.channelId());
            result.put("channel_name", used.channelName());
            // 行内注释5.2：产物落资产库 —— 生成成功后把 URL 登记为 source=ai 的资产，
            //   这样资产页「AI生成的」筛选才有数据、用户能直接复用刚生成的素材，
            //   发现流也有真实作品源。此前这里只存了一串裸 URL。
            result.put("assets", registerAssets(task, urls));
            tasks.markSucceeded(taskId, result);
        } else {
            tasks.markFailed(taskId, polled.errorCode(),
                    polled.errorMessage() == null ? "上游生成失败" : polled.errorMessage());
        }
        return tasks.get(Rows.str(task, "user_id"), taskId);
    }

    /** 结果 URL 列表 —— 上游可能返回 List<String> 或逗号分隔串。 */
    private List<String> listOfUrls(Object raw) {
        if (raw instanceof List<?> list) {
            List<String> out = new ArrayList<>();
            for (Object o : list) {
                if (o != null && !String.valueOf(o).isBlank()) {
                    out.add(String.valueOf(o));
                }
            }
            return out;
        }
        if (raw instanceof String s && !s.isBlank()) {
            return List.of(s);
        }
        return List.of();
    }

    /**
     * 登记产物到资产库。
     * 行内注释5.3：登记失败不阻断任务结算 ——
     *   上游已经生成成功，积分该扣就扣；资产登记只是附带动作，
     *   失败只记日志，不能把一次成功生成变成失败（更不能吞掉退款逻辑）。
     */
    private List<Map<String, Object>> registerAssets(Map<String, Object> task, List<String> urls) {
        if (urls.isEmpty() || assets == null) {
            return List.of();
        }
        try {
            String userId = Rows.str(task, "user_id", "");
            String title = Rows.str(task, "title", "生成结果");
            String kind = kindOf(Rows.str(task, "model_key", ""));
            return assets.registerGenerated(userId, Rows.str(task, "id", ""), title, kind, urls);
        } catch (Exception e) {
            log.warn("登记生成产物到资产库失败 task={} err={}", Rows.str(task, "id", ""), e.getMessage());
            return List.of();
        }
    }

    /** model_key → 资产类型 —— 决定资产库里这条记录是图片还是视频。 */
    private String kindOf(String modelKey) {
        if (modelKey.startsWith("video") || modelKey.startsWith("factory")
                || modelKey.startsWith("lipsync") || modelKey.startsWith("image-speak")) {
            return "video";
        }
        if (modelKey.startsWith("doubao-tts")) {
            return "audio";
        }
        return "image";
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
