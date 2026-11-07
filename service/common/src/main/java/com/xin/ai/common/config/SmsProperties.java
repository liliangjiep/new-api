package com.xin.ai.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 短信服务配置。
 * 行内注释1：mode=mock 时本地生成验证码并在响应里回传 dev_code（仅开发体验用）；
 *             mode=real 时必须配置服务商凭据，响应里不再回传 dev_code。
 * 行内注释2：real 模式下凭据缺失直接抛错启动，避免「以为接了短信其实还在吐验证码」。
 */
@ConfigurationProperties(prefix = "xin.sms")
public class SmsProperties {

    /** mock / real。 */
    private String mode = "mock";
    /** 阿里云 / tencent / aliyun 等。 */
    private String provider = "aliyun";
    private String accessKeyId = "";
    private String accessKeySecret = "";
    private String signName = "";
    private String templateCode = "";

    public String mode() { return mode; }
    public void setMode(String v) { this.mode = v; }
    public String provider() { return provider; }
    public void setProvider(String v) { this.provider = v; }
    public String accessKeyId() { return accessKeyId; }
    public void setAccessKeyId(String v) { this.accessKeyId = v; }
    public String accessKeySecret() { return accessKeySecret; }
    public void setAccessKeySecret(String v) { this.accessKeySecret = v; }
    public String signName() { return signName; }
    public void setSignName(String v) { this.signName = v; }
    public String templateCode() { return templateCode; }
    public void setTemplateCode(String v) { this.templateCode = v; }

    /** 是否真实下发（决定响应里是否带 dev_code）。 */
    public boolean realMode() { return "real".equalsIgnoreCase(mode); }
}
