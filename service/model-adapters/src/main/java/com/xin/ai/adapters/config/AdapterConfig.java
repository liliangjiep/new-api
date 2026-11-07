package com.xin.ai.adapters.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xin.ai.adapters.adapters.RelayAdapter;
import com.xin.ai.adapters.adapters.ToApiAdapter;
import com.xin.ai.adapters.base.ModelAdapter;
import com.xin.ai.adapters.registry.ModelEndpointRegistry;
import com.xin.ai.adapters.router.ChannelRouter;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 适配器模块装配。
 * 行内注释1：RelayAdapter 是主力 —— 通用中转站适配器，靠 DB 里的协议模板吃下所有中转站。
 * 行内注释2：ToApiAdapter 保留为「硬编码 ToAPI 形态」的专用实现，便于与通用适配器对照。
 * 行内注释3：Endpoint 快照来自 model_endpoints 表，后台改价/切通道后失效缓存。
 */
@Configuration
@EnableConfigurationProperties(ToApiProperties.class)
public class AdapterConfig {

    @Bean
    public ModelEndpointRegistry modelEndpointRegistry() {
        return new ModelEndpointRegistry();
    }

    /**
     * 多中转站回退路由 —— 熔断、sticky 优先、错误分类回退都在这里。
     * 行内注释2：熔断状态通过 CircuitStore 落库（model_channels.circuit_state）。
     */
    @Bean
    public ChannelRouter channelRouter(
            @org.springframework.beans.factory.annotation.Qualifier("relayCircuitStore")
            ChannelRouter.CircuitStore circuitStore) {
        ChannelRouter router = new ChannelRouter();
        router.setCircuitStore(circuitStore);
        return router;
    }

    @Bean
    public ToApiAdapter toApiAdapter(ToApiProperties props, ObjectMapper mapper) {
        return new ToApiAdapter(props, mapper);
    }

    /**
     * 通用中转站适配器 —— 一个适配器吃 DB 配置，兼容所有中转站。
     */
    @Bean
    public RelayAdapter relayAdapter(ObjectMapper mapper) {
        return new RelayAdapter(mapper);
    }
}
