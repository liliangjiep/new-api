package com.xin.ai.adapters.router;

import com.xin.ai.adapters.base.ModelAdapter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * M3-06 ChannelRouter：多中转站回退编排 —— 「这个站不行立刻切下一个」。
 * 行内注释1：核心策略 —— 按 sort_order 依次尝试候选接入点，
 *             遇到可回退错误（限流/上游故障/网络异常/未配置）立即换下一站，不等超时。
 * 行内注释2：不可回退错误（4xx 参数错误）直接终止 —— 换站也是错，白白消耗上游额度。
 * 行内注释3：熔断器按 channel_id 维度，连续失败达阈值即把该站标记 open，后续请求直接跳过。
 * 行内注释4：成功则把该站记为 lastGood，熔断恢复时优先选它（sticky 策略，减少抖动）。
 * TODO(API): Resilience4j CircuitBreaker 接入后替换本地计数器，语义保持不变。
 */
public class ChannelRouter {

    /** 连续失败达此数即熔断。 */
    private static final int FAILURE_THRESHOLD = 3;
    /** 熔断后冷却毫秒。 */
    private static final long COOLDOWN_MS = 60_000L;

    /** channel_id → 连续失败计数。 */
    private final Map<String, AtomicInteger> failures = new ConcurrentHashMap<>();
    /** channel_id → 熔断到期时间戳。 */
    private final Map<String, Long> openUntil = new ConcurrentHashMap<>();
    /** channel_id → 最近一次成功的站（sticky 优先）。 */
    private final Map<String, Long> lastGood = new ConcurrentHashMap<>();

    public record RoutePlan(List<ModelAdapter.EndpointSnapshot> candidates) {}

    /** 回退尝试的完整结果，含每一跳的成败明细（供审计与后台排障）。 */
    public record Attempt(String channelId, String channelName, boolean ok, String errorCode, String errorMessage) {}

    public record FallbackResult(
            boolean ok,
            ModelAdapter.EndpointSnapshot used,
            String upstreamTaskId,
            Map<String, Object> raw,
            String errorCode,
            String errorMessage,
            List<Attempt> attempts) {}

    /**
     * 生成候选计划 —— 过滤停用/熔断通道，按 sort_order 升序，健康的 sticky 站提到最前。
     */
    public RoutePlan plan(List<ModelAdapter.EndpointSnapshot> endpoints, Map<String, String> channelOf) {
        List<ModelAdapter.EndpointSnapshot> ok = endpoints.stream()
                // 行内注释5.1：channelOf 允许为空 Map —— 此时 key 映射取不到值是正常的，
                //             不能用 null 去查 ConcurrentHashMap（会 NPE）。
                .filter(e -> {
                    String legacyKey = channelOf == null ? null : channelOf.get(e.modelKey());
                    return !Boolean.TRUE.equals(openChannels.get(legacyKey == null ? "" : legacyKey));
                })
                .filter(e -> !isOpen(e.channelId()))
                .sorted((a, b) -> {
                    // 行内注释5：sticky 优先 —— 最近成功的站排最前，其余按 sort_order。
                    boolean aGood = a.channelId() != null && lastGood.containsKey(a.channelId());
                    boolean bGood = b.channelId() != null && lastGood.containsKey(b.channelId());
                    if (aGood != bGood) {
                        return aGood ? -1 : 1;
                    }
                    return Integer.compare(a.sortOrder(), b.sortOrder());
                })
                .toList();
        return new RoutePlan(ok);
    }

    /** 兼容旧逻辑的熔断标记表。 */
    private final Map<String, Boolean> openChannels = new ConcurrentHashMap<>();

    public void markOpen(String channelId) {
        openChannels.put(channelId, true);
    }

    public void markClosed(String channelId) {
        openChannels.remove(channelId);
    }

    /** 该站当前是否处于熔断冷却期。 */
    public boolean isOpen(String channelId) {
        if (channelId == null) {
            return false;
        }
        Long until = openUntil.get(channelId);
        if (until == null) {
            return false;
        }
        if (System.currentTimeMillis() > until) {
            // 行内注释6：冷却到期 —— 半开，清掉熔断标记让下一次尝试重新探测。
            openUntil.remove(channelId);
            failures.remove(channelId);
            return false;
        }
        return true;
    }

    /** 记录一次成功 —— 熔断计数清零，标记为 sticky 首选站。 */
    public void recordSuccess(String channelId) {
        if (channelId == null) {
            return;
        }
        failures.remove(channelId);
        openUntil.remove(channelId);
        lastGood.put(channelId, System.currentTimeMillis());
    }

    /**
     * 记录一次失败 —— 连续失败达阈值则熔断该站。
     */
    public void recordFailure(String channelId) {
        if (channelId == null) {
            return;
        }
        int count = failures.computeIfAbsent(channelId, k -> new AtomicInteger()).incrementAndGet();
        if (count >= FAILURE_THRESHOLD) {
            openUntil.put(channelId, System.currentTimeMillis() + COOLDOWN_MS);
            failures.remove(channelId);
        }
    }

    /**
     * 判断某类错误是否允许回退到下一站。
     * 行内注释7：429 限流、5xx 上游故障、网络异常 → 回退；
     *             4xx 参数错误、鉴权失败 → 不回退（换站必然同样失败）。
     */
    public static boolean isFallbackable(String errorCode) {
        if (errorCode == null) {
            return false;
        }
        return switch (errorCode) {
            case "channel.rate_limited", "channel.upstream_error", "channel.request_failed",
                 "channel.not_configured", "channel.timeout" -> true;
            default -> false;
        };
    }

    /**
     * 执行带回退的提交 —— 逐个候选尝试，直到成功或遇到不可回退错误。
     * 行内注释8：submitter 是实际发起请求的回调，签名 (endpoint) → ModelResponse。
     */
    public FallbackResult submitWithFallback(
            List<ModelAdapter.EndpointSnapshot> candidates,
            java.util.function.Function<ModelAdapter.EndpointSnapshot, ModelAdapter.ModelResponse> submitter) {
        List<Attempt> attempts = new ArrayList<>();
        if (candidates.isEmpty()) {
            return new FallbackResult(false, null, null, Map.of(),
                    "channel.all_failed", "没有可用通道", attempts);
        }
        ModelAdapter.ModelResponse last = null;
        for (ModelAdapter.EndpointSnapshot ep : candidates) {
            ModelAdapter.ModelResponse res;
            try {
                res = submitter.apply(ep);
            } catch (Exception e) {
                res = new ModelAdapter.ModelResponse(false, null, Map.of(),
                        "channel.request_failed", "调用异常：" + e.getMessage());
            }
            if (res.ok()) {
                recordSuccess(ep.channelId());
                attempts.add(new Attempt(ep.channelId(), ep.channelName(), true, null, null));
                return new FallbackResult(true, ep, res.upstreamTaskId(), res.raw(), null, null, attempts);
            }
            recordFailure(ep.channelId());
            attempts.add(new Attempt(ep.channelId(), ep.channelName(), false,
                    res.errorCode(), res.errorMessage()));
            last = res;
            if (!isFallbackable(res.errorCode())) {
                // 行内注释9：不可回退 —— 直接失败，不再尝试后续站点。
                break;
            }
        }
        return new FallbackResult(false, null, null, Map.of(),
                last == null ? "channel.all_failed" : last.errorCode(),
                last == null ? "全部通道失败" : last.errorMessage(),
                attempts);
    }

    /** 通道状态快照 —— 后台「通道健康」面板用。 */
    public Map<String, Object> channelState(String channelId) {
        Map<String, Object> m = new LinkedHashMap<>();
        AtomicInteger f = failures.get(channelId);
        m.put("channel_id", channelId);
        m.put("consecutive_failures", f == null ? 0 : f.get());
        m.put("circuit_open", isOpen(channelId));
        m.put("sticky", lastGood.containsKey(channelId));
        return m;
    }
}
