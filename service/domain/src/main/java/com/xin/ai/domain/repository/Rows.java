package com.xin.ai.domain.repository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 字段读取辅助：Map 字段的取值/转型/兜底。
 * 行内注释1：集中处理 null 与类型不符，避免每个 Service 写一堆 instanceof。
 */
public final class Rows {

    private Rows() {}

    public static String str(Map<String, Object> row, String key) {
        Object v = row == null ? null : row.get(key);
        return v == null ? null : String.valueOf(v);
    }

    public static String str(Map<String, Object> row, String key, String def) {
        String v = str(row, key);
        return v == null || v.isBlank() ? def : v;
    }

    public static int num(Map<String, Object> row, String key) {
        return num(row, key, 0);
    }

    public static int num(Map<String, Object> row, String key, int def) {
        Object v = row == null ? null : row.get(key);
        if (v == null) {
            return def;
        }
        if (v instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(v));
        } catch (NumberFormatException e) {
            return def;
        }
    }

    public static long numLong(Map<String, Object> row, String key) {
        Object v = row == null ? null : row.get(key);
        if (v == null) {
            return 0L;
        }
        if (v instanceof Number n) {
            return n.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(v));
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    public static boolean bool(Map<String, Object> row, String key) {
        Object v = row == null ? null : row.get(key);
        return v instanceof Boolean b ? b : Boolean.parseBoolean(String.valueOf(v));
    }

    @SuppressWarnings("unchecked")
    public static List<Object> list(Map<String, Object> row, String key) {
        Object v = row == null ? null : row.get(key);
        return v instanceof List<?> l ? (List<Object>) l : List.of();
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> map(Map<String, Object> row, String key) {
        Object v = row == null ? null : row.get(key);
        return v instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
    }

    public static Map<String, Object> row(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < kv.length; i += 2) {
            m.put(String.valueOf(kv[i]), kv[i + 1]);
        }
        return m;
    }
}
