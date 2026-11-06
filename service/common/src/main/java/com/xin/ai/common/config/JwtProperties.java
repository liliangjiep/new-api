package com.xin.ai.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT 配置：密钥与双 Token 有效期。
 * 行内注释1：密钥来自环境变量 XIN_JWT_SECRET，未配置时用开发默认值（生产必须覆盖）。
 * 行内注释2：access 15 分钟 / refresh 30 天，与技术架构 §5.1 一致。
 */
@ConfigurationProperties(prefix = "xin.jwt")
public class JwtProperties {

    private String secret = "xin-ai-dev-secret-change-me";
    private long accessTtlSeconds = 900L;
    private long refreshTtlSeconds = 2592000L;

    public String secret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }
    public long accessTtlSeconds() { return accessTtlSeconds; }
    public void setAccessTtlSeconds(long v) { this.accessTtlSeconds = v; }
    public long refreshTtlSeconds() { return refreshTtlSeconds; }
    public void setRefreshTtlSeconds(long v) { this.refreshTtlSeconds = v; }
}
