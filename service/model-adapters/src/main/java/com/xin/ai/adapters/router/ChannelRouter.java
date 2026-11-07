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
 * 行内注释5：熔断状态通过 CircuitStore 落库（model_channels.circuit_state）——
 *             多实例部署时各实例看到同一份状态，不会各自以为对方还活着。
 *             冷却到期时间仍在内存（运行时状态，无需跨实例）。
 */
public class ChannelRouter {

    /** 连续失败达此数即熔断。 */
    private static final int FAILURE_THRESHOLD = 3;
    /** 熔断后冷却毫秒。 */
    private static final long COOLDOWN_MS = 60_000L;

    /** 熔断状态持久化接口 —— 由 domain 层用 JdbcTemplate 实现。 */
    public interface CircuitStore {
        /** 读熔断状态；返回 null 表示没记录。 */
        State load(String channelId);

        /** 记一次成功。 */
        void onSuccess(String channelId);

        /** 记一次失败（传入累计失败次数与阈值）。 */
        void onFailure(String channelId, int consecutiveFailures, int threshold);
    }

    /** 熔断状态值对象。 */
    public record State(String state, int consecutiveFailures) {
        public boolean isOpen() {
            return "open".equalsIgnoreCase(state);
        }
    }

    /** 候选计划 —— 按回退顺序排好的接入点列表。 */
    public record RoutePlan(List<ModelAdapter.EndpointSnapshot> candidates) {}

    /** 回退尝试的完整结果，含每一跳的成败明细（供审计与后台排障）。 */
    public record Attempt(String channelId, String channelName, boolean ok, String errorCode, String errorMessage) {}

    /** 回退执行的最终结果。 */
    public record FallbackResult(
            boolean ok,
            ModelAdapter.EndpointSnapshot used,
            String upstreamTaskId,
            Map<String, Object> raw,
            String errorCode,
            String errorMessage,
            List<Attempt> attempts) {}

    /** channel_id → 连续失败计数（内存）。 */
    private final Map<String, AtomicInteger> failures = new ConcurrentHashMap<>();
    /** channel_id → 熔断到期时间戳。 */
    private final Map<String, Long> openUntil = new ConcurrentHashMap<>();
    /** channel_id → 最近一次成功的站（sticky 优先）。 */
    private final Map<String, Long> lastGood = new ConcurrentHashMap<>();
    /** 熔断状态落库器 —— 可为空（纯内存模式）。 */
    private volatile CircuitStore circuitStore;

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

    /** 注入熔断状态落库器。 */
    public void setCircuitStore(CircuitStore store) {
        this.circuitStore = store;
    }

    public void markOpen(String channelId) {
        openChannels.put(channelId, true);
    }

    public void markClosed(String channelId) {
        openChannels.remove(channelId);
    }

    /**
     * 该站当前是否处于熔断冷却期。
     * 行内注释5.2：判定顺序 —— 先看内存冷却到期（没到就是 open），
     *             到了再查落库状态：落库是 open 说明别的实例也把它熔断了，继续等；
     *             落库是 closed 说明半开探测时机到了，清计数放行。
     */
    public boolean isOpen(String channelId) {
        if (channelId == null) {
            return false;
        }
        Long until = openUntil.get(channelId);
        long now = System.currentTimeMillis();
        if (until != null && now <= until) {
            return true;
        }
        // 行内注释5.3：落库状态 —— 多实例共享的熔断标记。
        CircuitStore store = circuitStore;
        if (store != null) {
            State st = store.load(channelId);
            if (st != null && st.isOpen()) {
                // 行内注释5.4：落库说 open 但本地冷却已过 —— 说明是别的实例熔断的，
                //             继续按冷却时长等，避免所有实例同时猛打一个坏站。
                openUntil.put(channelId, now + COOLDOWN_MS);
                return true;
            }
        }
        if (until != null) {
            // 行内注释5.5：冷却到期 —— 半开，清掉熔断标记让下一次尝试重新探测。
            openUntil.remove(channelId);
            failures.remove(channelId);
        }
        return false;
    }

    /** 记录一次成功 —— 熔断计数清零，标记为 sticky 首选站。 */
    public void recordSuccess(String channelId) {
        if (channelId == null) {
            return;
        }
        failures.remove(channelId);
        openUntil.remove(channelId);
        lastGood.put(channelId, System.currentTimeMillis());
        CircuitStore store = circuitStore;
        if (store != null) {
            store.onSuccess(channelId);
        }
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
        CircuitStore store = circuitStore;
        if (store != null) {
            store.onFailure(channelId, count, FAILURE_THRESHOLD);
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
        CircuitStore store = circuitStore;
        if (store != null) {
            State st = store.load(channelId);
            if (st != null) {
                m.put("circuit_state", st.state());
                m.put("persisted_failures", st.consecutiveFailures());
            }
        }
        return m;
    }
}
