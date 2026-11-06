package com.xin.ai.domain.config;

import com.xin.ai.domain.service.RelayConfigService;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 中转站配置装配。
 * 行内注释1：密钥加密口令来自环境变量 XIN_CHANNEL_KEY_SECRET；未配置时用开发默认值。
 * 行内注释2：生产务必覆盖该环境变量，否则中转站密钥只是「编码」而非「加密」。
 */
@Configuration
public class RelayConfig {

    @Bean
    public RelayConfigService.SecretBox channelSecretBox(
            @Value("${xin.channel.key-secret:xin-ai-dev-channel-secret}") String secret) {
        return new RelayConfigService.SecretBox(secret);
    }

    @Bean
    public RelayConfigService relayConfigService(DataSource dataSource,
            RelayConfigService.SecretBox secretBox) {
        return new RelayConfigService(dataSource, secretBox);
    }
}
