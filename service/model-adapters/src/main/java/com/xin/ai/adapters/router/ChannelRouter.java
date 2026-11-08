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
        CircuitState load(String channelId);

        /** 记一次成功。 */
        void onSuccess(String channelId);

        /** 记一次失败（传入累计失败次数、阈值、熔断到期时间戳）。 */
        void onFailure(String channelId, int consecutiveFailures, int threshold, long openUntilEpochMillis);
    }

    /**
     * 熔断状态值对象（带到期时间）。
     * 行内注释5.6：为什么要加「到期时间」——
     *             只有 state 没有到期时间时，落库的 open 是一个<b>无期限</b>标记：
     *             谁都不知道它什么时候该恢复。本地内存冷却期又只活在单进程里，
     *             重启就丢。带上 openUntil 之后，多实例共享的是同一条「到点恢复」的语义。
     */
    public record CircuitState(String state, int consecutiveFailures, long openUntilEpochMillis) {
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
    /**
     * 处于「半开探测」状态的站 —— 熔断已到期、正在放一个探测请求过去。
     * 行内注释5.7：探测期间该站只应有一个在途请求，避免冷却一到期就被并发打爆。
     */
    private final java.util.Set<String> probing = ConcurrentHashMap.newKeySet();
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
     *
     * <p>行内注释5.2：判定顺序 —— 先看内存冷却窗口（没到就是 open）；
     * 内存窗口过了再查落库状态：落库是 open 说明别的实例也把它熔断了，
     * 此时按落库的 {@code circuit_open_until} 到期时间判定。
     *
     * <p>行内注释5.2.1：此处曾经是<b>永久熔断</b>的根源 ——
     * 原实现只要落库状态是 open 就无条件执行
     * {@code openUntil.put(channelId, now + COOLDOWN_MS)} 并返回 true，
     * 而这个方法在每次任务路由时都会被调用，等于每调用一次就把冷却窗口往后推 60 秒，
     * 窗口永远不会到期 → 通道被熔断后再也回不来（实测 ch_toapis 熔断后所有生成任务
     * 全部 channel.all_failed，手工把 circuit_state 改回 closed 后任务立刻成功）。
     * 现在落库带明确的「熔断到期时间」，到点即半开放行一次探测，
     * 成功则关闸，失败则重新熔断并顺延窗口。
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
        // 行内注释5.3：落库状态 —— 多实例共享的熔断标记与到期时间。
        CircuitStore store = circuitStore;
        if (store != null) {
            CircuitState st = store.load(channelId);
            if (st != null && st.isOpen()) {
                long persistedUntil = st.openUntilEpochMillis();
                // 行内注释5.2.2：落库还没写到期时间（老数据 / 手工改库）——
                //             当场开一个完整窗口，避免放行一个刚熔断的站。
                if (persistedUntil <= 0L) {
                    persistedUntil = now + COOLDOWN_MS;
                }
                if (now < persistedUntil) {
                    openUntil.put(channelId, persistedUntil);
                    return true;
                }
                // 行内注释5.2.3：落库熔断已到期 —— 半开，放一个探测请求过去。
                //             成功 → recordSuccess 落库 closed；
                //             失败 → recordFailure 重新落库 open 并顺延窗口。
                // 行内注释5.2.4：add 返回 false 说明已有一个探测在途 ——
                //             本次跳过该站，避免冷却一到期就被并发打爆。
                if (!probing.add(channelId)) {
                    return true;
                }
                return false;
            }
        }
        if (until != null) {
            // 行内注释5.5：冷却到期 —— 半开，清掉熔断标记让下一次尝试重新探测。
            openUntil.remove(channelId);
        }
        return false;
    }

    /**
     * 记录一次成功 —— 熔断计数清零，标记为 sticky 首选站。
     */
    public void recordSuccess(String channelId) {
        if (channelId == null) {
            return;
        }
        failures.remove(channelId);
        openUntil.remove(channelId);
        probing.remove(channelId);
        lastGood.put(channelId, System.currentTimeMillis());
        CircuitStore store = circuitStore;
        if (store != null) {
            store.onSuccess(channelId);
        }
    }

    /**
     * 记录一次失败 —— 连续失败达阈值则熔断该站。
     *
     * <p>行内注释5.8：半开探测失败时必须<b>重新熔断</b>，而不是从失败计数 1 重来 ——
     * 探测前失败计数已经被清掉了（否则计数会无限增长），
     * 若按普通失败处理，计数变成 1 < 阈值，坏站就退出熔断状态被反复放行。
     * 这里用 probing 标记识别「这次失败来自半开探测」，直接续熔并顺延窗口。
     */
    public void recordFailure(String channelId) {
        if (channelId == null) {
            return;
        }
        // 行内注释5.8.1：取出并清除探测标记 —— 这次失败是不是半开探测打回来的。
        boolean fromProbe = probing.remove(channelId);
        int count = failures.computeIfAbsent(channelId, k -> new AtomicInteger()).incrementAndGet();
        long openUntilTs = 0L;
        if (fromProbe || count >= FAILURE_THRESHOLD) {
            openUntilTs = System.currentTimeMillis() + COOLDOWN_MS;
            openUntil.put(channelId, openUntilTs);
            failures.remove(channelId);
        }
        CircuitStore store = circuitStore;
        if (store != null) {
            store.onFailure(channelId, count, FAILURE_THRESHOLD, openUntilTs);
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
            CircuitState st = store.load(channelId);
            if (st != null) {
                m.put("circuit_state", st.state());
                m.put("persisted_failures", st.consecutiveFailures());
                // 行内注释5.9：熔断到期时间（毫秒）—— 0 表示未熔断。
                //             后台据此显示「还有 N 秒自动恢复」。
                m.put("circuit_open_until", st.openUntilEpochMillis());
            }
        }
        return m;
    }
}
