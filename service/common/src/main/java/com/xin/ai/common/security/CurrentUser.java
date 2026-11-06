package com.xin.ai.common.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 注入当前登录用户：Controller 参数用 @CurrentUser AuthContext.Principal。
 * 行内注释1：未登录直接抛 401，由 GlobalExceptionHandler 统一转错误体。
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUser {}
