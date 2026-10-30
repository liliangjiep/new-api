package com.xin.ai.common.cache;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.util.function.Supplier;

/**
 * M2-04 三级缓存：本地 Caffeine → Redis → DB。
 * 行内注释1：读顺序 L1→L2→loader(DB)，写时三级一起失效，保证一致性。
 * 行内注释2：L1 只做读加速，TTL 短（60s），避免脏读窗口过大。
 * 行内注释3：L2 Redis 为准，配置变更经 RTopic 广播主动失效。
 * TODO(API): Redis 模板接入后补 L2 实现，当前 L1+loader 可独立跑通。
 */
public class TieredCache<K, V> {

    private final Cache<K, V> l1;

    public TieredCache(long l1MaxSize, Duration l1Ttl) {
        this.l1 = Caffeine.newBuilder()
                .maximumSize(l1MaxSize)
                .expireAfterWrite(l1Ttl)
                .build();
    }

    // 行内注释4：get 三步 —— 1查 L1命中直接返，2查 L2（占位），3回源并回填。
    public V get(K key, Supplier<V> loader) {
        V hit = l1.getIfPresent(key);
        if (hit != null) {
            return hit;
        }
        // 行内注释5：L2 查询占位 —— Redis 接入后在此加 redisson.getBucket。
        V loaded = loader.get();
        if (loaded != null) {
            l1.put(key, loaded);
        }
        return loaded;
    }

    // 行内注释6：失效必须清 L1，L2 失效由广播监听器另行处理。
    public void invalidate(K key) {
        l1.invalidate(key);
    }

    public void invalidateAll() {
        l1.invalidateAll();
    }
}
