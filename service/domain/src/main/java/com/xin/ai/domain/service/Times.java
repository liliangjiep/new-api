package com.xin.ai.domain.service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * 时间格式化：统一东八区与两种输出格式。
 * 行内注释1：列表用「MM-dd HH:mm」，详情用「yyyy-MM-dd HH:mm:ss」，与前端 mock 数据形态一致。
 * 行内注释2：ISO 8601 带时区偏移，供前端 new Date() 解析。
 */
public final class Times {

    private Times() {}

    public static final ZoneId ZONE = ZoneId.of("Asia/Shanghai");
    private static final DateTimeFormatter LIST = DateTimeFormatter.ofPattern("MM-dd HH:mm");
    private static final DateTimeFormatter FULL = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public static String list(LocalDateTime t) {
        return t == null ? "" : t.format(LIST);
    }

    public static String full(LocalDateTime t) {
        return t == null ? "" : t.format(FULL);
    }

    public static String iso(LocalDateTime t) {
        return t == null ? null : t.atZone(ZONE).toInstant().toString();
    }

    public static String isoNow() {
        return Instant.now().toString();
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(ZONE);
    }

    // 行内注释3：解析 full 格式（yyyy-MM-dd HH:mm:ss）—— LocalDateTime.parse 默认只认 ISO 的 'T' 分隔，
    // 因此这里显式指定 formatter，避免各处直接 parse 抛 DateTimeParseException。
    public static LocalDateTime parse(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        return LocalDateTime.parse(text, FULL);
    }

    public static LocalDateTime plusSeconds(long seconds) {
        return now().plusSeconds(seconds);
    }
}
