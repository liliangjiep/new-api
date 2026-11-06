package com.xin.ai.adapters.base;

import java.util.Map;

/**
 * 中转站协议模板：把「不同中转站的请求/响应差异」全部外置为配置，代码零改动即可接新站。
 * 行内注释1：这是多中转站兼容的核心 —— 所有差异都落在 template 的路径与模板串里。
 * 行内注释2：template 来自 DB 表 model_channels.template_json（JSON 字符串），由 RelayTemplate 解析。
 * 行内注释3：路径语法 —— "a.b[0].c" 表示 JSON 逐层下钻；取不到返回 null，不抛异常。
 *
 * <p>典型配置（OpenAI 兼容图片站）：
 * <pre>
 * {
 *   "protocol": "openai-image",
 *   "submit_path": "/v1/images/generations",
 *   "poll_path": "/v1/images/generations/{task_id}",
 *   "auth_header": "Authorization",
 *   "auth_prefix": "Bearer ",
 *   "request_template": {"model":"{upstream_model}","prompt":"{prompt}","size":"{size}","n":"{n}"},
 *   "task_id_path": "id",
 *   "status_path": "status",
 *   "result_urls_path": "data[0].url",
 *   "status_map": {"completed":"completed","succeeded":"completed","success":"completed"}
 * }
 * </pre>
 */
public record RelayTemplate(
        /** 协议标识，仅用于日志与后台展示。 */
        String protocol,
        /** 提交路径，相对 channel.base_url。 */
        String submitPath,
        /** 轮询路径模板，含 {task_id} 占位符。 */
        String pollPath,
        /** 鉴权请求头名，默认 Authorization。 */
        String authHeader,
        /** 鉴权值前缀，默认 "Bearer "。 */
        String authPrefix,
        /** 请求体模板，值为字符串时按 {key} 占位符替换。 */
        Map<String, Object> requestTemplate,
        /** 上游任务 ID 在响应 JSON 中的路径。 */
        String taskIdPath,
        /** 状态字段路径。 */
        String statusPath,
        /** 结果 URL 列表路径。 */
        String resultUrlsPath,
        /** 上游状态 → 平台状态 的映射（上游值 → 平台值）。 */
        Map<String, Object> statusMap,
        /** 额外请求头（如某些站要 X-API-Key）。 */
        Map<String, Object> extraHeaders,
        /** 轮询间隔毫秒，0 表示用全局默认。 */
        int pollIntervalMs) {

    public RelayTemplate {
        authHeader = authHeader == null || authHeader.isBlank() ? "Authorization" : authHeader;
        authPrefix = authPrefix == null ? "Bearer " : authPrefix;
        requestTemplate = requestTemplate == null ? Map.of() : requestTemplate;
        taskIdPath = taskIdPath == null || taskIdPath.isBlank() ? "id" : taskIdPath;
        statusPath = statusPath == null || statusPath.isBlank() ? "status" : statusPath;
        resultUrlsPath = resultUrlsPath == null ? "" : resultUrlsPath;
        statusMap = statusMap == null ? Map.of() : statusMap;
        extraHeaders = extraHeaders == null ? Map.of() : extraHeaders;
    }

    /** 平台标准状态：pending / running / succeeded / failed。 */
    public static final String PENDING = "pending";
    public static final String RUNNING = "running";
    public static final String SUCCEEDED = "succeeded";
    public static final String FAILED = "failed";

    /**
     * 上游状态归一化 —— 先查 status_map，再按字面量兜底。
     */
    public String normalizeStatus(String upstreamStatus) {
        if (upstreamStatus == null || upstreamStatus.isBlank()) {
            return PENDING;
        }
        String key = upstreamStatus.toLowerCase();
        Object mapped = statusMap.get(key);
        if (mapped != null) {
            return String.valueOf(mapped);
        }
        return switch (key) {
            case "completed", "complete", "succeeded", "success", "done" -> SUCCEEDED;
            case "failed", "fail", "error", "cancelled", "canceled" -> FAILED;
            case "running", "processing", "generating", "in_progress" -> RUNNING;
            default -> PENDING;
        };
    }
}
