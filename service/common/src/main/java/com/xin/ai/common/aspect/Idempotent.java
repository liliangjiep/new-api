package com.xin.ai.common.aspect;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * M2-07 幂等注解：写操作防重放。
 * 行内注释1：key 由 spel + Idempotency-Key 头二选一，DB 唯一索引兜底。
 * 行内注释2：Handler 层跨服务编排时，幂等键贯穿全部通道尝试。
 * TODO(API): 切面实现待 M3 任务提交时补齐，此处先定注解口径。
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Idempotent {
    // 行内注释3：幂等键表达式，默认取请求头的 Idempotency-Key。
    String key() default "#idempotencyKey";
    // 行内注释4：过期秒数，默认 24h，与 task_idempotency 表 TTL 对齐。
    long expireSeconds() default 86400;
}
