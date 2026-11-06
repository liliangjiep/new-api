package com.xin.ai.common.security;

import java.util.Map;

/**
 * 当前登录用户上下文：由 JwtAuthFilter 注入 ThreadLocal。
 * 行内注释1：Controller 用 @CurrentUser 注解取此对象，避免到处传参。
 * 行内注释2：userId/role/loginVersion 三元组，loginVersion 用于强制下线校验。
 */
public final class AuthContext {

    private AuthContext() {}

    public record Principal(
            String userId,
            String phone,
            String role,
            int loginVersion,
            Map<String, Object> claims) {}

    private static final ThreadLocal<Principal> HOLDER = new ThreadLocal<>();

    public static void set(Principal principal) {
        HOLDER.set(principal);
    }

    public static Principal get() {
        return HOLDER.get();
    }

    // 行内注释3：未登录时返回 null，由 @CurrentUser 或 Service 自行判断。
    public static Principal require() {
        Principal p = HOLDER.get();
        if (p == null) {
            throw new com.xin.ai.common.exception.BizException(
                    com.xin.ai.common.exception.ErrorCode.AUTH_UNAUTHORIZED);
        }
        return p;
    }

    public static void clear() {
        HOLDER.remove();
    }
}
