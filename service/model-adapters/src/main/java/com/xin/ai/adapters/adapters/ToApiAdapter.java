package com.xin.ai.adapters.adapters;

import com.xin.ai.adapters.base.ModelAdapter;
import com.xin.ai.adapters.config.ToApiProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.OutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * M3-03 ToApiAdapter：ToAPIs（https://toapis.cn）图片 / 视频生成透传。
 * 行内注释1：请求契约完全对齐 ToAPIs Skill —— 图片 POST /v1/images/generations，
 *           视频 POST /v1/videos/generations；轮询 GET 同路径 + {task_id}。
 * 行内注释2：结果 URL 在 result.data[0].url，不是顶层 data —— 这是 ToAPIs 的关键约定。
 * 行内注释3：未配置 apiKey 时返回 ok=false，调用方据此退回积分，不产生悬挂任务。
 */
public class ToApiAdapter implements ModelAdapter {

    private final ToApiProperties props;
    private final ObjectMapper mapper;
    private final HttpClient http;

    public ToApiAdapter(ToApiProperties props, ObjectMapper mapper) {
        this.props = props;
        this.mapper = mapper;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(props.timeoutMs()))
                .build();
    }

    @Override
    public String capability() {
        return "toapi";
    }

    // 行内注释4：提交 —— 按能力域选择图片或视频端点，返回上游任务 ID。
    @Override
    public ModelResponse submit(ModelRequest req) {
        if (!props.configured()) {
            return new ModelResponse(false, null, Map.of(),
                    "channel.not_configured", "ToAPI 未配置密钥（TOAPIS_API_KEY），请在后台配置通道后再试");
        }
        String upstreamModel = req.endpoint() == null ? "" : req.endpoint().upstreamModel();
        boolean isVideo = upstreamModel != null && upstreamModel.startsWith("seedance");
        String path = isVideo ? "/v1/videos/generations" : "/v1/images/generations";
        Map<String, Object> body = buildBody(req, isVideo, upstreamModel);
        try {
            HttpResponse<String> res = http.send(
                    HttpRequest.newBuilder(URI.create(props.baseUrl() + path))
                            .header("Authorization", "Bearer " + props.apiKey())
                            .header("Content-Type", "application/json")
                            .timeout(Duration.ofMillis(props.timeoutMs()))
                            .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body), StandardCharsets.UTF_8))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200 && res.statusCode() != 201 && res.statusCode() != 202) {
                return errorResponse(res.statusCode(), res.body());
            }
            JsonNode node = mapper.readTree(res.body());
            String taskId = node.path("id").asText(null);
            if (taskId == null || taskId.isBlank()) {
                return new ModelResponse(false, null, Map.of(), "channel.bad_response", "上游未返回任务 ID");
            }
            Map<String, Object> raw = new LinkedHashMap<>();
            raw.put("status", node.path("status").asText("pending"));
            raw.put("billing", mapper.convertValue(node.path("billing"), Map.class));
            return new ModelResponse(true, taskId, raw, null, null);
        } catch (Exception e) {
            return new ModelResponse(false, null, Map.of(), "channel.request_failed", e.getMessage());
        }
    }

    // 行内注释5：轮询 —— 解析 status 与 result.data[0].url。
    @Override
    public ModelResponse poll(ModelRequest req, String upstreamTaskId) {
        if (!props.configured()) {
            return new ModelResponse(false, null, Map.of(), "channel.not_configured", "ToAPI 未配置密钥");
        }
        boolean isVideo = req.endpoint() != null
                && req.endpoint().upstreamModel() != null
                && req.endpoint().upstreamModel().startsWith("seedance");
        String path = (isVideo ? "/v1/videos/generations/" : "/v1/images/generations/") + upstreamTaskId;
        try {
            HttpResponse<String> res = http.send(
                    HttpRequest.newBuilder(URI.create(props.baseUrl() + path))
                            .header("Authorization", "Bearer " + props.apiKey())
                            .timeout(Duration.ofMillis(props.timeoutMs()))
                            .GET()
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) {
                return errorResponse(res.statusCode(), res.body());
            }
            JsonNode node = mapper.readTree(res.body());
            String status = node.path("status").asText("pending");
            Map<String, Object> raw = new LinkedHashMap<>();
            raw.put("status", status);
            raw.put("progress", node.path("progress").asInt(0));
            if ("failed".equals(status)) {
                return new ModelResponse(false, upstreamTaskId, raw,
                        "channel.failed", node.path("error").asText("上游生成失败"));
            }
            // 行内注释6：结果 URL 位于 result.data[0].url。
            JsonNode data = node.path("result").path("data");
            if (data.isArray() && data.size() > 0) {
                raw.put("result_urls", java.util.List.of(data.get(0).path("url").asText("")));
                raw.put("type", node.path("result").path("type").asText(""));
            }
            raw.put("billing", mapper.convertValue(node.path("billing"), Map.class));
            boolean done = "completed".equals(status);
            return new ModelResponse(done, upstreamTaskId, raw, null, null);
        } catch (Exception e) {
            return new ModelResponse(false, upstreamTaskId, Map.of(), "channel.request_failed", e.getMessage());
        }
    }

    // 行内注释7：请求体组装 —— 图片 {model,prompt,size,resolution,n}，视频 {model,prompt,duration,aspect_ratio,resolution}。
    private Map<String, Object> buildBody(ModelRequest req, boolean isVideo, String upstreamModel) {
        Map<String, Object> params = req.params() == null ? Map.of() : req.params();
        Map<String, Object> body = new LinkedHashMap<>();
        if (isVideo) {
            body.put("model", upstreamModel == null || upstreamModel.isBlank() ? props.videoModel() : upstreamModel);
            body.put("prompt", str(params, "prompt", ""));
            body.put("duration", num(params, "duration", 5));
            body.put("aspect_ratio", str(params, "aspect_ratio", str(params, "size", "16:9")));
            body.put("resolution", str(params, "resolution", "480p"));
        } else {
            body.put("model", upstreamModel == null || upstreamModel.isBlank() ? props.imageModel() : upstreamModel);
            body.put("prompt", str(params, "prompt", ""));
            body.put("size", str(params, "size", "1:1"));
            body.put("resolution", str(params, "resolution", "1k"));
            body.put("n", num(params, "n", 1));
            if (!str(params, "background", "").isBlank()) {
                body.put("background", str(params, "background", ""));
            }
        }
        return body;
    }

    // 行内注释8：错误归一化 —— 429 限流、5xx 可重试、4xx 参数错误不重试。
    private ModelResponse errorResponse(int status, String body) {
        String code = status == 429 ? "channel.rate_limited"
                : status >= 500 ? "channel.upstream_error"
                : "channel.bad_request";
        return new ModelResponse(false, null, Map.of("body", body == null ? "" : body), code,
                "上游返回 " + status);
    }

    private static String str(Map<String, Object> params, String key, String def) {
        Object v = params.get(key);
        return v == null ? def : String.valueOf(v);
    }

    private static int num(Map<String, Object> params, String key, int def) {
        Object v = params.get(key);
        if (v instanceof Number n) {
            return n.intValue();
        }
        try {
            return v == null ? def : Integer.parseInt(String.valueOf(v));
        } catch (NumberFormatException e) {
            return def;
        }
    }
}
