package com.xin.ai.domain.service;

import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.domain.repository.MemStore;
import com.xin.ai.domain.repository.Rows;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * 用户资料服务：读取/更新个人资料。
 * 行内注释1：昵称 ≤20 字符、邮箱格式校验、生日上限 120 字符 —— 与前端 ProfilePanel 的校验一致。
 * 行内注释2：手机号是登录账号，不支持自助更换（前端已禁用该输入框）。
 */
@Service
public class UserService {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final int NICKNAME_MAX = 20;
    private static final int BIO_MAX = 120;

    private final MemStore store;

    public UserService(MemStore store) {
        this.store = store;
    }

    public Map<String, Object> me(String userId) {
        Map<String, Object> u = require(userId);
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("id", Rows.str(u, "id"));
        v.put("nickname", Rows.str(u, "nickname", ""));
        v.put("phone", Rows.str(u, "phone", ""));
        v.put("email", Rows.str(u, "email", ""));
        v.put("company", Rows.str(u, "company", ""));
        v.put("bio", Rows.str(u, "bio", ""));
        v.put("avatar_url", Rows.str(u, "avatar_url", ""));
        v.put("role", Rows.str(u, "role", "USER"));
        v.put("balance", Rows.num(u, "balance"));
        v.put("frozen", Rows.num(u, "frozen"));
        v.put("expires_at", "2028-10-28");
        return v;
    }

    // 行内注释3：更新资料 —— 只更新传入字段，未传的不动。
    public Map<String, Object> update(String userId, String nickname, String email, String company,
            String bio, String avatarAssetId) {
        Map<String, Object> patch = new LinkedHashMap<>();
        if (nickname != null) {
            String n = nickname.trim();
            if (n.isEmpty()) {
                throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("field", "nickname", "message", "昵称不能为空"));
            }
            if (n.length() > NICKNAME_MAX) {
                throw new BizException(ErrorCode.COMMON_BAD_REQUEST,
                        Map.of("field", "nickname", "message", "昵称最多 " + NICKNAME_MAX + " 字"));
            }
            patch.put("nickname", n);
        }
        if (email != null) {
            String e = email.trim();
            if (!e.isEmpty() && !EMAIL.matcher(e).matches()) {
                throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("field", "email", "message", "邮箱格式不正确"));
            }
            patch.put("email", e);
        }
        if (company != null) {
            patch.put("company", company.trim());
        }
        if (bio != null) {
            if (bio.length() > BIO_MAX) {
                throw new BizException(ErrorCode.COMMON_BAD_REQUEST,
                        Map.of("field", "bio", "message", "简介最多 " + BIO_MAX + " 字"));
            }
            patch.put("bio", bio);
        }
        if (avatarAssetId != null && !avatarAssetId.isBlank()) {
            patch.put("avatar_url", "https://cdn.local.invalid/assets/" + avatarAssetId);
            patch.put("avatar_asset_id", avatarAssetId);
        }
        store.update(AuthService.T_USERS, userId, patch);
        return me(userId);
    }

    // 行内注释4：修改密码 —— 校验旧密码，写入新哈希。
    public void changePassword(String userId, String oldPassword, String newPassword) {
        if (newPassword == null || newPassword.length() < 8) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("field", "password", "message", "密码至少 8 位"));
        }
        Map<String, Object> u = require(userId);
        String hash = Rows.str(u, "password_hash", "");
        if (!hash.isEmpty() && !hash.equals(AuthService.hash(oldPassword))) {
            throw new BizException(ErrorCode.AUTH_CREDENTIAL_INVALID, Map.of("message", "原密码不正确"));
        }
        store.update(AuthService.T_USERS, userId, Rows.row("password_hash", AuthService.hash(newPassword)));
    }

    private Map<String, Object> require(String userId) {
        Map<String, Object> u = store.find(AuthService.T_USERS, userId).orElse(null);
        if (u == null) {
            throw new BizException(ErrorCode.AUTH_UNAUTHORIZED);
        }
        return u;
    }
}
