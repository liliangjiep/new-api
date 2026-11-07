package com.xin.ai.domain.service;

import com.xin.ai.common.config.SmsProperties;
import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * 短信发送器 —— mock/real 双模式。
 * 行内注释1：mock 模式不发短信（由调用方回传 dev_code）；real 模式走服务商 HTTP API。
 * 行内注释2：目前内置阿里云短信（Aliyun SMS）签名实现；腾讯云 SMS 需要另写一套签名，
 *             届时按 provider 分派即可，业务侧调用方式不变。
 * 行内注释3：凭据缺失直接抛错 —— 避免「以为接了短信，实际没发出去」静默失败。
 */
final class SmsSender {

    private SmsSender() {}

    /** 阿里云短信 API 域名（按地域可切 dysmsapi.aliyuncs.com / dysmsapi.ap-southeast-1.aliyuncs.com）。 */
    private static final String ALIYUN_HOST = "dysmsapi.aliyuncs.com";

    /** 真实下发；凭据不全直接抛错。 */
    static void send(SmsProperties cfg, String phone, String code) {
        if (cfg.accessKeyId() == null || cfg.accessKeyId().isBlank()
                || cfg.accessKeySecret() == null || cfg.accessKeySecret().isBlank()
                || cfg.signName() == null || cfg.signName().isBlank()
                || cfg.templateCode() == null || cfg.templateCode().isBlank()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST,
                    Map.of("message", "短信通道未配置完整，无法真实下发验证码"));
        }
        if ("aliyun".equalsIgnoreCase(cfg.provider())) {
            sendAliyun(cfg, phone, code);
            return;
        }
        // 行内注释4：未知 provider —— 不静默吞掉，直接报错让配置方看见。
        throw new BizException(ErrorCode.COMMON_BAD_REQUEST,
                Map.of("message", "暂不支持的短信服务商：" + cfg.provider()));
    }

    /** 阿里云短信：签名串 + HMAC-SHA1 + Base64，参数按字典序拼接。 */
    private static void sendAliyun(SmsProperties cfg, String phone, String code) {
        try {
            Map<String, String> params = new LinkedHashMap<>();
            params.put("Action", "SendSms");
            params.put("Version", "2017-05-25");
            params.put("RegionId", "cn-hangzhou");
            params.put("PhoneNumbers", phone);
            params.put("SignName", cfg.signName());
            params.put("TemplateCode", cfg.templateCode());
            params.put("TemplateParam", "{\"code\":\"" + code + "\"}");
            params.put("AccessKeyId", cfg.accessKeyId());

            // 行内注释5：Format=JSON 时公共参数也要参与签名。
            params.put("Format", "JSON");
            params.put("SignatureMethod", "HMAC-SHA1");
            params.put("SignatureVersion", "1.0");
            params.put("SignatureNonce", java.util.UUID.randomUUID().toString());
            params.put("Timestamp", Instant.now().toString());

            String canonicalQuery = canonicalize(params);
            String stringToSign = "POST&%2F&" + urlEncode(canonicalQuery);
            String signature = sign(stringToSign, cfg.accessKeySecret() + "&");

            Map<String, String> query = new LinkedHashMap<>(params);
            query.put("Signature", signature);

            String body = "{\"PhoneNumbers\":\"" + phone + "\",\"SignName\":\"" + cfg.signName()
                    + "\",\"TemplateCode\":\"" + cfg.templateCode()
                    + "\",\"TemplateParam\":\"{\\\"code\\\":\\\"" + code + "\\\"}\"}";

            HttpURLConnection conn = (HttpURLConnection) URI.create(
                    "https://" + ALIYUN_HOST + "/?" + canonicalize(query)).toURL().openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setRequestProperty("Content-Type", "application/json;charset=UTF-8");
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }
            int code2 = conn.getResponseCode();
            if (code2 < 200 || code2 >= 300) {
                throw new BizException(ErrorCode.COMMON_INTERNAL_ERROR,
                        Map.of("message", "短信下发失败，HTTP " + code2));
            }
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            throw new BizException(ErrorCode.COMMON_INTERNAL_ERROR,
                    Map.of("message", "短信下发异常：" + e.getMessage()));
        }
    }

    /** 参数按 key 字典序拼接为 k1=v1&k2=v2。 */
    private static String canonicalize(Map<String, String> params) {
        return params.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> urlEncode(e.getKey()) + "=" + urlEncode(e.getValue()))
                .reduce((a, b) -> a + "&" + b)
                .orElse("");
    }

    /** RFC3986 编码（空格 %20，~ 不转义）。 */
    private static String urlEncode(String s) {
        try {
            return URLEncoder.encode(s, StandardCharsets.UTF_8)
                    .replace("+", "%20")
                    .replace("*", "%2A")
                    .replace("%7E", "~");
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** HMAC-SHA1 后 Base64。 */
    private static String sign(String stringToSign, String key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA1"));
        return java.util.Base64.getEncoder().encodeToString(mac.doFinal(stringToSign.getBytes(StandardCharsets.UTF_8)));
    }
}
