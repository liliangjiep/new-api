package com.xin.ai.common.aspect;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * M2-07 分布式锁注解（Redis 实现）。
 * 行内注释1：key 支持 SpEL，锁粒度由调用方定 —— 通道级/用户级/任务级。
 * 行内注释2：watchdog 自动续期逻辑在切面里做，业务代码无感。
 * TODO(API): Redisson RLock 实现待 M3 积分冻结时补齐。
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface DistributedLock {
    // 行内注释3：锁 key 表达式，如 "channel:#channelId"。
    String key();
    // 行内注释4：等待与持有时间，默认等 3s 持 10s，超时即失败不排队。
    long waitSeconds() default 3;
    long leaseSeconds() default 10;
}
