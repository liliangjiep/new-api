package com.xin.ai.common.exception;

/**
 * 错误码枚举：<域>.<原因>，message 为中文可展示文案。
 * 行内注释1：code 给前端做分支判断，message 直接可展示，避免前端硬编码文案。
 * 行内注释2：httpStatus 只做传输层映射，业务语义看 code。
 * 行内注释3：新增错误码必须与 docs/new-ai-后端接口-V1.md §1.7 的清单一致。
 */
public enum ErrorCode {
    // 行内注释4：按域分组 —— auth / credit / channel / task / asset / common。
    AUTH_UNAUTHORIZED("auth.unauthorized", "登录已失效，请重新登录", 401),
    AUTH_FORBIDDEN("auth.forbidden", "无权限执行该操作", 403),
    AUTH_CODE_INVALID("auth.code_invalid", "验证码错误或已过期", 400),
    AUTH_CREDENTIAL_INVALID("auth.credential_invalid", "账号或密码不正确", 401),
    AUTH_RATE_LIMITED("auth.rate_limited", "操作过于频繁，请稍后再试", 429),
    AUTH_REFRESH_INVALID("auth.refresh_invalid", "登录已过期，请重新登录", 401),
    CREDIT_INSUFFICIENT("credit.insufficient", "积分不足，请先充值", 402),
    CREDIT_PRICE_CHANGED("credit.price_changed", "报价已过期，请重新报价", 409),
    CHANNEL_CIRCUIT_OPEN("channel.circuit_open", "通道熔断，已自动切换", 503),
    CHANNEL_ALL_FAILED("channel.all_failed", "全部通道失败，积分已退回", 503),
    TASK_NOT_FOUND("task.not_found", "任务不存在", 404),
    TASK_QUOTE_EXPIRED("task.quote_expired", "报价已过期，请重新报价", 410),
    TASK_IDEMPOTENT_CONFLICT("task.idempotent_conflict", "请求已处理，请勿重复提交", 409),
    ASSET_NOT_FOUND("asset.not_found", "素材不存在", 404),
    ASSET_TOO_LARGE("asset.too_large", "文件超出大小限制", 413),
    ASSET_TYPE_INVALID("asset.type_invalid", "文件类型不支持", 400),
    CANVAS_VERSION_CONFLICT("canvas.version_conflict", "画布已被其他会话修改，请刷新", 409),
    INVOICE_TAX_INVALID("invoice.tax_invalid", "税号格式不正确", 400),
    QUERY_INVALID("query.invalid", "查询参数不合法", 400),
    COMMON_BAD_REQUEST("common.bad_request", "参数错误", 400),
    COMMON_CONFLICT("common.conflict", "幂等冲突，请求已处理", 409),
    COMMON_NOT_FOUND("common.not_found", "资源不存在", 404),
    COMMON_INTERNAL("common.internal", "服务繁忙，请稍后重试", 500);

    private final String code;
    private final String message;
    private final int httpStatus;

    ErrorCode(String code, String message, int httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }

    public String code() { return code; }
    public String message() { return message; }
    public int httpStatus() { return httpStatus; }
}
