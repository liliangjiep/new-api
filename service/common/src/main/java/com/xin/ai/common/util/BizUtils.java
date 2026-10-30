package com.xin.ai.common.util;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Objects;
import java.util.UUID;

/**
 * M2-03 工具类合集（小方法拆分：每个方法只做一件事）。
 * 行内注释1：全部静态无状态，可被任意线程安全调用。
 */
public final class BizUtils {

    private BizUtils() {}

    // 行内注释2：ID 生成 —— 统一 UUID 无横线，DB 主键口径一致。
    public static String newId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    // 行内注释3：断言 —— 失败即抛 BizException，避免 if 嵌套。
    public static void must(boolean condition, com.xin.ai.common.exception.ErrorCode code) {
        if (!condition) {
            throw new com.xin.ai.common.exception.BizException(code);
        }
    }

    // 行内注释4：日期 —— 统一东八区，避免服务器时区漂移。
    private static final ZoneId ZONE = ZoneId.of("Asia/Shanghai");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public static String today() {
        return LocalDate.now(ZONE).format(DAY);
    }

    public static long nowMillis() {
        return Instant.now().toEpochMilli();
    }

    // 行内注释5：脱敏 —— 手机号保留前3后4，日志与响应共用。
    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return "***";
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    // 行内注释6：空安全 equals，集合 stream 前先过滤 null 用它。
    public static boolean safeEquals(Object a, Object b) {
        return Objects.equals(a, b);
    }
}
