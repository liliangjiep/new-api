package com.xin.ai.common.ratelimit;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * M2-05 本地令牌桶限流器（Guava-free 自研）。
 * 行内注释1：桶 = 容量 + 补充速率 + 上次补充时间，三元组缺一不可。
 * 行内注释2：用 CAS 自旋扣令牌，保证多线程下不超发。
 * 行内注释3：分布式版用 Redis（见 RedisTokenBucket，占位），本地版用于单机兜底。
 * 行内注释4：key 粒度由调用方定 —— 通道级 channel:{id} / 用户级 user:{id}。
 */
public class LocalTokenBucket {

    // 行内注释5：桶状态内聚为静态内部类，避免三个 map 不同步。
    private static class Bucket {
        final long capacity;      // 桶容量
        final long refillPerSec;  // 每秒补充令牌数
        final AtomicLong tokens;  // 当前令牌数
        volatile long lastRefillNanos; // 上次补充时间

        Bucket(long capacity, long refillPerSec) {
            this.capacity = capacity;
            this.refillPerSec = refillPerSec;
            this.tokens = new AtomicLong(capacity);
            this.lastRefillNanos = System.nanoTime();
        }
    }

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    // 行内注释6：懒加载桶 —— computeIfAbsent 保证同 key 单例。
    public void configure(String key, long capacity, long refillPerSec) {
        buckets.computeIfAbsent(key, k -> new Bucket(capacity, refillPerSec));
    }

    // 行内注释7：1获取前先补充（按流逝时间补），2CAS 扣减，3失败返回 false 由上层排队。
    public boolean tryAcquire(String key) {
        return tryAcquire(key, 1);
    }

    public boolean tryAcquire(String key, int permits) {
        Bucket b = buckets.get(key);
        if (b == null) {
            return true;
        }
        refill(b);
        while (true) {
            long cur = b.tokens.get();
            if (cur < permits) {
                return false;
            }
            if (b.tokens.compareAndSet(cur, cur - permits)) {
                return true;
            }
        }
    }

    // 行内注释8：补充用惰性算法 —— 只在取令牌时计算，避免后台线程空转。
    private void refill(Bucket b) {
        long now = System.nanoTime();
        long elapsed = now - b.lastRefillNanos;
        if (elapsed <= 0) {
            return;
        }
        long add = elapsed * b.refillPerSec / 1_000_000_000L;
        if (add <= 0) {
            return;
        }
        b.lastRefillNanos = now;
        b.tokens.updateAndGet(cur -> Math.min(b.capacity, cur + add));
    }
}
