package com.xin.ai.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;

/**
 * 统一错误体（与前端 api.ts 的 "error" in payload 分支同构）。
 * 行内注释1：code 机器可读，message 中文可展示，details 放上下文。
 * 行内注释2：details 为空时不下发，减少包体。
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ErrorResponse(ErrorBody error) {

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    public record ErrorBody(
            String code,
            String message,
            Map<String, Object> details,
            @JsonProperty("trace_id") String traceId) {}
}
