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

    /**
     * 字段值与目标字符串比较（null 安全）。
     * 行内注释1.1：为什么需要它 —— str(row, key) 在字段缺失时返回 null，
     *               直接写 Rows.str(r, "user_id").equals(uid) 会 NPE。
     *               而 entity_rows 里不同表/不同版本写入的行字段并不齐备，
     *               所以「字段可能缺失」是常态，不是异常。
     * 行内注释1.2：语义与 "value.equals(target)" 完全一致（target 为 null 时返回 false），
     *               只是不再抛 NPE —— 字段缺失一律视为「不匹配」。
     */
    public static boolean strEq(Map<String, Object> row, String key, String target) {
        if (target == null) {
            return false;
        }
        return target.equals(str(row, key));
    }

    /** 同 strEq，但忽略大小写（对应 equalsIgnoreCase）。 */
    public static boolean strEqIgnoreCase(Map<String, Object> row, String key, String target) {
        String v = str(row, key);
        if (v == null || target == null) {
            return false;
        }
        return v.equalsIgnoreCase(target);
    }

    /** 字段值是否包含目标子串（对应 value.contains(target)，null 安全）。 */
    public static boolean strContains(Map<String, Object> row, String key, String target) {
        String v = str(row, key);
        if (v == null || target == null) {
            return false;
        }
        return v.contains(target);
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
