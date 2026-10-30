package com.xin.ai.worker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Worker 启动入口（M2-01）：队列消费者 + Quartz 调度。
 * 行内注释1：与 api 同库不同入口，复用 domain/adapters。
 * TODO(API): RQueue 监听器与 Quartz Job 待 M3 接入。
 */
@SpringBootApplication(scanBasePackages = "com.xin.ai")
public class WorkerApplication {
    public static void main(String[] args) {
        SpringApplication.run(WorkerApplication.class, args);
    }
}
