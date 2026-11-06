package com.xin.ai.adapters.base;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * JSON 路径工具：从响应体里按路径取���，供中转站协议模板使用。
 * 行内注释1：路径语法 "a.b[0].c" —— 点号分层，[n] 取数组第 n 项。
 * 行内注释2：任何一层缺失都返回 null / 空列表，绝不抛异常 —— 上游响应形态千差万别，不能因解析失败炸掉整个链路。
 */
public final class JsonPath {

    private JsonPath() {}

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** 按路径取标量值（字符串化）。 */
    public static String readString(JsonNode root, String path) {
        JsonNode node = resolve(root, path);
        return node == null || node.isNull() ? null : node.asText();
    }

    /** 按路径取整数值。 */
    public static int readInt(JsonNode root, String path, int def) {
        JsonNode node = resolve(root, path);
        if (node == null || node.isNull()) {
            return def;
        }
        return node.isNumber() ? node.asInt() : def;
    }

    /**
     * 按路径取字符串列表 —— 支持两种形态：
     * "data[0].url"  → 单值路径，取该节点的字符串；
     * "data[*].url"  → 数组展开，取所有匹配项。
     */
    public static List<String> readStringList(JsonNode root, String path) {
        List<String> out = new ArrayList<>();
        if (path == null || path.isBlank()) {
            return out;
        }
        if (path.contains("[*]")) {
            String base = path.substring(0, path.indexOf("[*]"));
            String rest = path.substring(path.indexOf("[*]") + 3);
            JsonNode array = resolve(root, base);
            if (array != null && array.isArray()) {
                for (JsonNode item : array) {
                    JsonNode v = resolve(item, rest);
                    if (v != null && !v.isNull()) {
                        out.add(v.asText());
                    }
                }
            }
            return out;
        }
        String single = readString(root, path);
        if (single != null && !single.isBlank()) {
            out.add(single);
        }
        return out;
    }

    /** 解析 JSON 字符串为节点，失败返回 null。 */
    public static JsonNode parse(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return MAPPER.readTree(json);
        } catch (Exception e) {
            return null;
        }
    }

    /** 把 Map 序列化为 JSON 字符串。 */
    public static String write(Map<String, Object> map) {
        try {
            return MAPPER.writeValueAsString(map);
        } catch (Exception e) {
            return "{}";
        }
    }

    /** 解析 JSON 字符串为 Map（供 template_json 使用）。 */
    public static Map<String, Object> parseMap(String json) {
        JsonNode node = parse(json);
        if (node == null || !node.isObject()) {
            return Map.of();
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> map = MAPPER.convertValue(node, Map.class);
        return map;
    }

    // 行内注释3：路径解析核心 —— 先按 [n] 切数组索引，再按 . 分层。
    private static JsonNode resolve(JsonNode root, String path) {
        if (root == null || path == null || path.isBlank()) {
            return null;
        }
        JsonNode cur = root;
        for (String rawSeg : path.split("\\.")) {
            if (cur == null || cur.isNull()) {
                return null;
            }
            String seg = rawSeg;
            int bracket = seg.indexOf('[');
            if (bracket >= 0) {
                String name = seg.substring(0, bracket);
                if (!name.isBlank()) {
                    cur = cur.get(name);
                    if (cur == null || cur.isNull()) {
                        return null;
                    }
                }
                // 处理可能出现的多个下标，如 a[0][1]
                while (bracket >= 0) {
                    int close = seg.indexOf(']', bracket);
                    if (close < 0) {
                        return null;
                    }
                    String idxStr = seg.substring(bracket + 1, close);
                    if (!cur.isArray()) {
                        return null;
                    }
                    try {
                        int idx = Integer.parseInt(idxStr.trim());
                        if (idx < 0 || idx >= cur.size()) {
                            return null;
                        }
                        cur = cur.get(idx);
                    } catch (NumberFormatException e) {
                        return null;
                    }
                    bracket = seg.indexOf('[', close);
                    if (bracket >= 0) {
                        seg = seg.substring(bracket);
                    }
                }
            } else {
                cur = cur.get(seg);
            }
        }
        return cur == null || cur.isNull() ? null : cur;
    }
}
