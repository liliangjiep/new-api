package com.xin.ai.api.modules.task;

import com.xin.ai.domain.repository.DataStore;
import com.xin.ai.domain.repository.Rows;
import com.xin.ai.domain.service.TaskOrchestrator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 任务巡检器（watchdog）—— 定时把 pending 任务送进上游。
 * 行内注释1：为什么需要它 —— 提交接口只负责建单 + 冻结积分，真正跑上游是异步的。
 *             没有 watchdog 的话任务会永远停在 pending（前端只能看到「提交中」）。
 * 行内注释2：本地锁（in-process set）防止同一任务被重复投递；
 *             多实例部署时靠 tasks.status='pending' 的条件更新做互斥。
 * 行内注释3：只处理 pending；running 的任务由 TaskExecutor 内部轮询到终态。
 */
@Component
public class TaskWatchdog {

    private static final Logger log = LoggerFactory.getLogger(TaskWatchdog.class);

    /** 行内注释4：单批最多投递多少个任务，避免一次性打爆上游。 */
    private static final int BATCH_LIMIT = 20;

    private final DataStore store;
    private final TaskOrchestrator tasks;
    private final TaskExecutor executor;
    private final Executor ioExecutor;
    /** 行内注释5：正在投递中的任务 ID —— 进程内去重。 */
    private final Set<String> inflight = ConcurrentHashMap.newKeySet();

    public TaskWatchdog(DataStore store, TaskOrchestrator tasks, TaskExecutor executor,
            @Qualifier("ioExecutor") Executor ioExecutor) {
        this.store = store;
        this.tasks = tasks;
        this.executor = executor;
        this.ioExecutor = ioExecutor;
    }

    /** 行内注释6：每 2 秒扫一次 pending 任务并投递。 */
    @Scheduled(fixedDelay = 2000L, initialDelay = 5000L)
    public void dispatch() {
        List<Map<String, Object>> pending = store.listWhere(TaskOrchestrator.T_TASKS,
                r -> "pending".equals(Rows.str(r, "status")));
        if (pending.isEmpty()) {
            return;
        }
        int n = 0;
        for (Map<String, Object> task : pending) {
            if (n >= BATCH_LIMIT) {
                break;
            }
            String taskId = Rows.str(task, "id");
            if (taskId.isBlank() || !inflight.add(taskId)) {
                continue;
            }
            n++;
            ioExecutor.execute(() -> {
                try {
                    executor.execute(taskId);
                } catch (Exception e) {
                    log.warn("watchdog 执行失败 task={} err={}", taskId, e.getMessage());
                } finally {
                    inflight.remove(taskId);
                }
            });
        }
        if (n > 0) {
            log.debug("watchdog 投递 {} 个 pending 任务", n);
        }
    }
}
