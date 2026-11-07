package com.xin.ai.common.config;

import com.xin.ai.common.cache.RedisService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * common 模块配置装配入口。
 * 行内注释1：JwtProperties 等 @ConfigurationProperties 需要显式 enable，否则不会注入。
 * 行内注释2：RedisService 依赖 StringRedisTemplate —— Redis starter 在 classpath 时自动配置该 bean。
 * 行内注释3：Redis 连不上不会导致启动失败 —— RedisService 首次访问失败即降级到进程内缓存。
 */
@Configuration
@EnableConfigurationProperties({JwtProperties.class, SmsProperties.class})
public class CommonConfig {

    @Bean
    @ConditionalOnClass(StringRedisTemplate.class)
    public RedisService redisService(StringRedisTemplate template) {
        return new RedisService(template);
    }
}
