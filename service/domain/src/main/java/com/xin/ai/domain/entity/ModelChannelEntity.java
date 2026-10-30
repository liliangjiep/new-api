package com.xin.ai.domain.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * M2-10 通道实体（model_channels）。
 * 行内注释1：secret 只存引用，密钥本体在 KMS，DB 泄露不泄露密钥。
 * 行内注释2：costRatio 拿货系数，1.0=刊例价，0.85=中转 85 折。
 */
@TableName("model_channels")
public class ModelChannelEntity {
    @TableId
    private String id;
    private String name;
    private String provider;
    private String baseUrl;
    private String secretRef;
    private Integer priority;
    private String status;
    private Integer rpmLimit;
    private Integer qpsLimit;
    private BigDecimal costRatio;
    private String circuitState;
    private BigDecimal balance;
    private LocalDateTime updatedAt;
    private String updatedBy;
    // 行内注释3：getter/setter 用 IDE 生成，保持 POJO 风格，MyBatis-Plus 映射用字段名。
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    public String getSecretRef() { return secretRef; }
    public void setSecretRef(String secretRef) { this.secretRef = secretRef; }
    public Integer getPriority() { return priority; }
    public void setPriority(Integer priority) { this.priority = priority; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public BigDecimal getCostRatio() { return costRatio; }
    public void setCostRatio(BigDecimal costRatio) { this.costRatio = costRatio; }
    public String getCircuitState() { return circuitState; }
    public void setCircuitState(String circuitState) { this.circuitState = circuitState; }
}
