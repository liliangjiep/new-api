package com.xin.ai.api.modules.auth;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.security.AuthContext;
import com.xin.ai.common.security.CurrentUser;
import com.xin.ai.domain.service.AuthService;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证与用户接口（文档 §2.1）。
 * 行内注释1：短信与密码双轨登录，新号自动注册。
 * 行内注释2：登出为 204 无内容，前端 api.ts 对 204 已有处理（直接返回 undefined）。
 */
@RestController
@RequestMapping("/api/v1")
public class AuthController extends BaseController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /** 发送短信验证码（冷却 60 秒，同 IP 5 次/10 分钟限流）。 */
    @PostMapping("/auth/sms/send")
    public ApiResponse<Map<String, Object>> sendSmsCode(@RequestBody SmsSendRequest req) {
        return ok(authService.sendSmsCode(req.phone()));
    }

    /** 校验验证码并登录（新号自动注册）。 */
    @PostMapping("/auth/sms/verify")
    public ApiResponse<Map<String, Object>> verifySmsCode(@RequestBody SmsVerifyRequest req) {
        return ok(authService.verifySmsCode(req.phone(), req.code()));
    }

    /** 账号密码登录，失败 5 次锁 15 分钟。 */
    @PostMapping("/auth/password/login")
    public ApiResponse<Map<String, Object>> passwordLogin(@RequestBody PasswordLoginRequest req) {
        return ok(authService.passwordLogin(req.account(), req.password()));
    }

    /** 刷新 access token（refresh 轮换）。 */
    @PostMapping("/auth/refresh")
    public ApiResponse<Map<String, Object>> refresh(@RequestBody RefreshRequest req) {
        return ok(authService.refresh(req.refreshToken()));
    }

    /** 登出，作废 refresh token。 */
    @PostMapping("/auth/logout")
    public ApiResponse<Void> logout(@RequestBody(required = false) RefreshRequest req) {
        if (req != null) {
            authService.logout(req.refreshToken());
        }
        return ok();
    }

    /** 会话列表。 */
    @GetMapping("/auth/sessions")
    public ApiResponse<List<Map<String, Object>>> sessions(@CurrentUser AuthContext.Principal user) {
        return list(authService.listSessions(user.userId(), ""));
    }

    /** 下线指定会话。 */
    @DeleteMapping("/auth/sessions/{id}")
    public ApiResponse<Void> revokeSession(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        authService.revokeSession(user.userId(), id);
        return ok();
    }

    // ---------------- 请求体 ----------------

    public record SmsSendRequest(@NotBlank String phone) {}

    public record SmsVerifyRequest(@NotBlank String phone, @NotBlank String code) {}

    public record PasswordLoginRequest(@NotBlank String account, @NotBlank String password) {}

    public record RefreshRequest(String refreshToken) {}
}
