package com.xin.ai.domain.service;

import com.xin.ai.domain.entity.TaskEntity;
import java.util.List;

/**
 * M2-10 任务 Service 接口：单一聚合根，事务边界在此。
 * 行内注释1：@Transactional 标在 Impl 方法上，Handler 跨服务编排不加事务。
 */
public interface TaskService {
    // 行内注释2：提交 —— 冻结积分 + 入队，幂等键去重。
    TaskEntity submit(String userId, String modelKey, String paramsJson, String idempotencyKey);
    // 行内注释3：查询 —— 按用户隔离，越权直接 404 不暴露存在性。
    TaskEntity getForUser(String taskId, String userId);
    List<TaskEntity> listForUser(String userId, int page, int pageSize);
}
