package com.xin.ai.domain.service;

import com.xin.ai.domain.entity.TaskEntity;

/**
 * M3-14 任务编排 Handler 占位：跨多个 Service 编排，不加事务。
 * 行内注释1：Handler 只做编排 —— 1报价→2冻结→3路由→4入队→5结算，每步一个小方法。
 * 行内注释2：跨域一致性用补偿+幂等，不用大事务包网络调用。
 * TODO(API): M3 实现时拆成 quote1/freeze2/route3/enqueue4/settle5 五个小方法。
 */
public class TaskSubmitHandler {

    private final ChannelRouter router = new ChannelRouter();

    public TaskEntity handle(String userId, String modelKey, String paramsJson, String idemKey) {
        // 行内注释3：占位直接返回 pending 任务，真实编排待 M3。
        TaskEntity t = new TaskEntity();
        t.setId(idemKey);
        t.setModelKey(modelKey);
        t.setStatus("pending");
        t.setIdempotencyKey(idemKey);
        return t;
    }
}
