package com.xin.ai.common.cache;

import java.time.Duration;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Redis 服务 —— 验证码 / 会话 / 幂等键 / 目录缓存的统一入口。
 * 行内注释1：Redis 不可用时自动降级到进程内 ConcurrentHashMap —— 本机 Redis 挂了也不能让业务停摆。
 * 行内注释2：这是「本地 Redis」的接入点（127.0.0.1:6379），配置见 application.yml 的 spring.data.redis。
 * 行内注释3：幂等键是这里最重要的用途 —— 多实例部署时防止同一请求被重复扣费。
 */
public class RedisService {

    private static final Logger log = LoggerFactory.getLogger(RedisService.class);

    private final StringRedisTemplate redis;

    /** 降级用的本地存储（Redis 不可用时）。 */
    private final java.util.concurrent.ConcurrentHashMap<String, Entry> local =
            new java.util.concurrent.ConcurrentHashMap<>();
    /** 降级标记 —— 一旦 Redis 报错就置位，后续直接走本地。 */
    private volatile boolean degraded = false;

    public RedisService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    /** 写字符串，带 TTL。 */
    public void set(String key, String value, Duration ttl) {
        if (degraded) {
            local.put(key, new Entry(value, System.currentTimeMillis() + ttl.toMillis()));
            return;
        }
        try {
            redis.opsForValue().set(key, value, ttl);
        } catch (Exception e) {
            degrade(e);
            local.put(key, new Entry(value, System.currentTimeMillis() + ttl.toMillis()));
        }
    }

    /** 读字符串。 */
    public String get(String key) {
        if (degraded) {
            Entry e = local.get(key);
            if (e == null) {
                return null;
            }
            if (e.expireAt < System.currentTimeMillis()) {
                local.remove(key);
                return null;
            }
            return e.value;
        }
        try {
            return redis.opsForValue().get(key);
        } catch (Exception ex) {
            degrade(ex);
            Entry fallback = local.get(key);
            return fallback == null || fallback.expireAt < System.currentTimeMillis() ? null : fallback.value;
        }
    }

    /** 删除键。 */
    public void delete(String key) {
        local.remove(key);
        if (degraded) {
            return;
        }
        try {
            redis.delete(key);
        } catch (Exception e) {
            degrade(e);
        }
    }

    /**
     * SET NX —— 分布式幂等的原子操作。
     * 行内注释4：返回 true 表示「本次成功占用」，false 表示「已被别人占用」。
     */
    public boolean setIfAbsent(String key, String value, Duration ttl) {
        if (degraded) {
            Entry e = local.get(key);
            if (e != null && e.expireAt > System.currentTimeMillis()) {
                return false;
            }
            local.put(key, new Entry(value, System.currentTimeMillis() + ttl.toMillis()));
            return true;
        }
        try {
            Boolean ok = redis.opsForValue().setIfAbsent(key, value, ttl);
            return Boolean.TRUE.equals(ok);
        } catch (Exception ex) {
            degrade(ex);
            Entry fallback = local.get(key);
            if (fallback != null && fallback.expireAt > System.currentTimeMillis()) {
                return false;
            }
            local.put(key, new Entry(value, System.currentTimeMillis() + ttl.toMillis()));
            return true;
        }
    }

    /** 计数器自增 —— 限流用。 */
    public long increment(String key, Duration ttl) {
        if (degraded) {
            Entry e = local.get(key);
            long cur = 0;
            if (e != null && e.expireAt > System.currentTimeMillis()) {
                try {
                    cur = Long.parseLong(e.value);
                } catch (NumberFormatException ignored) {
                    cur = 0;
                }
            }
            cur = cur + 1;
            local.put(key, new Entry(String.valueOf(cur), System.currentTimeMillis() + ttl.toMillis()));
            return cur;
        }
        try {
            Long v = redis.opsForValue().increment(key);
            if (v != null && v == 1L) {
                redis.expire(key, ttl);
            }
            return v == null ? 0 : v;
        } catch (Exception e) {
            degrade(e);
            return 0;
        }
    }

    /** 读缓存，未命中则回源并写回。 */
    public String getOrLoad(String key, Duration ttl, Supplier<String> loader) {
        String hit = get(key);
        if (hit != null) {
            return hit;
        }
        String loaded = loader.get();
        if (loaded != null) {
            set(key, loaded, ttl);
        }
        return loaded;
    }

    /** 当前是否处于降级状态 —— 后台健康面板展示。 */
    public boolean degraded() {
        return degraded;
    }

    private void degrade(Exception e) {
        if (!degraded) {
            log.warn("Redis 不可用，降级到本地内存缓存: {}", e.getMessage());
        }
        degraded = true;
    }

    /** 本地降级条目。 */
    private record Entry(String value, long expireAt) {}
}
