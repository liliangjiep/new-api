package com.xin.ai.adapters.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * ToAPI 透传配置。
 * 行内注释1：baseUrl 与 apiKey 由后端持有，前端不接触密钥。
 * 行内注释2：未配置 apiKey 时，适配器走「未接入」分支，任务直接判失败并退回积分。
 */
@ConfigurationProperties(prefix = "xin.toapi")
public class ToApiProperties {

    private String baseUrl = "https://toapis.cn";
    private String apiKey = "";
    private String imageModel = "gpt-image-2";
    private String videoModel = "seedance-2-mini";
    private int timeoutMs = 60000;
    private int pollIntervalMs = 3000;
    private int maxPollTimes = 40;

    public String baseUrl() { return baseUrl; }
    public void setBaseUrl(String v) { this.baseUrl = v; }
    public String apiKey() { return apiKey; }
    public void setApiKey(String v) { this.apiKey = v; }
    public String imageModel() { return imageModel; }
    public void setImageModel(String v) { this.imageModel = v; }
    public String videoModel() { return videoModel; }
    public void setVideoModel(String v) { this.videoModel = v; }
    public int timeoutMs() { return timeoutMs; }
    public void setTimeoutMs(int v) { this.timeoutMs = v; }
    public int pollIntervalMs() { return pollIntervalMs; }
    public void setPollIntervalMs(int v) { this.pollIntervalMs = v; }
    public int maxPollTimes() { return maxPollTimes; }
    public void setMaxPollTimes(int v) { this.maxPollTimes = v; }

    // 行内注释3：是否已配置密钥 —— 未配置时不应发真实请求。
    public boolean configured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
