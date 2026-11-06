package com.xin.ai.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * API 启动入口（M2-01）。
 * 行内注释1：扫描 com.xin.ai 全包，把 common/domain/adapters 的 Bean 一次装配。
 * 行内注释2：@EnableScheduling —— 任务巡检器（watchdog）依赖定时扫描 pending 任务，
 *             没有它任务会永远停在 pending（前端看到「提交中」）。
 */
@SpringBootApplication(scanBasePackages = "com.xin.ai")
@EnableScheduling
public class ApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiApplication.class, args);
    }
}
