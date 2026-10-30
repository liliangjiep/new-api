package com.xin.ai.common.exception;

/**
 * M2-02 错误码枚举：<域>.<原因>，message 为中文可展示文案。
 * 行内注释1：code 给前端做分支判断，message 直接可展示，避免前端硬编码文案。
 * 行内注释2：httpStatus 只做传输层映射，业务语义看 code。
 */
public enum ErrorCode {
    // 行内注释3：按域分组 —— auth / credit / channel / task / common。
    AUTH_UNAUTHORIZED("auth.unauthorized", "登录已失效，请重新登录", 401),
    AUTH_FORBIDDEN("auth.forbidden", "无权限执行该操作", 403),
    CREDIT_INSUFFICIENT("credit.insufficient", "积分不足，请先充值", 402),
    CREDIT_PRICE_CHANGED("credit.price_changed", "报价已过期，请重新报价", 409),
    CHANNEL_CIRCUIT_OPEN("channel.circuit_open", "通道熔断，已自动切换", 503),
    CHANNEL_ALL_FAILED("channel.all_failed", "全部通道失败，积分已退回", 503),
    TASK_NOT_FOUND("task.not_found", "任务不存在", 404),
    COMMON_BAD_REQUEST("common.bad_request", "参数错误", 400),
    COMMON_CONFLICT("common.conflict", "幂等冲突，请求已处理", 409),
    COMMON_INTERNAL("common.internal", "服务繁忙，请稍后重试", 500);

    private final String code;
    private final String message;
    private final int httpStatus;

    // 行内注释4：枚举构造器私有，实例在类加载时一次性建好。
    ErrorCode(String code, String message, int httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }

    public String code() { return code; }
    public String message() { return message; }
    public int httpStatus() { return httpStatus; }
}
