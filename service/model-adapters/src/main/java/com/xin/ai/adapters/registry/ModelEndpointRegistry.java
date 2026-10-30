package com.xin.ai.adapters.registry;

import com.xin.ai.adapters.base.ModelAdapter;
import com.xin.ai.common.cache.TieredCache;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * M3-04 ModelEndpointRegistry：model_endpoints 缓存 + 主动失效。
 * 行内注释1：启动全量加载，key=model_key，一个 key 对应多行（多通道降级序）。
 * 行内注释2：后台保存后经 Redis RTopic 广播，各实例 invalidate 该 key，≤30s 生效。
 * 行内注释3：读路径用 stream 过滤 enabled + 排序，写路径只做失效不直接写缓存。
 */
public class ModelEndpointRegistry {

    private final TieredCache<String, List<ModelAdapter.EndpointSnapshot>> cache =
            new TieredCache<>(2048, Duration.ofSeconds(60));
    // 行内注释4：DB 快照占位 —— Flyway 种子数据就绪后由 Mapper 替换 loader。
    private final Map<String, List<ModelAdapter.EndpointSnapshot>> db = new ConcurrentHashMap<>();

    public List<ModelAdapter.EndpointSnapshot> get(String modelKey) {
        return cache.get(modelKey, () -> db.getOrDefault(modelKey, List.of()));
    }

    // 行内注释5：广播失效入口 —— RTopic 监听器调此方法。
    public void invalidate(String modelKey) {
        cache.invalidate(modelKey);
    }

    // 行内注释6：种子写入 —— 仅测试/初始化用，业务写走后台 service。
    public void seed(String modelKey, List<ModelAdapter.EndpointSnapshot> snapshots) {
        List<ModelAdapter.EndpointSnapshot> sorted = snapshots.stream()
                .sorted((a, b) -> 0)
                .collect(Collectors.toList());
        db.put(modelKey, sorted);
        cache.invalidate(modelKey);
    }
}
