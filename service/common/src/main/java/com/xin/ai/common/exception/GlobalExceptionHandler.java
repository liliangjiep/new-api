package com.xin.ai.common.exception;

import com.xin.ai.common.dto.ApiResponse;
import java.util.Map;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * M2-02 全局异常处理：BizException → 业务错误体，其余 → 兜底 500。
 * 行内注释1：traceId 从 MDC 取，与日志同源，前端可拿 request_id 报障。
 * 行内注释2：details 原样透出，但密钥类字段在 util 脱敏层已处理。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 行内注释3：业务异常分支 —— 状态码来自 ErrorCode，避免 controller 各自写。
    @ExceptionHandler(BizException.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleBiz(BizException e) {
        ErrorCode code = e.getErrorCode();
        Map<String, Object> body = Map.of(
                "code", code.code(),
                "message", e.getMessage(),
                "details", e.getDetails());
        return ResponseEntity.status(code.httpStatus())
                .body(new ApiResponse<>(body, MDC.get("traceId")));
    }

    // 行内注释4：兜底分支 —— 未知异常统一转 internal，不泄露堆栈。
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleUnknown(Exception e) {
        Map<String, Object> body = Map.of(
                "code", ErrorCode.COMMON_INTERNAL.code(),
                "message", ErrorCode.COMMON_INTERNAL.message(),
                "details", Map.of());
        return ResponseEntity.status(500).body(new ApiResponse<>(body, MDC.get("traceId")));
    }
}
