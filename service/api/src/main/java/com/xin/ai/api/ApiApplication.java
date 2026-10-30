package com.xin.ai.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * API 启动入口（M2-01）。
 * 行内注释1：扫描 com.xin.ai 全包，把 common/domain/adapters 的 Bean 一次装配。
 * TODO(API): 接入后补 @EnableCaching / Redisson 配置。
 */
@SpringBootApplication(scanBasePackages = "com.xin.ai")
public class ApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiApplication.class, args);
    }
}
