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

    /**
     * 接入点快照 —— 一个 model_key 在某个中转站上的落点。
     * 行内注释6：多中转站兼容的关键 —— 快照里带 channelId 与协议模板，
     *             换站只换快照，适配器代码不动。
     * 行内注释7：apiKey 由调用方从通道表读出并注入（快照是一次性构造，不做长期缓存的密钥）。
     */
    record EndpointSnapshot(
            String modelKey,
            /** 中转站 base_url。 */
            String baseUrl,
            /** 上游模型名（该站支持的模型标识）。 */
            String upstreamModel,
            /** 所属中转站 ID。 */
            String channelId,
            /** 中转站名称，仅用于日志与审计。 */
            String channelName,
            /** 该站的 API Key。 */
            String apiKey,
            /** 协议模板 —— 决定请求/响应形态。 */
            RelayTemplate template,
            /** 请求超时毫秒。 */
            int timeoutMs,
            /** 最大重试次数。 */
            int maxRetries,
            /** 回退序（小的优先）。 */
            int sortOrder,
            /** 额外配置。 */
            Map<String, Object> configJson) {

        public EndpointSnapshot {
            configJson = configJson == null ? Map.of() : configJson;
        }
    }

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
