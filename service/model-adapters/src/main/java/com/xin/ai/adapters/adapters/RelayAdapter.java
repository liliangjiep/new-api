package com.xin.ai.adapters.adapters;

import com.xin.ai.adapters.base.JsonPath;
import com.xin.ai.adapters.base.ModelAdapter;
import com.xin.ai.adapters.base.RelayTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 通用中转站适配器 —— 多中转站兼容的核心实现。
 * 行内注释1：一个适配器吃 DB 配置（RelayTemplate），新增中转站只需插一条 model_channels 记录，
 *             不需要写代码、不需要改协议。已有 ToAPI 站点也是同一套模板。
 * 行内注释2：请求体按 request_template 渲染，值里的 {key} 占位符用 params/上游模型名替换。
 * 行内注释3：轮询路径支持 {task_id} 占位符；status_map 把各家状态词归一到平台四态。
 * 行内注释4：失败分类 —— 429 限流、5xx 上游故障、4xx 参数错误，供路由决定是否回退到下一站。
 */
public class RelayAdapter implements ModelAdapter {

    private final ObjectMapper mapper;
    private final HttpClient http;

    public RelayAdapter(ObjectMapper mapper) {
        this.mapper = mapper;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    @Override
    public String capability() {
        return "relay";
    }

    // 行内注释5：提交 —— 渲染模板 → 发 POST → 解析 task_id。
    @Override
    public ModelResponse submit(ModelRequest req) {
        RelayTemplate tpl = req.endpoint() == null ? null : req.endpoint().template();
        if (tpl == null) {
            return new ModelResponse(false, null, Map.of(),
                    "channel.not_configured", "接入点缺少协议模板配置");
        }
        String baseUrl = trimSlash(req.endpoint().baseUrl());
        String url = baseUrl + tpl.submitPath();
        Map<String, Object> body = renderBody(tpl, req);

        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header(tpl.authHeader(), tpl.authPrefix() + apiKey(req))
                    .timeout(Duration.ofMillis(timeout(req)));
            tpl.extraHeaders().forEach((k, v) -> builder.header(k, v == null ? "" : String.valueOf(v)));

            String payload = mapper.writeValueAsString(body);
            LOG.info("上游提交 url={} key_tail={} body={}", url,
                    tail(apiKey(req)), payload);

            HttpResponse<String> res = http.send(
                    builder.POST(HttpRequest.BodyPublishers.ofString(
                            payload, StandardCharsets.UTF_8)).build(),
                    HttpResponse.BodyHandlers.ofString());

            if (res.statusCode() != 200 && res.statusCode() != 201 && res.statusCode() != 202) {
                LOG.warn("上游提交失败 url={} status={} body={}", url, res.statusCode(),
                        truncate(res.body()));
                return errorResponse(res.statusCode(), res.body());
            }
            JsonNode node = mapper.readTree(res.body());
            String taskId = JsonPath.readString(node, tpl.taskIdPath());
            if (taskId == null || taskId.isBlank()) {
                // 行内注释6：部分中转站同步返回结果 URL 而不返任务 ID，此时直接判定成功。
                java.util.List<String> urls = JsonPath.readStringList(node, tpl.resultUrlsPath());
                if (!urls.isEmpty()) {
                    Map<String, Object> raw = new LinkedHashMap<>();
                    raw.put("status", RelayTemplate.SUCCEEDED);
                    raw.put("result_urls", urls);
                    raw.put("sync", true);
                    return new ModelResponse(true, null, raw, null, null);
                }
                return new ModelResponse(false, null, Map.of("body", res.body()),
                        "channel.bad_response", "上游未返回任务 ID（task_id_path=" + tpl.taskIdPath() + "）");
            }
            Map<String, Object> raw = new LinkedHashMap<>();
            raw.put("status", RelayTemplate.PENDING);
            raw.put("protocol", tpl.protocol());
            return new ModelResponse(true, taskId, raw, null, null);
        } catch (Exception e) {
            return new ModelResponse(false, null, Map.of(), "channel.request_failed",
                    "上游请求失败：" + e.getMessage());
        }
    }

    // 行内注释2.5：诊断日志 —— 上游 403/400 时能看出实际发出的 URL 与请求体，便于定位协议差异。
    private static final org.slf4j.Logger LOG =
            org.slf4j.LoggerFactory.getLogger(RelayAdapter.class);

    // 行内注释7：轮询 —— 按 poll_path 模板查询，解析状态与结果 URL。
    @Override
    public ModelResponse poll(ModelRequest req, String upstreamTaskId) {
        RelayTemplate tpl = req.endpoint() == null ? null : req.endpoint().template();
        if (tpl == null) {
            return new ModelResponse(false, null, Map.of(), "channel.not_configured", "接入点缺少协议模板");
        }
        if (upstreamTaskId == null || upstreamTaskId.isBlank()) {
            return new ModelResponse(false, null, Map.of(), "channel.bad_request", "缺少上游任务 ID");
        }
        String baseUrl = trimSlash(req.endpoint().baseUrl());
        String path = tpl.pollPath().replace("{task_id}", upstreamTaskId);
        String url = baseUrl + path;

        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                    .header(tpl.authHeader(), tpl.authPrefix() + apiKey(req))
                    .timeout(Duration.ofMillis(timeout(req)));
            tpl.extraHeaders().forEach((k, v) -> builder.header(k, v == null ? "" : String.valueOf(v)));

            HttpResponse<String> res = http.send(builder.GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) {
                return errorResponse(res.statusCode(), res.body());
            }
            JsonNode node = mapper.readTree(res.body());
            String upstreamStatus = JsonPath.readString(node, tpl.statusPath());
            String status = tpl.normalizeStatus(upstreamStatus);

            Map<String, Object> raw = new LinkedHashMap<>();
            raw.put("status", status);
            raw.put("upstream_status", upstreamStatus == null ? "" : upstreamStatus);
            raw.put("progress", JsonPath.readInt(node, "progress", 0));
            java.util.List<String> urls = JsonPath.readStringList(node, tpl.resultUrlsPath());
            if (!urls.isEmpty()) {
                raw.put("result_urls", urls);
            }
            raw.put("type", JsonPath.readString(node, "result.type") == null
                    ? JsonPath.readString(node, "type") : JsonPath.readString(node, "result.type"));
            raw.put("billing", JsonPath.parseMap(JsonPath.write(
                    node.has("billing") ? mapper.convertValue(node.get("billing"), Map.class) : Map.of())));

            if (RelayTemplate.FAILED.equals(status)) {
                String reason = JsonPath.readString(node, "error.message");
                if (reason == null) {
                    reason = JsonPath.readString(node, "error");
                }
                if (reason == null) {
                    reason = JsonPath.readString(node, "message");
                }
                return new ModelResponse(false, upstreamTaskId, raw, "channel.failed",
                        reason == null ? "上游生成失败" : reason);
            }
            return new ModelResponse(RelayTemplate.SUCCEEDED.equals(status), upstreamTaskId, raw, null, null);
        } catch (Exception e) {
            return new ModelResponse(false, upstreamTaskId, Map.of(), "channel.request_failed",
                    "上游轮询失败：" + e.getMessage());
        }
    }

    // 行内注释8：请求体渲染 —— 模板值为字符串时做 {key} 占位替换。
    // 行内注释8.1：模板值可以是嵌套 Map / List —— 上游的多模态接口需要
    //             {"video_list":[{"video_url":"{video_url}"}]} 这种结构，
    //             所以这里对任意深度递归渲染，而不是只处理顶层字符串。
    private Map<String, Object> renderBody(RelayTemplate tpl, ModelRequest req) {
        Map<String, Object> params = req.params() == null ? Map.of() : req.params();
        Map<String, Object> out = new LinkedHashMap<>();
        tpl.requestTemplate().forEach((k, v) -> out.put(k, renderValue(v, params, req.endpoint())));
        return out;
    }

    /** 递归渲染 —— Map 逐键渲染、List 逐项渲染，其余走字符串占位替换。 */
    private Object renderValue(Object value, Map<String, Object> params,
            ModelAdapter.EndpointSnapshot endpoint) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> nested = new LinkedHashMap<>();
            map.forEach((k, v) -> nested.put(String.valueOf(k), renderValue(v, params, endpoint)));
            return nested;
        }
        if (value instanceof List<?> list) {
            java.util.List<Object> nested = new java.util.ArrayList<>(list.size());
            for (Object item : list) {
                nested.add(renderValue(item, params, endpoint));
            }
            return nested;
        }
        if (value instanceof String s) {
            return substitute(s, params, endpoint);
        }
        return value;
    }

    // 行内注释9：占位符替换 —— {prompt}/{size}/{n}/{upstream_model} 等。
    // 行内注释9.1：模板值若是「单个占位符」（如 "{n}"），直接用参数的原始类型 ——
    //             否则 n=1 会变成字符串 "1"，上游做参数校验时会拒（400/403）。
    private Object substitute(String tpl, Map<String, Object> params, ModelAdapter.EndpointSnapshot endpoint) {
        // 单占位符 —— 保留原始类型。
        if (tpl.length() > 2 && tpl.startsWith("{") && tpl.endsWith("}")
                && tpl.indexOf('}') == tpl.length() - 1) {
            String key = tpl.substring(1, tpl.length() - 1);
            if ("upstream_model".equals(key)) {
                return endpoint == null || endpoint.upstreamModel() == null ? "" : endpoint.upstreamModel();
            }
            if (params.containsKey(key)) {
                Object v = params.get(key);
                return v == null ? "" : v;
            }
        }
        String out = tpl;
        if (out.contains("{upstream_model}") && endpoint != null && endpoint.upstreamModel() != null) {
            out = out.replace("{upstream_model}", endpoint.upstreamModel());
        }
        for (Map.Entry<String, Object> e : params.entrySet()) {
            String token = "{" + e.getKey() + "}";
            if (out.contains(token)) {
                Object v = e.getValue();
                out = out.replace(token, v == null ? "" : String.valueOf(v));
            }
        }
        return out;
    }

    private String apiKey(ModelRequest req) {
        return req.endpoint() == null || req.endpoint().apiKey() == null ? "" : req.endpoint().apiKey();
    }

    private int timeout(ModelRequest req) {
        int t = req.endpoint() == null ? 60000 : req.endpoint().timeoutMs();
        return t <= 0 ? 60000 : t;
    }

    // 行内注释10：错误分类 —— 供回退路由决策：429/5xx/请求异常可回退，4xx 参数错误不回退。
    private ModelResponse errorResponse(int status, String body) {
        String code = status == 429 ? "channel.rate_limited"
                : status >= 500 ? "channel.upstream_error"
                : "channel.bad_request";
        String shortBody = body == null ? "" : body;
        if (shortBody.length() > 500) {
            shortBody = shortBody.substring(0, 500);
        }
        return new ModelResponse(false, null, Map.of("body", shortBody, "status", status), code,
                "上游返回 HTTP " + status);
    }

    private static String trimSlash(String url) {
        if (url == null) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    /** 截断长文本，避免日志刷屏。 */
    private static String truncate(String s) {
        if (s == null) {
            return "";
        }
        return s.length() <= 600 ? s : s.substring(0, 600) + "...";
    }

    /** 密钥尾部 6 位 —— 足够确认用的是哪把 key，又不至于泄露。 */
    private static String tail(String key) {
        if (key == null || key.length() <= 6) {
            return "***";
        }
        return "***" + key.substring(key.length() - 6);
    }
}
