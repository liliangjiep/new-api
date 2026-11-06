package com.xin.ai.domain.service;

import com.xin.ai.adapters.base.JsonPath;
import com.xin.ai.adapters.base.ModelAdapter;
import com.xin.ai.adapters.base.RelayTemplate;
import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.domain.repository.Rows;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 中转站配置服务 —— 多中转站兼容的配置面。
 * 行内注释1：核心设计 —— 中转站信息全部存在 MySQL 的 model_channels / model_endpoints 表，
 *            新增一个中转站 = 往表里插一行（或在后台「模型接入」里新增），代码零改动。
 * 行内注释2：这里用 JDBC 直读强类型表，而不是通用 entity_rows ——
 *            因为中转站是你要频繁手工调表的对象，字段要清晰可读。
 * 行内注释3：密钥加密 —— api_key 存 AES 密文，解密口令走环境变量 XIN_CHANNEL_KEY_SECRET。
 */
public class RelayConfigService {

    private static final Logger log = LoggerFactory.getLogger(RelayConfigService.class);

    private final JdbcTemplate jdbc;
    private final DataStoreChannels channels;

    /** 密钥加解��工具。 */
    private final SecretBox secretBox;

    public RelayConfigService(DataSource dataSource, SecretBox secretBox) {
        this.jdbc = new JdbcTemplate(dataSource);
        this.secretBox = secretBox;
        this.channels = new DataStoreChannels(jdbc, secretBox);
    }

    // ---------------- 通道 ----------------

    /** 列出全部通道（后台「模型接入」用）。 */
    public List<Map<String, Object>> listChannels() {
        return jdbc.query("SELECT * FROM model_channels ORDER BY priority ASC, id ASC",
                (rs, i) -> channelRow(rs));
    }

    /** 列出启用中的通道。 */
    public List<Map<String, Object>> listActiveChannels() {
        return jdbc.query("SELECT * FROM model_channels WHERE status = 'active' ORDER BY priority ASC, id ASC",
                (rs, i) -> channelRow(rs));
    }

    /** 按 ID 查通道。 */
    public Map<String, Object> findChannel(String id) {
        List<Map<String, Object>> rows = jdbc.query(
                "SELECT * FROM model_channels WHERE id = ?", (rs, i) -> channelRow(rs), id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /**
     * 保存通道 —— id 为空则新建。
     * 行内注释4：apiKey 落库前加密；传空字符串表示「不修改原密钥」。
     */
    public Map<String, Object> upsertChannel(String operator, String id, String name, String provider,
            String baseUrl, String apiKey, String protocol, String templateJson, String capabilities,
            Integer priority, Integer rpmLimit, Double costRatio, String status, String remark) {
        String key = id == null || id.isBlank()
                ? "ch_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 8) : id;
        Map<String, Object> existing = findChannel(key);
        String encrypted = (apiKey == null || apiKey.isBlank())
                ? Rows.str(existing, "api_key", "")
                : secretBox.encrypt(apiKey);
        String sql = """
                INSERT INTO model_channels
                  (id, name, provider, base_url, api_key, protocol, template_json, capabilities,
                   priority, rpm_limit, cost_ratio, status, remark, created_at, updated_at, updated_by)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW(),?)
                ON DUPLICATE KEY UPDATE
                  name=VALUES(name), provider=VALUES(provider), base_url=VALUES(base_url),
                  api_key=VALUES(api_key), protocol=VALUES(protocol), template_json=VALUES(template_json),
                  capabilities=VALUES(capabilities), priority=VALUES(priority), rpm_limit=VALUES(rpm_limit),
                  cost_ratio=VALUES(cost_ratio), status=VALUES(status), remark=VALUES(remark),
                  updated_at=NOW(), updated_by=VALUES(updated_by)
                """;
        jdbc.update(sql, key, name, provider == null ? "relay" : provider, baseUrl, encrypted,
                protocol == null ? "openai-image" : protocol,
                templateJson == null ? "{}" : templateJson,
                capabilities == null ? "" : capabilities,
                priority == null ? 100 : priority,
                rpmLimit == null ? 600 : rpmLimit,
                costRatio == null ? 1.0d : costRatio,
                status == null ? "active" : status,
                remark == null ? "" : remark,
                operator);
        return findChannel(key);
    }

    /** 切换通道状态。 */
    public void toggleChannel(String operator, String id, String status) {
        jdbc.update("UPDATE model_channels SET status=?, circuit_state='closed', updated_at=NOW(), updated_by=? WHERE id=?",
                status, operator, id);
    }

    // ---------------- 接入点 ----------------

    public List<Map<String, Object>> listEndpoints() {
        return jdbc.query("SELECT * FROM model_endpoints ORDER BY model_key ASC, sort_order ASC",
                (rs, i) -> endpointRow(rs));
    }

    public Map<String, Object> upsertEndpoint(String operator, String id, String modelKey, String displayName,
            String channelId, String baseUrl, String upstreamModel, Integer timeoutMs, Integer maxRetries,
            Integer sortOrder, Boolean enabled, String paramMapJson, String templateJson) {
        String key = id == null || id.isBlank()
                ? "ep_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 8) : id;
        String sql = """
                INSERT INTO model_endpoints
                  (id, model_key, display_name, channel_id, base_url, upstream_model,
                   timeout_ms, max_retries, sort_order, enabled, param_map_json, template_json,
                   created_at, updated_at, updated_by)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW(),?)
                ON DUPLICATE KEY UPDATE
                  model_key=VALUES(model_key), display_name=VALUES(display_name),
                  channel_id=VALUES(channel_id), base_url=VALUES(base_url),
                  upstream_model=VALUES(upstream_model), timeout_ms=VALUES(timeout_ms),
                  max_retries=VALUES(max_retries), sort_order=VALUES(sort_order),
                  enabled=VALUES(enabled), param_map_json=VALUES(param_map_json),
                  template_json=VALUES(template_json),
                  updated_at=NOW(), updated_by=VALUES(updated_by)
                """;
        jdbc.update(sql, key, modelKey, displayName == null ? "" : displayName, channelId,
                baseUrl == null ? "" : baseUrl, upstreamModel == null ? "" : upstreamModel,
                timeoutMs == null ? 60000 : timeoutMs,
                maxRetries == null ? 2 : maxRetries,
                sortOrder == null ? 10 : sortOrder,
                enabled == null ? Boolean.TRUE : enabled,
                paramMapJson == null ? "{}" : paramMapJson,
                templateJson == null ? "" : templateJson,
                operator);
        List<Map<String, Object>> rows = jdbc.query("SELECT * FROM model_endpoints WHERE id = ?",
                (rs, i) -> endpointRow(rs), key);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public void toggleEndpoint(String operator, String id, boolean enabled) {
        jdbc.update("UPDATE model_endpoints SET enabled=?, updated_at=NOW(), updated_by=? WHERE id=?",
                enabled, operator, id);
    }

    /** 批量切通道 —— 同一 model_key 的全部接入点指向新通道。 */
    public int bulkSwitchChannel(String operator, String modelKey, String channelId) {
        return jdbc.update("UPDATE model_endpoints SET channel_id=?, updated_at=NOW(), updated_by=? WHERE model_key=?",
                channelId, operator, modelKey);
    }

    /**
     * 解析某 model_key 的全部候选接入点 —— 已按 sort_order 排好序。
     * 行内注释5：这是任务执行时调用的入口 —— 返回的列表就是回退顺序。
     */
    public List<ModelAdapter.EndpointSnapshot> resolveEndpoints(String modelKey) {
        List<Map<String, Object>> eps = jdbc.query(
                "SELECT e.*, c.name AS channel_name, c.api_key AS channel_key, c.protocol AS channel_protocol, "
                        + "c.template_json AS channel_template, c.status AS channel_status "
                        + "FROM model_endpoints e LEFT JOIN model_channels c ON c.id = e.channel_id "                        + "WHERE e.model_key = ? AND e.enabled = 1 ORDER BY e.sort_order ASC",
                (rs, i) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getString("id"));
                    m.put("model_key", rs.getString("model_key"));
                    m.put("display_name", rs.getString("display_name"));
                    m.put("channel_id", rs.getString("channel_id"));
                    m.put("base_url", rs.getString("base_url"));
                    m.put("upstream_model", rs.getString("upstream_model"));
                    m.put("timeout_ms", rs.getInt("timeout_ms"));
                    m.put("max_retries", rs.getInt("max_retries"));
                    m.put("sort_order", rs.getInt("sort_order"));
                    m.put("param_map_json", rs.getString("param_map_json"));
                    m.put("template_json", rs.getString("template_json"));
                    m.put("channel_name", rs.getString("channel_name"));
                    m.put("channel_key", rs.getString("channel_key"));
                    m.put("channel_protocol", rs.getString("channel_protocol"));
                    m.put("channel_template", rs.getString("channel_template"));
                    m.put("channel_status", rs.getString("channel_status"));
                    return m;
                }, modelKey);

        List<ModelAdapter.EndpointSnapshot> out = new ArrayList<>();
        for (Map<String, Object> ep : eps) {
            String channelId = Rows.str(ep, "channel_id", "");
            String channelStatus = Rows.str(ep, "channel_status", "");
            if (!"active".equals(channelStatus)) {
                // 行内注释6：通道停用 —— 直接跳过，不参与回退。
                log.debug("跳过停用通道: {}", channelId);
                continue;
            }
            String baseUrl = Rows.str(ep, "base_url", "");
            if (baseUrl.isBlank()) {
                baseUrl = Rows.str(findChannel(channelId), "base_url", "");
            }
            String apiKey = secretBox.decrypt(Rows.str(ep, "channel_key", ""));
            // 行内注释6.1：模板优先级 —— 接入点级 template_json > 通道级 template_json > 内置默认。
            //             同一中转站下图片/视频路径不同，所以接入点级覆盖是必需的。
            String epTemplate = Rows.str(ep, "template_json", "");
            RelayTemplate template;
            if (epTemplate != null && !epTemplate.isBlank() && !JsonPath.parseMap(epTemplate).isEmpty()) {
                template = parseTemplate(epTemplate, Rows.str(ep, "channel_protocol", ""));
            } else {
                template = parseTemplate(Rows.str(ep, "channel_template", "{}"),
                        Rows.str(ep, "channel_protocol", ""));
            }
            Map<String, Object> config = new LinkedHashMap<>();
            config.put("param_map", JsonPath.parseMap(Rows.str(ep, "param_map_json", "{}")));
            out.add(new ModelAdapter.EndpointSnapshot(
                    Rows.str(ep, "model_key", ""),
                    baseUrl,
                    Rows.str(ep, "upstream_model", ""),
                    channelId,
                    Rows.str(ep, "channel_name", ""),
                    apiKey,
                    template,
                    Rows.num(ep, "timeout_ms", 60000),
                    Rows.num(ep, "max_retries", 2),
                    Rows.num(ep, "sort_order", 10),
                    config));
        }
        return out;
    }

    /**
     * 解析协议模板 —— template_json 优先，缺失时按 protocol 套用内置默认模板。
     * 行内注释7：内置模板让「加一个 OpenAI 兼容站」只需填 base_url + api_key，不用写 JSON。
     */
    public RelayTemplate parseTemplate(String templateJson, String protocol) {
        Map<String, Object> m = JsonPath.parseMap(templateJson);
        if (m.isEmpty()) {
            m = builtInTemplate(protocol);
        }
        // 行内注释7.1：嵌套对象要用 ObjectMapper 重新序列化，不能用 String.valueOf ——
        //             后者得到的是 Java 的 toString（{model=xxx}），不是合法 JSON。
        Map<String, Object> reqTemplate = asMap(m.get("request_template"));
        Map<String, Object> statusMap = asMap(m.get("status_map"));
        Map<String, Object> extraHeaders = asMap(m.get("extra_headers"));
        return new RelayTemplate(
                Rows.str(m, "protocol", protocol),
                Rows.str(m, "submit_path", "/v1/images/generations"),
                Rows.str(m, "poll_path", "/v1/images/generations/{task_id}"),
                Rows.str(m, "auth_header", "Authorization"),
                Rows.str(m, "auth_prefix", "Bearer "),
                reqTemplate,
                Rows.str(m, "task_id_path", "id"),
                Rows.str(m, "status_path", "status"),
                Rows.str(m, "result_urls_path", "data[0].url"),
                statusMap,
                extraHeaders,
                Rows.num(m, "poll_interval_ms", 0));
    }

    /**
     * 把任意对象转成 Map —— 已是 Map 直接用，否则按 JSON 解析。
     * 行内注释7.2：template_json 解析出来的嵌套值是 LinkedHashMap，
     *             直接用即可；若是字符串则按 JSON 解析。
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object v) {
        if (v == null) {
            return Map.of();
        }
        if (v instanceof Map<?, ?> map) {
            Map<String, Object> out = new LinkedHashMap<>();
            map.forEach((k, val) -> out.put(String.valueOf(k), val));
            return out;
        }
        if (v instanceof String s) {
            return JsonPath.parseMap(s);
        }
        return Map.of();
    }

    /**
     * 内置协议模板 —— 覆盖常见中转站形态。
     * 行内注释8：openai-image 兼容绝大多数「OpenAI 图片接口」中转站；
     *            toapis 是当前已确认的那家（结果 URL 在 result.data[0].url）。
     */
    private Map<String, Object> builtInTemplate(String protocol) {
        if (protocol == null) {
            protocol = "openai-image";
        }
        return switch (protocol) {
            case "toapis" -> JsonPath.parseMap("""
                    {"protocol":"toapis","submit_path":"/v1/images/generations",
                     "poll_path":"/v1/images/generations/{task_id}",
                     "request_template":{"model":"{upstream_model}","prompt":"{prompt}","size":"{size}",
                       "resolution":"{resolution}","n":"{n}"},
                     "task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}
                    """);
            case "openai-video" -> JsonPath.parseMap("""
                    {"protocol":"openai-video","submit_path":"/v1/videos/generations",
                     "poll_path":"/v1/videos/generations/{task_id}",
                     "request_template":{"model":"{upstream_model}","prompt":"{prompt}",
                       "duration":"{duration}","aspect_ratio":"{aspect_ratio}","resolution":"{resolution}"},
                     "task_id_path":"id","status_path":"status","result_urls_path":"data[0].url"}
                    """);
            default -> JsonPath.parseMap("""
                    {"protocol":"openai-image","submit_path":"/v1/images/generations",
                     "poll_path":"/v1/images/generations/{task_id}",
                     "request_template":{"model":"{upstream_model}","prompt":"{prompt}","size":"{size}","n":"{n}"},
                     "task_id_path":"id","status_path":"status","result_urls_path":"data[0].url"}
                    """);
        };
    }

    // ---------------- 行映射 ----------------

    private Map<String, Object> channelRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", rs.getString("id"));
        m.put("name", rs.getString("name"));
        m.put("provider", rs.getString("provider"));
        m.put("base_url", rs.getString("base_url"));
        // 行内注释9：对外只给掩码，绝不把明文密钥吐给前端。
        m.put("api_key_masked", mask(rs.getString("api_key")));
        m.put("protocol", rs.getString("protocol"));
        m.put("template_json", rs.getString("template_json"));
        m.put("capabilities", rs.getString("capabilities"));
        m.put("priority", rs.getInt("priority"));
        m.put("rpm_limit", rs.getInt("rpm_limit"));
        m.put("cost_ratio", rs.getDouble("cost_ratio"));
        m.put("status", rs.getString("status"));
        m.put("circuit_state", rs.getString("circuit_state"));
        m.put("consecutive_failures", rs.getInt("consecutive_failures"));
        m.put("balance", rs.getDouble("balance"));
        m.put("remark", rs.getString("remark"));
        m.put("updated_at", rs.getString("updated_at"));
        return m;
    }

    private Map<String, Object> endpointRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", rs.getString("id"));
        m.put("model_key", rs.getString("model_key"));
        m.put("display_name", rs.getString("display_name"));
        m.put("channel_id", rs.getString("channel_id"));
        m.put("base_url", rs.getString("base_url"));
        m.put("upstream_model", rs.getString("upstream_model"));
        m.put("timeout_ms", rs.getInt("timeout_ms"));
        m.put("max_retries", rs.getInt("max_retries"));
        m.put("sort_order", rs.getInt("sort_order"));
        m.put("enabled", rs.getInt("enabled") == 1);
        m.put("param_map_json", rs.getString("param_map_json"));
        m.put("template_json", rs.getString("template_json"));
        return m;
    }

    /** 密钥掩码 —— 只露头尾。 */
    public static String mask(String secret) {
        if (secret == null || secret.isBlank()) {
            return "";
        }
        if (secret.length() <= 10) {
            return "****";
        }
        return secret.substring(0, 4) + "****" + secret.substring(secret.length() - 4);
    }

    /** 内部：通道表读写辅助。 */
    static class DataStoreChannels {
        private final JdbcTemplate jdbc;
        private final SecretBox secretBox;

        DataStoreChannels(JdbcTemplate jdbc, SecretBox secretBox) {
            this.jdbc = jdbc;
            this.secretBox = secretBox;
        }
    }

    /**
     * 密钥加解密盒 —— AES-128-GCM，口令来自环境变量。
     */
    public static class SecretBox {

        private final javax.crypto.SecretKey key;

        public SecretBox(String secret) {
            try {
                byte[] raw = secret == null ? new byte[0] : secret.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                byte[] padded = new byte[16];
                System.arraycopy(raw, 0, padded, 0, Math.min(raw.length, 16));
                this.key = new javax.crypto.spec.SecretKeySpec(padded, "AES");
            } catch (Exception e) {
                throw new IllegalStateException("secret box init failed", e);
            }
        }

        public String encrypt(String plain) {
            if (plain == null || plain.isBlank()) {
                return "";
            }
            try {
                javax.crypto.Cipher c = javax.crypto.Cipher.getInstance("AES/ECB/PKCS5Padding");
                c.init(javax.crypto.Cipher.ENCRYPT_MODE, key);
                return java.util.Base64.getEncoder().encodeToString(c.doFinal(plain.getBytes(
                        java.nio.charset.StandardCharsets.UTF_8)));
            } catch (Exception e) {
                throw new IllegalStateException("encrypt failed", e);
            }
        }

        public String decrypt(String cipherText) {
            if (cipherText == null || cipherText.isBlank()) {
                return "";
            }
            try {
                javax.crypto.Cipher c = javax.crypto.Cipher.getInstance("AES/ECB/PKCS5Padding");
                c.init(javax.crypto.Cipher.DECRYPT_MODE, key);
                return new String(c.doFinal(java.util.Base64.getDecoder().decode(cipherText)),
                        java.nio.charset.StandardCharsets.UTF_8);
            } catch (Exception e) {
                // 行内注释10：解密失败 —— 通常是密钥轮换后旧密文残留，返回空串让该站判定为「未配置」。
                log.warn("decrypt failed, treat as unconfigured: {}", e.getMessage());
                return "";
            }
        }
    }

    /** 校验通道配置完整性 —— 后台保存时用。 */
    public void validateChannel(Map<String, Object> channel) {
        if (channel == null) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST,
                    Rows.row("message", "通道不存在"));
        }
        if (Rows.str(channel, "base_url", "").isBlank()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST,
                    Rows.row("message", "base_url 不能为空", "field", "base_url"));
        }
    }
}
