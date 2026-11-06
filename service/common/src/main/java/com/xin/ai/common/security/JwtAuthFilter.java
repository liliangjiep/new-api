package com.xin.ai.common.security;

import com.xin.ai.common.config.JwtProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * JWT 鉴权过滤器：解析 Bearer Token → 写入 SecurityContext 与 AuthContext。
 * 行内注释1：公开路径（auth/**、model-routes/public、actuator）在 SecurityConfig 放行，此处无 Token 直接放过。
 * 行内注释2：必须同时写 SecurityContext —— SecurityConfig 用 anyRequest().authenticated()，
 *           只写 ThreadLocal 会导致下游判定为未认证而直接 401。
 * 行内注释3：Token 无效时不直接 401，而是继续放行 —— 由下游鉴权点决定是否需要登录，避免误伤公开接口。
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtProperties jwtProperties;

    public JwtAuthFilter(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            String header = request.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
                String token = header.substring(7).trim();
                if (JwtUtils.verify(token, jwtProperties.secret())) {
                    String payload = JwtUtils.decodePayload(token);
                    AuthContext.Principal principal = parse(payload);
                    if (principal != null) {
                        AuthContext.set(principal);
                        // 行内注释4：写入 SecurityContext，authority 用 role，前缀 ROLE_。
                        SecurityContextHolder.getContext().setAuthentication(
                                new UsernamePasswordAuthenticationToken(
                                        principal, null,
                                        List.of(new SimpleGrantedAuthority("ROLE_" + principal.role()))));
                    }
                }
            }
            chain.doFilter(request, response);
        } finally {
            AuthContext.clear();
            SecurityContextHolder.clearContext();
        }
    }

    // 行内注释5：解析 payload —— 字段缺失或格式不对返回 null，不抛异常打断链路。
    private AuthContext.Principal parse(String payloadJson) {
        if (payloadJson == null) {
            return null;
        }
        try {
            Map<String, Object> claims = JsonLite.parseObject(payloadJson);
            Object sub = claims.get("sub");
            if (sub == null) {
                return null;
            }
            String userId = String.valueOf(sub);
            String phone = claims.get("phone") == null ? null : String.valueOf(claims.get("phone"));
            String role = claims.get("role") == null ? "USER" : String.valueOf(claims.get("role"));
            Object lv = claims.get("lv");
            int loginVersion = lv == null ? 0 : Integer.parseInt(String.valueOf(lv));
            return new AuthContext.Principal(userId, phone, role, loginVersion, claims);
        } catch (RuntimeException e) {
            return null;
        }
    }
}
