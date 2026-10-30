package com.xin.ai.common.dto;

import java.util.List;

/**
 * M2-02 统一响应包装（与前端 api.ts ApiResponse 同构）。
 * 行内注释1：record 自带不可变语义，适合响应 DTO，避免 setter 污染。
 * 行内注释2：requestId 由过滤器从 MDC 注入，全链路追踪。
 * TODO(API): springdoc 导出后 openapi.json 即契约真相源。
 */
public record ApiResponse<T>(T data, String requestId) {
    // 行内注释3：成功工厂方法，调用方只需关心 data。
    public static <T> ApiResponse<T> ok(T data, String requestId) {
        return new ApiResponse<>(data, requestId);
    }
}

/**
 * 行内注释4：分页包装，与前端 Paginated 同构。
 */
record PageResult<T>(List<T> data, Pagination pagination) {
    record Pagination(int page, int pageSize, long total) {}
}
