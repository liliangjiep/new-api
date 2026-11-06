package com.xin.ai.api.modules.user;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.security.AuthContext;
import com.xin.ai.common.security.CurrentUser;
import com.xin.ai.domain.service.UserService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户资料接口（文档 §2.1）。
 * 行内注释1：GET/PATCH /users/me，字段按前端 panels-a ProfilePanel。
 */
@RestController
@RequestMapping("/api/v1/users")
public class UserController extends BaseController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> me(@CurrentUser AuthContext.Principal user) {
        return ok(userService.me(user.userId()));
    }

    @PatchMapping("/me")
    public ApiResponse<Map<String, Object>> updateMe(@CurrentUser AuthContext.Principal user,
            @RequestBody UpdateMeRequest req) {
        return ok(userService.update(user.userId(), req.nickname(), req.email(), req.company(),
                req.bio(), req.avatarAssetId()));
    }

    @PostMapping("/me/password")
    public ApiResponse<Void> changePassword(@CurrentUser AuthContext.Principal user,
            @RequestBody ChangePasswordRequest req) {
        userService.changePassword(user.userId(), req.oldPassword(), req.newPassword());
        return ok();
    }

    public record UpdateMeRequest(String nickname, String email, String company, String bio, String avatarAssetId) {}

    public record ChangePasswordRequest(String oldPassword, String newPassword) {}
}
