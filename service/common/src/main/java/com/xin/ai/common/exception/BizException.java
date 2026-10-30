package com.xin.ai.common.exception;

import java.util.Map;

/**
 * M2-02 业务异常：携带 ErrorCode + 可选 details。
 * 行内注释1：details 放机器可读的上下文（如差多少积分、哪个通道失败）。
 * 行内注释2：不做受检异常，调用方按需捕获，全局 handler 兜底转响应。
 */
public class BizException extends RuntimeException {

    private final ErrorCode errorCode;
    private final Map<String, Object> details;

    // 行内注释3：最简构造 —— 只有错误码。
    public BizException(ErrorCode errorCode) {
        super(errorCode.message());
        this.errorCode = errorCode;
        this.details = Map.of();
    }

    // 行内注释4：带 details 的构造，用于需要前端展示差异量的场景。
    public BizException(ErrorCode errorCode, Map<String, Object> details) {
        super(errorCode.message());
        this.errorCode = errorCode;
        this.details = details == null ? Map.of() : Map.copyOf(details);
    }

    public ErrorCode getErrorCode() { return errorCode; }
    public Map<String, Object> getDetails() { return details; }
}
