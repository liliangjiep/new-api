package com.xin.ai.common.security;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 极简 JSON 解析/序列化（仅够 JWT payload 与内部缓存用）。
 * 行内注释1：不引 Jackson 是为了 common 模块保持零三方 JSON 依赖（模型适配层可用 Jackson）。
 * 行内注释2：只支持对象/数组/字符串/数字/布尔/null，够用即可，非法输入抛 RuntimeException。
 */
public final class JsonLite {

    private JsonLite() {}

    public static Map<String, Object> parseObject(String json) {
        Object v = new Parser(json).parseValue();
        if (v instanceof Map<?, ?> m) {
            Map<String, Object> out = new LinkedHashMap<>();
            m.forEach((k, val) -> out.put(String.valueOf(k), val));
            return out;
        }
        throw new IllegalArgumentException("not a json object");
    }

    public static String escape(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }

    // 行内注释3：对象序列化 —— value 支持 String/Number/Boolean/null/Map/List。
    public static String stringify(Map<String, Object> map) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> e : map.entrySet()) {
            if (!first) {
                sb.append(',');
            }
            first = false;
            sb.append('"').append(escape(e.getKey())).append("\":");
            appendValue(sb, e.getValue());
        }
        return sb.append('}').toString();
    }

    @SuppressWarnings("unchecked")
    private static void appendValue(StringBuilder sb, Object v) {
        if (v == null) {
            sb.append("null");
        } else if (v instanceof String s) {
            sb.append('"').append(escape(s)).append('"');
        } else if (v instanceof Number || v instanceof Boolean) {
            sb.append(v);
        } else if (v instanceof Map<?, ?> m) {
            sb.append(stringify((Map<String, Object>) m));
        } else if (v instanceof List<?> list) {
            sb.append('[');
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) {
                    sb.append(',');
                }
                appendValue(sb, list.get(i));
            }
            sb.append(']');
        } else {
            sb.append('"').append(escape(String.valueOf(v))).append('"');
        }
    }

    private static final class Parser {
        private final String s;
        private int i;

        Parser(String s) { this.s = s; }

        Object parseValue() {
            skipWs();
            if (i >= s.length()) {
                throw new IllegalArgumentException("unexpected end");
            }
            char c = s.charAt(i);
            return switch (c) {
                case '{' -> parseObj();
                case '[' -> parseArr();
                case '"' -> parseStr();
                case 't' -> parseLiteral("true", Boolean.TRUE);
                case 'f' -> parseLiteral("false", Boolean.FALSE);
                case 'n' -> parseLiteral("null", null);
                default -> parseNum();
            };
        }

        private Map<String, Object> parseObj() {
            Map<String, Object> map = new LinkedHashMap<>();
            expect('{');
            skipWs();
            if (peek() == '}') { i++; return map; }
            while (true) {
                skipWs();
                String key = parseStr();
                skipWs();
                expect(':');
                map.put(key, parseValue());
                skipWs();
                char c = s.charAt(i++);
                if (c == '}') { return map; }
                if (c != ',') { throw new IllegalArgumentException("bad object at " + i); }
            }
        }

        private List<Object> parseArr() {
            List<Object> list = new ArrayList<>();
            expect('[');
            skipWs();
            if (peek() == ']') { i++; return list; }
            while (true) {
                list.add(parseValue());
                skipWs();
                char c = s.charAt(i++);
                if (c == ']') { return list; }
                if (c != ',') { throw new IllegalArgumentException("bad array at " + i); }
            }
        }

        private String parseStr() {
            expect('"');
            StringBuilder sb = new StringBuilder();
            while (true) {
                char c = s.charAt(i++);
                if (c == '"') { return sb.toString(); }
                if (c == '\\') {
                    char n = s.charAt(i++);
                    switch (n) {
                        case 'n' -> sb.append('\n');
                        case 'r' -> sb.append('\r');
                        case 't' -> sb.append('\t');
                        case 'b' -> sb.append('\b');
                        case 'f' -> sb.append('\f');
                        case 'u' -> {
                            sb.append((char) Integer.parseInt(s.substring(i, i + 4), 16));
                            i += 4;
                        }
                        default -> sb.append(n);
                    }
                } else {
                    sb.append(c);
                }
            }
        }

        private Object parseLiteral(String lit, Object val) {
            if (!s.startsWith(lit, i)) {
                throw new IllegalArgumentException("bad literal at " + i);
            }
            i += lit.length();
            return val;
        }

        private Object parseNum() {
            int start = i;
            while (i < s.length() && "+-0123456789.eE".indexOf(s.charAt(i)) >= 0) {
                i++;
            }
            String num = s.substring(start, i);
            if (num.contains(".") || num.contains("e") || num.contains("E")) {
                return Double.parseDouble(num);
            }
            return Long.parseLong(num);
        }

        private void expect(char c) {
            if (s.charAt(i++) != c) {
                throw new IllegalArgumentException("expect " + c + " at " + (i - 1));
            }
        }

        private char peek() { return s.charAt(i); }

        private void skipWs() {
            while (i < s.length() && Character.isWhitespace(s.charAt(i))) { i++; }
        }
    }
}
