package com.xin.ai.domain.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

/**
 * M2-10 任务实体（tasks）+ 幂等键由 task_idempotency 表保证。
 * 行内注释1：状态机 PENDING→RUNNING→DONE/FAILED，watchdog 扫超时 RUNNING 重投。
 * 行内注释2：幂等键唯一索引，重复提交直接返回首单，不重复冻结。
 */
@TableName("tasks")
public class TaskEntity {
    @TableId
    private String id;
    private String userId;
    private String modelKey;
    private String capability;
    private String status;
    private Integer progress;
    private Integer pointsFrozen;
    private Integer pointsCharged;
    private String channelId;
    private String idempotencyKey;
    private String paramsJson;
    private String resultJson;
    private String errorCode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }
    public String getModelKey() { return modelKey; }
    public void setModelKey(String v) { this.modelKey = v; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String v) { this.idempotencyKey = v; }
}
