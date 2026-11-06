package com.xin.ai.common.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 统一响应包装（与前端 apps/web/src/lib/api.ts 的 ApiResponse 同构）。
 * 行内注释1：JSON 字段名为 request_id（前端 read 返回 payload.data）。
 * 行内注释2：record 不可变，适合响应 DTO。
 */
public record ApiResponse<T>(
        T data,
        @JsonProperty("request_id") String requestId) {

    public static <T> ApiResponse<T> ok(T data, String requestId) {
        return new ApiResponse<>(data, requestId);
    }
}
