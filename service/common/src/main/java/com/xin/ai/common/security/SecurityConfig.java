package com.xin.ai.common.security;

import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.common.config.AdminProperties;
import com.xin.ai.common.dto.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.function.Supplier;
import org.slf4j.MDC;
import com.xin.ai.common.web.TraceIdFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

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
        // 行内注释4.2：公共素材库 —— 面向全体用户的素材展示，无需登录即可浏览（前台素材中心用）。
        "/api/v1/public-assets",
        "/actuator/**",
        "/error"
    };

    /** 行内注释4.1：后台路径前缀 —— 需要 ADMIN / OPERATOR 角色（见 xin.admin.roles）。 */
    public static final String ADMIN_PATH_PREFIX = "/api/v1/admin";

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter, ObjectMapper mapper,
            AdminProperties adminProps)
            throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .cors(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_PATHS).permitAll()
                        // 行内注释4.2：后台路径单独走角色校验 —— 未登录 401，登录了但角色不够 403。
                        //             用自定义 AuthorizationManager 而不是 @PreAuthorize，
                        //             是因为可访问角色来自配置（xin.admin.roles），不能写死在注解里。
                        .requestMatchers(ADMIN_PATH_PREFIX + "/**").access(adminRoleManager(adminProps))
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> {
                    // 行内注释4.3：已登录但角色不足 —— 返回 403 auth.forbidden（不是 401，
                    //             否则前端 api.ts 会把用户踢回登录页，体验上像是「登录失效」）。
                    ex.accessDeniedHandler((req, res, e) -> {
                        ErrorResponse.ErrorBody body = new ErrorResponse.ErrorBody(
                                ErrorCode.AUTH_FORBIDDEN.code(),
                                ErrorCode.AUTH_FORBIDDEN.message(),
                                Map.of(),
                                MDC.get(TraceIdFilter.MDC_KEY));
                        res.setStatus(ErrorCode.AUTH_FORBIDDEN.httpStatus());
                        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                        res.setCharacterEncoding("UTF-8");
                        mapper.writeValue(res.getWriter(), new ErrorResponse(body));
                    });
                    ex.authenticationEntryPoint((req, res, e) -> {
                        ErrorResponse.ErrorBody body = new ErrorResponse.ErrorBody(
                                ErrorCode.AUTH_UNAUTHORIZED.code(),
                                ErrorCode.AUTH_UNAUTHORIZED.message(),
                                Map.of(),
                                MDC.get(TraceIdFilter.MDC_KEY));
                        res.setStatus(ErrorCode.AUTH_UNAUTHORIZED.httpStatus());
                        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                        res.setCharacterEncoding("UTF-8");
                        mapper.writeValue(res.getWriter(), new ErrorResponse(body));
                    });
                })
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * 后台角色校验 —— 按 xin.admin.roles 白名单放行 ADMIN / OPERATOR。
     * 行内注释4.4：未认证返回 null（交由 authenticationEntryPoint 出 401），
     *             已认证但角色不在白名单返回 null（交由 accessDeniedHandler 出 403）。
     */
    private AuthorizationManager<RequestAuthorizationContext> adminRoleManager(AdminProperties adminProps) {
        return (Supplier<Authentication> supplier, RequestAuthorizationContext context) -> {
            Authentication authentication = supplier.get();
            if (authentication == null || !authentication.isAuthenticated()) {
                return new AuthorizationDecision(false);
            }
            String role = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(a -> a != null && a.startsWith("ROLE_"))
                    .map(a -> a.substring("ROLE_".length()))
                    .findFirst()
                    .orElse("");
            return new AuthorizationDecision(adminProps.isAdminRole(role));
        };
    }
}
