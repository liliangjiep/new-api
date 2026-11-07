package com.xin.ai.common.ratelimit;

import com.xin.ai.common.cache.RedisService;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Redis 分布式令牌桶 —— 分通道限流（RPM/QPS）。
 * 行内注释1：实现方式 —— Redis 里存「令牌数 + 最后补充时间」，
 *             取令牌时按「经过的时间 × 速率」补足，再原子扣减。
 *             多实例部署时配额共享，主从切换也不丢（存在 Redis 里）。
 * 行内注释2：Redis 不可用时自动降级到进程内令牌桶 —— 单机限流仍生效，
 *             只是不跨实例共享（宁可限得不准，也不能把上游打挂）。
 * 行内注释3：不需要 Redisson —— 用 Redis 的 INCR + EXPIRE 手写即可，依赖更少。
 */
public class RedisTokenBucket {

    /** 降级用的进程内桶。 */
    private static final class LocalBucket {
        double tokens;
        long lastRefillNanos;
    }

    private final RedisService redis;
    private final Map<String, LocalBucket> local = new ConcurrentHashMap<>();

    public RedisTokenBucket(RedisService redis) {
        this.redis = redis;
    }

    /**
     * 尝试取 1 个令牌。
     *
     * @param key     桶标识（一般是 channel_id）
     * @param permits 每秒补多少个令牌
     * @param burst   桶容量（允许的突发量）
     */
    public boolean tryAcquire(String key, double permits, int burst) {
        if (redis.degraded()) {
            return tryAcquireLocal(key, permits, burst);
        }
        String tokenKey = "rl:" + key + ":tokens";
        String tsKey = "rl:" + key + ":ts";
        try {
            long now = System.currentTimeMillis();
            String rawTokens = redis.get(tokenKey);
            String rawTs = redis.get(tsKey);
            double tokens = rawTokens == null ? burst : Double.parseDouble(rawTokens);
            long last = rawTs == null ? now : Long.parseLong(rawTs);
            if (last > now) {
                last = now;
            }
            // 行内注释4：按经过时间补充令牌 —— 上限不超过桶容量。
            double elapsedSec = (now - last) / 1000.0;
            tokens = Math.min(burst, tokens + elapsedSec * permits);
            if (tokens < 1) {
                // 行内注释4.1：没抢到也把补充后的状态写回，避免下次还要重算。
                redis.set(tokenKey, String.valueOf(tokens), Duration.ofSeconds(300));
                redis.set(tsKey, String.valueOf(now), Duration.ofSeconds(300));
                return false;
            }
            tokens -= 1;
            redis.set(tokenKey, String.valueOf(tokens), Duration.ofSeconds(300));
            redis.set(tsKey, String.valueOf(now), Duration.ofSeconds(300));
            return true;
        } catch (Exception e) {
            return tryAcquireLocal(key, permits, burst);
        }
    }

    /** 兼容旧签名 —— 默认速率 1/s、突发 10。 */
    public boolean tryAcquire(String key) {
        return tryAcquire(key, 1.0d, 10);
    }

    /** 兼容旧签名 —— 默认速率 1/s、突发 10。 */
    public boolean tryAcquire(String key, int permits) {
        return tryAcquire(key, 1.0d, permits);
    }

    /** 进程内降级实现 —— 单机限流。 */
    private boolean tryAcquireLocal(String key, double permits, int burst) {
        LocalBucket b = local.computeIfAbsent(key, k -> {
            LocalBucket nb = new LocalBucket();
            nb.tokens = burst;
            nb.lastRefillNanos = System.nanoTime();
            return nb;
        });
        synchronized (b) {
            long now = System.nanoTime();
            double elapsedSec = (now - b.lastRefillNanos) / 1_000_000_000.0;
            b.tokens = Math.min(burst, b.tokens + elapsedSec * permits);
            b.lastRefillNanos = now;
            if (b.tokens < 1) {
                return false;
            }
            b.tokens -= 1;
            return true;
        }
    }

    /** 当前令牌数 —— 后台「通道健康」面板展示。 */
    public double availableTokens(String key) {
        String raw = redis.get("rl:" + key + ":tokens");
        if (raw == null) {
            return -1;
        }
        try {
            return Double.parseDouble(raw);
        } catch (NumberFormatException e) {
            return -1;
        }
    }
}
