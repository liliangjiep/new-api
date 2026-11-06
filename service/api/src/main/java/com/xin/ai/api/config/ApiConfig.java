package com.xin.ai.api.config;

import com.xin.ai.common.config.ExecutorConfig;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

/**
 * API 模块装配。
 * 行内注释1：显式 Import ExecutorConfig —— common 的 @Configuration 需被扫描或导入才能生效。
 */
@Configuration
@EnableConfigurationProperties
@Import(ExecutorConfig.class)
public class ApiConfig {}
