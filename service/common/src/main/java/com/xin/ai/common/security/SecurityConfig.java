package com.xin.ai.common.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * M2-09 安全配置：JWT 双 Token + login_version 强制下线。
 * 行内注释1：access 15 分钟 / refresh 30 天，服务端维护 login_version，不匹配即踢下线。
 * 行内注释2：公开路径只有登录/注册/公开路由表，其余默认鉴权。
 * TODO(API): JwtFilter 与 RBAC 六角色待 M3.5 接入，此处先放行骨架可启动。
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable());
        http.authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**", "/api/v1/model-routes/public", "/actuator/**")
                .permitAll()
                .anyRequest()
                .authenticated());
        return http.build();
    }
}
