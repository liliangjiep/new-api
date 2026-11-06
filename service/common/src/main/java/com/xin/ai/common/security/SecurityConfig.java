package com.xin.ai.common.security;

import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.common.dto.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import org.slf4j.MDC;
import com.xin.ai.common.web.TraceIdFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * 安全配置：JWT 双 Token + RBAC 方法级鉴权。
 * 行内注释1：STATELESS 会话，Token 全部走 Authorization 头。
 * 行内注释2：公开路径白名单与后端接口文档一致（auth/**、公开模型路由、静态资源、actuator）。
 * 行内注释3：未认证请求统一返回 {error:{code:"auth.unauthorized"}}，前端 api.ts 读 payload.error.code。
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    /** 行内注释4：公开路径白名单 —— 新增公开接口时同步维护此处与 docs/new-ai-后端接口-V1.md。 */
    public static final String[] PUBLIC_PATHS = {
        "/api/v1/auth/**",
        "/api/v1/model-routes/public",
        "/api/v1/capabilities/public",
        "/api/v1/pricing/table",
        "/api/v1/recharge/packages",
        "/api/v1/skills/**",
        "/api/v1/discover/**",
        "/api/v1/canvases/templates",
        "/actuator/**",
        "/error"
    };

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter, ObjectMapper mapper)
            throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .cors(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.requestMatchers(PUBLIC_PATHS).permitAll().anyRequest().authenticated())
                .exceptionHandling(ex -> ex.authenticationEntryPoint((req, res, e) -> {
                    ErrorResponse.ErrorBody body = new ErrorResponse.ErrorBody(
                            ErrorCode.AUTH_UNAUTHORIZED.code(),
                            ErrorCode.AUTH_UNAUTHORIZED.message(),
                            Map.of(),
                            MDC.get(TraceIdFilter.MDC_KEY));
                    res.setStatus(ErrorCode.AUTH_UNAUTHORIZED.httpStatus());
                    res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    res.setCharacterEncoding("UTF-8");
                    mapper.writeValue(res.getWriter(), new ErrorResponse(body));
                }))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
