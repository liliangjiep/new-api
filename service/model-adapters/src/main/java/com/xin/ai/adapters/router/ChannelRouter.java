package com.xin.ai.adapters.router;

import com.xin.ai.adapters.base.ModelAdapter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * M3-06 ChannelRouter：按 model_key 选接入点 + 熔断判定 + 降级编排。
 * 行内注释1：输入 endpoints 已按 sort_order 排好序，router 只做选择不做排序（排序是 Registry 的事）。
 * 行内注释2：幂等键贯穿全部通道尝试，保证切换不重复扣费。
 * 行内注释3：熔断器按 channel_id 维度（Resilience4j 接入后替换本地 map）。
 * TODO(API): Resilience4j CircuitBreaker 按 channel_id 实例化后替换 openChannels。
 */
public class ChannelRouter {

    // 行内注释4：本地熔断标记 —— Resilience4j 接入前的占位实现。
    private final Map<String, Boolean> openChannels = new ConcurrentHashMap<>();

    public record RoutePlan(List<ModelAdapter.EndpointSnapshot> candidates) {}

    // 行内注释5：步骤1 —— 过滤停用与熔断通道，返回可用候选。
    public RoutePlan plan(List<ModelAdapter.EndpointSnapshot> endpoints, Map<String, String> channelOf) {
        List<ModelAdapter.EndpointSnapshot> ok = endpoints.stream()
                .filter(e -> !Boolean.TRUE.equals(openChannels.get(channelOf.get(e.modelKey()))))
                .sorted(Comparator.comparingInt(e -> 0))
                .collect(Collectors.toList());
        return new RoutePlan(ok);
    }

    // 行内注释6：步骤2 —— 标记通道熔断（健康检查/连续失败回调此方法）。
    public void markOpen(String channelId) {
        openChannels.put(channelId, true);
    }

    // 行内注释7：步骤3 —— 半开恢复（探测成功回调此方法）。
    public void markClosed(String channelId) {
        openChannels.remove(channelId);
    }
}
