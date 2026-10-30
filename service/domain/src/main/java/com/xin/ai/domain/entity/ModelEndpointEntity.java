package com.xin.ai.domain.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * M2-10 接入点实体（model_endpoints）★ 核心表。
 * 行内注释1：model_key 映射前台能力，upstream_model 映射上游真实模型名，两者可不同。
 * 行内注释2：sort_order 即降级顺序，数字越小越优先。
 */
@TableName("model_endpoints")
public class ModelEndpointEntity {
    @TableId
    private String id;
    private String modelKey;
    private String capability;
    private String displayName;
    private String channelId;
    private String baseUrl;
    private String upstreamModel;
    private String secretRef;
    private Integer timeoutMs;
    private Integer maxRetries;
    private Integer rpmLimit;
    private Boolean enabled;
    private Boolean isDefault;
    private BigDecimal costRatio;
    private Integer sortOrder;
    private String configJson;
    private LocalDateTime updatedAt;
    private String updatedBy;
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getModelKey() { return modelKey; }
    public void setModelKey(String v) { this.modelKey = v; }
    public String getCapability() { return capability; }
    public void setCapability(String v) { this.capability = v; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String v) { this.displayName = v; }
    public String getChannelId() { return channelId; }
    public void setChannelId(String v) { this.channelId = v; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String v) { this.baseUrl = v; }
    public String getUpstreamModel() { return upstreamModel; }
    public void setUpstreamModel(String v) { this.upstreamModel = v; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean v) { this.enabled = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
}
