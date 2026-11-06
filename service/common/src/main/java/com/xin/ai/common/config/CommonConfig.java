package com.xin.ai.common.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * common 模块配置装配入口。
 * 行内注释1：JwtProperties 等 @ConfigurationProperties 需要显式 enable，否则不会注入。
 */
@Configuration
@EnableConfigurationProperties({JwtProperties.class})
public class CommonConfig {}
