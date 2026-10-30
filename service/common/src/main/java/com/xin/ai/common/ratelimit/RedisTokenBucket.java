package com.xin.ai.common.ratelimit;

/**
 * M2-05 Redis 分布式令牌桶（占位）。
 * 行内注释1：本地版 LocalTokenBucket 用于单机兜底，分布式版按 channel_id 分实例。
 * 行内注释2：实现用 Redisson RRateLimiter，permit 存储在 Redis，主从切换不丢配额。
 * TODO(API): Redisson 接入后实现 tryAcquire，直接替换本地调用点。
 */
public class RedisTokenBucket {

    // 行内注释3：先占位返回 true，保证 M1/M2 阶段可编译可跑，M3 再替换。
    public boolean tryAcquire(String key) {
        return true;
    }

    public boolean tryAcquire(String key, int permits) {
        return true;
    }
}
