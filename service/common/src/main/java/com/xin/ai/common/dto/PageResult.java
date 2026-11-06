package com.xin.ai.common.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * 分页包装（与前端 Paginated 同构）：{data:[...], pagination:{page,page_size,total}}。
 * 行内注释1：page 从 1 起，前端 Pagination 组件同口径。
 */
public record PageResult<T>(
        List<T> data,
        Pagination pagination) {

    public static <T> PageResult<T> of(List<T> data, int page, int pageSize, long total) {
        return new PageResult<>(data, new Pagination(page, pageSize, total));
    }

    public record Pagination(
            int page,
            @JsonProperty("page_size") int pageSize,
            long total) {}
}
