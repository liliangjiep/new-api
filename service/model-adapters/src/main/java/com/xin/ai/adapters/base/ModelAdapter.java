package com.xin.ai.adapters.base;

import java.util.Map;

/**
 * M3-01 ModelAdapter 接口：全部上游调用的唯一入口。
 * 行内注释1：Endpoint 快照随请求携带，Adapter 不得持有硬编码 URL（架构硬约束）。
 * 行内注释2：submit 同步模型 / poll 异步轮询，默认 poll 抛错，同步适配器不用实现。
 */
public interface ModelAdapter {

    // 行内注释3：能力域标识，用于 Spring 注入后按 capability 归组。
    String capability();

    // 行内注释4：同步提交 —— 返回上游任务 ID 与原始响应。
    ModelResponse submit(ModelRequest request);

    // 行内注释5：异步轮询 —— 同步模型默认不支持，子类按需覆盖。
    default ModelResponse poll(ModelRequest request, String upstreamTaskId) {
        throw new UnsupportedOperationException("poll not supported: " + capability());
    }

    // 行内注释6：请求上下文 —— Endpoint 快照 + 业务参数 + 幂等键。
    record EndpointSnapshot(
            String modelKey,
            String baseUrl,
            String upstreamModel,
            String secretRef,
            int timeoutMs,
            int maxRetries,
            Map<String, Object> configJson) {}

    record ModelRequest(
            EndpointSnapshot endpoint,
            Map<String, Object> params,
            String idempotencyKey,
            String traceId) {}

    record ModelResponse(
            boolean ok,
            String upstreamTaskId,
            Map<String, Object> raw,
            String errorCode,
            String errorMessage) {}
}
