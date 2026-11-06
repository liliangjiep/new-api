package com.xin.ai.domain.config;

import com.xin.ai.domain.repository.MemStore;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 领域模块装配：内存仓储单例。
 * 行内注释1：本期无 PG 环境，全局共用一个 MemStore 实例承载所有表。
 * 行内注释2：切 MyBatis-Plus 时，此 Bean 换成 DataSource + Mapper 装配即可，Service 层无需改。
 */
@Configuration
public class DomainConfig {

    @Bean
    public MemStore memStore() {
        return new MemStore();
    }
}
