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
 * 行内注释1：ToApiAdapter 为主力（图片先行打通），RelayAdapter 保留给通用中转通道。
 * 行内注释2：Endpoint 快照来自 model_endpoints 表，运行期由后台改价/切通道后失效缓存。
 */
@Configuration
@EnableConfigurationProperties(ToApiProperties.class)
public class AdapterConfig {

    @Bean
    public ModelEndpointRegistry modelEndpointRegistry() {
        return new ModelEndpointRegistry();
    }

    @Bean
    public ChannelRouter channelRouter() {
        return new ChannelRouter();
    }

    @Bean
    public ToApiAdapter toApiAdapter(ToApiProperties props, ObjectMapper mapper) {
        return new ToApiAdapter(props, mapper);
    }

    @Bean
    public RelayAdapter relayAdapter() {
        return new RelayAdapter();
    }
}
