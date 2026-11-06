package com.xin.ai.api.web;

import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.dto.PageResult;
import java.util.List;
import org.slf4j.MDC;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

/**
 * 控制器基类：统一把返回值包成 {data, request_id}。
 * 行内注释1：request_id 取 MDC 中的 traceId，与响应头 X-Trace-Id 一致。
 * 行内注释2：分页列表用 list() 输出 {data:[...], pagination:{...}}，与前端 Paginated 同构。
 */
public abstract class BaseController {

    protected static final String TRACE_KEY = "traceId";

    protected <T> ApiResponse<T> ok(T data) {
        return ApiResponse.ok(data, traceId());
    }

    protected <T> ApiResponse<T> ok() {
        return ApiResponse.ok(null, traceId());
    }

    protected <T> ApiResponse<List<T>> list(List<T> items) {
        return ApiResponse.ok(items, traceId());
    }

    protected <T> ApiResponse<PageResult<T>> page(List<T> items, int page, int pageSize, long total) {
        return ApiResponse.ok(PageResult.of(items, page, pageSize, total), traceId());
    }

    // 行内注释3：traceId 兜底 —— 非 Web 线程（如异步任务）没有 MDC 时回落到请求属性或生成新的。
    private String traceId() {
        String id = MDC.get(TRACE_KEY);
        if (id != null) {
            return id;
        }
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            Object v = attrs.getAttribute(TRACE_KEY, RequestAttributes.SCOPE_REQUEST);
            if (v != null) {
                return String.valueOf(v);
            }
        }
        return java.util.UUID.randomUUID().toString().replace("-", "");
    }
}
