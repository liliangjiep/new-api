package com.xin.ai.common.config;

import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * M2-06 自定义线程池：业务池 / IO 池 / 调度池三套隔离。
 * 行内注释1：命名规则 xin-{用途}-{序号}，dump 线程时一眼定位。
 * 行内注释2：MDC 透传 —— 提交时快照 traceId，执行前恢复，执行后清理，防止串号。
 * 行内注释3：拒绝策略用 CallerRuns，宁可慢不可丢（丢任务=丢单）。
 * TODO(SPEC): 核心/最大线程数待压测后调优，当前为保守值。
 */
@Configuration
public class ExecutorConfig {

    // 行内注释4：业务池 —— 计费/报价等短任务，CPU 密集型。
    @Bean("bizExecutor")
    public Executor bizExecutor() {
        return namedPool("biz", 8, 16, 1000);
    }

    // 行内注释5：IO 池 —— 调上游模型/OSS，等待多，线程给足。
    @Bean("ioExecutor")
    public Executor ioExecutor() {
        return namedPool("io", 16, 64, 2000);
    }

    // 行内注释6：调度池 —— watchdog/对账/巡检定时任务，单线程排队即可。
    @Bean("schedulerExecutor")
    public Executor schedulerExecutor() {
        return namedPool("sched", 2, 4, 500);
    }

    // 行内注释7：MDC 透传装饰器 —— 包一层，不改业务代码。
    private Executor namedPool(String name, int core, int max, int queue) {
        AtomicInteger seq = new AtomicInteger(1);
        ThreadPoolExecutor pool = new ThreadPoolExecutor(
                core, max, 60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(queue),
                r -> {
                    Thread t = new Thread(r, "xin-" + name + "-" + seq.getAndIncrement());
                    t.setDaemon(false);
                    return t;
                },
                new ThreadPoolExecutor.CallerRunsPolicy());
        return task -> {
            Map<String, String> ctx = MDC.getCopyOfContextMap();
            pool.execute(() -> {
                if (ctx != null) {
                    MDC.setContextMap(ctx);
                }
                try {
                    task.run();
                } finally {
                    MDC.clear();
                }
            });
        };
    }
}
