package com.xin.ai.domain.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xin.ai.domain.repository.DataStore;
import com.xin.ai.domain.repository.MemStore;
import com.xin.ai.domain.repository.MySqlDataStore;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 领域模块装配：仓储实现按配置切换。
 * 行内注释1：xin.store.type = memory | mysql —— 切库只改配置，Service 层零改动。
 * 行内注释2：MySQL 模式依赖 DataSource（Spring Boot 自动配置），Flyway 先跑完建表再启动业务 Bean。
 * 行内注释3：内存模式保留，作为无数据库环境的开发/测试回退。
 */
@Configuration
public class DomainConfig {

    /**
     * MySQL 仓储 —— xin.store.type=mysql 时生效。
     */
    @Bean
    @ConditionalOnProperty(name = "xin.store.type", havingValue = "mysql")
    public DataStore mySqlDataStore(DataSource dataSource, ObjectMapper mapper) {
        return new MySqlDataStore(dataSource, mapper);
    }

    /**
     * 内存仓储 —— 默认（xin.store.type 缺省或为 memory 时生效）。
     */
    @Bean
    @ConditionalOnProperty(name = "xin.store.type", havingValue = "memory", matchIfMissing = true)
    public DataStore memStore() {
        return new MemStore();
    }

    /**
     * 内存仓储的直接引用 —— 少数需要 MemStore 具体类型的旧代码用。
     */
    @Bean
    @ConditionalOnProperty(name = "xin.store.type", havingValue = "memory", matchIfMissing = true)
    public MemStore legacyMemStore() {
        return new MemStore();
    }

    /**
     * 任务事件总线 —— SSE 进度推送的发布订阅通道。
     * 行内注释4：独立成 Bean 便于将来替换为 Redis Pub/Sub（多实例部署时进程内广播不够）。
     */
    @Bean
    public com.xin.ai.domain.service.TaskEventBus taskEventBus() {
        return new com.xin.ai.domain.service.TaskEventBus();
    }
}
