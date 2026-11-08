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

    /**
     * 文本对话服务 —— Agent 的对话后端。
     * 行内注释3：优先调 DB 里配置的 chat.text.* 接入点（真实文本模型），
     *            未配置时回落本地结构化应答，保证 SSE 链路始终可用。
     */
    @Bean
    public com.xin.ai.domain.service.ChatService chatService(
            RelayConfigService relayConfig,
            @org.springframework.beans.factory.annotation.Qualifier("relayAdapter")
            com.xin.ai.adapters.adapters.RelayAdapter adapter,
            com.xin.ai.adapters.router.ChannelRouter router,
            com.xin.ai.common.cache.RedisService redis) {
        return new com.xin.ai.domain.service.ChatService(relayConfig, adapter, router, redis);
    }

    /**
     * 熔断状态落库器 —— 把 ChannelRouter 的熔断判定接到 model_channels.circuit_state。
     * 行内注释4：多实例部署时熔断状态要共享，否则每个实例都以为别的实例还活着，
     *            会同时猛打一个已经挂掉的站。
     */
    @Bean("relayCircuitStore")
    public com.xin.ai.adapters.router.ChannelRouter.CircuitStore relayCircuitStore(
            RelayConfigService relayConfig) {
        return new com.xin.ai.adapters.router.ChannelRouter.CircuitStore() {
            @Override
            public com.xin.ai.adapters.router.ChannelRouter.CircuitState load(String channelId) {
                RelayConfigService.CircuitState st = relayConfig.circuitState(channelId);
                return st == null ? null
                        : new com.xin.ai.adapters.router.ChannelRouter.CircuitState(
                                st.state(), st.consecutiveFailures(), st.openUntilEpochMillis());
            }

            @Override
            public void onSuccess(String channelId) {
                relayConfig.markChannelSuccess(channelId);
            }

            @Override
            public void onFailure(String channelId, int consecutiveFailures, int threshold,
                    long openUntilEpochMillis) {
                relayConfig.markChannelFailure(channelId, consecutiveFailures, threshold, openUntilEpochMillis);
            }
        };
    }
}
