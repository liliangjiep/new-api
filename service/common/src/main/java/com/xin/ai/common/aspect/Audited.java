package com.xin.ai.common.aspect;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * M2-08 审计注解：写操作记操作人/前后值/理由。
 * 行内注释1：改价与切通道强制要求 reason 参数，切面做非空校验。
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Audited {
    String action();
    boolean requireReason() default false;
}
