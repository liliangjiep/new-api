package com.xin.ai.common.security;

import java.nio.charset.StandardCharsets;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * 轻量 JWT 工具：HS256 签名 + Base64URL 编解码。
 * 行内注释1：自实现而非引 jjwt，减少依赖；仅用于内部双 Token，密钥来自配置。
 * 行内注释2：payload 用 JSON 字面量拼装，字段固定可控，避免引入 JSON 库。
 */
public final class JwtUtils {

    private JwtUtils() {}

    private static final String HEADER = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";

    public static String sign(String payloadJson, String secret) {
        String head = base64Url(HEADER.getBytes(StandardCharsets.UTF_8));
        String body = base64Url(payloadJson.getBytes(StandardCharsets.UTF_8));
        String content = head + "." + body;
        String sig = base64Url(hmac(content, secret));
        return content + "." + sig;
    }

    // 行内注释3：验签 —— 签名不匹配返回 null，上层转 401。
    public static boolean verify(String token, String secret) {
        if (token == null) {
            return false;
        }
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return false;
        }
        String content = parts[0] + "." + parts[1];
        String expect = base64Url(hmac(content, secret));
        return constantTimeEquals(expect, parts[2]);
    }

    // 行内注释4：解出 payload JSON 原文，解析失败返回 null。
    public static String decodePayload(String token) {
        if (token == null) {
            return null;
        }
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return null;
        }
        try {
            return new String(java.util.Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static byte[] hmac(String content, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(content.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("hmac failed", e);
        }
    }

    private static String base64Url(byte[] data) {
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    // 行内注释5：常量时间比较，避免时序侧信道。
    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) {
            return false;
        }
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }
}
