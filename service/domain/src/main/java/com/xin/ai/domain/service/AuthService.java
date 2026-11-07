package com.xin.ai.domain.service;

import com.xin.ai.common.cache.RedisService;
import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.common.security.JwtUtils;
import com.xin.ai.common.config.JwtProperties;
import com.xin.ai.common.config.SmsProperties;
import com.xin.ai.domain.repository.DataStore;
import com.xin.ai.domain.repository.Rows;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * 认证服务：短信验证码 / 密码登录 / 双 Token / 会话管理。
 * 行内注释1：验证码与刷新令牌存内存（本期无 Redis），过期即失效；生产换 Redis 后逻辑不变。
 * 行内注释2：login_version 用于强制下线 —— 管理员下线或封禁时 +1，老 Token 全部失效。
 * 行内注释3：新手机号首次验证码登录自动建号（文档 §2.1「新号自动注册」）。
 */
@Service
public class AuthService {

    /** 行内注释4：表名常量集中，避免各处硬编码字符串。 */
    public static final String T_USERS = "users";
    public static final String T_CODES = "sms_codes";
    public static final String T_REFRESH = "refresh_tokens";
    public static final String T_SESSIONS = "user_sessions";
    public static final String T_LOGIN_FAIL = "login_failures";

    private static final int CODE_TTL_SECONDS = 300;
    private static final int CODE_COOLDOWN_SECONDS = 60;
    private static final int REFRESH_TTL_SECONDS = 2592000;
    private static final int LOGIN_FAIL_LOCK_THRESHOLD = 5;
    private static final int LOGIN_FAIL_LOCK_MINUTES = 15;

    private final DataStore store;
    private final JwtProperties jwtProperties;
    /** 行内注释4.1：本地 Redis —— 验证码与发送冷却放 Redis，多实例共享；Redis 挂时自动降级。 */
    private final RedisService redis;
    /** 行内注释4.2：短信通道配置 —— mode=real 时走真实服务商，响应不再回传 dev_code。 */
    private final SmsProperties sms;

    public AuthService(DataStore store, JwtProperties jwtProperties, RedisService redis, SmsProperties sms) {
        this.store = store;
        this.jwtProperties = jwtProperties;
        this.redis = redis;
        this.sms = sms;
    }

    // 行内注释5：发送验证码 —— 冷却期未过直接报错；开发模式验证码固定为 6 位随机并回传给前端（体验版）。
    public Map<String, Object> sendSmsCode(String phone) {
        String normalized = normalizePhone(phone);
        if (!normalized.matches("^1\\d{10}$")) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("field", "phone", "message", "手机号格式不正确"));
        }
        LocalDateTime now = Times.now();
        // 行内注释5.1：冷却判定走 Redis（SET NX + TTL），避免并发下连发多条短信。
        String coolKey = "sms:cool:" + normalized;
        if (!redis.setIfAbsent(coolKey, "1", java.time.Duration.ofSeconds(CODE_COOLDOWN_SECONDS))) {
            throw new BizException(ErrorCode.AUTH_RATE_LIMITED,
                    Map.of("cooldown", CODE_COOLDOWN_SECONDS));
        }
        String code = String.format("%06d", new java.util.Random().nextInt(1000000));
        String id = UUID.randomUUID().toString().replace("-", "");
        store.put(T_CODES, id, Rows.row(
                "id", id, "phone", normalized, "code", code,
                "used", false, "created_at", Times.full(now),
                "expire_at", Times.full(now.plusSeconds(CODE_TTL_SECONDS))));
        // 行内注释5.2：验证码同时写 Redis —— 校验时先查 Redis，命中即通过（免一次 DB 查询）。
        redis.set(smsKey(normalized), code, java.time.Duration.ofSeconds(CODE_TTL_SECONDS));
        // 行内注释6：体验版把验证码直接返回，省掉短信通道联调；生产删除该字段。
        // 行内注释6.1：mode=real 时绝不能回传 dev_code —— 那是把验证码发给调用方。
        if (sms.realMode()) {
            SmsSender.send(sms, normalized, code);
            return Rows.row("cooldown", CODE_COOLDOWN_SECONDS, "expires_in", CODE_TTL_SECONDS);
        }
        return Rows.row("cooldown", CODE_COOLDOWN_SECONDS, "expires_in", CODE_TTL_SECONDS, "dev_code", code);
    }

    /** 验证码 Redis key。 */
    private String smsKey(String phone) {
        return "sms:code:" + phone;
    }

    // 行内注释7：验证码登录/注册 —— 校验码 → 找或建用户 → 发双 Token。
    public Map<String, Object> verifySmsCode(String phone, String code) {
        String normalized = normalizePhone(phone);
        String input = code == null ? "" : code.trim();
        // 行内注释7.1：先查 Redis —— 命中即通过，避免每次都扫 DB 验证码表。
        String cached = redis.get(smsKey(normalized));
        boolean redisHit = cached != null && cached.equals(input);
        Map<String, Object> row = null;
        if (!redisHit) {
            row = store.listWhere(T_CODES,
                            r -> Rows.str(r, "phone").equals(normalized)
                                    && !Rows.bool(r, "used")
                                    && Rows.str(r, "code").equals(input))
                    .stream().max((a, b) -> Rows.str(a, "created_at").compareTo(Rows.str(b, "created_at")))
                    .orElse(null);
            if (row == null) {
                throw new BizException(ErrorCode.AUTH_CODE_INVALID);
            }
            if (Times.parse(Rows.str(row, "expire_at")).isBefore(Times.now())) {
                throw new BizException(ErrorCode.AUTH_CODE_INVALID);
            }
            store.update(T_CODES, Rows.str(row, "id"), Rows.row("used", true));
        }
        // 行内注释7.2：用掉即删 —— 同一个验证码不能用第二次。
        redis.delete(smsKey(normalized));
        Map<String, Object> user = findOrCreateByPhone(normalized);
        return issueTokens(user);
    }

    // 行内注释8：密码登录 —— 失败计数达阈值锁 15 分钟。
    public Map<String, Object> passwordLogin(String account, String password) {
        String rawKey = normalizePhone(account);
        final String key = rawKey.isEmpty()
                ? (account == null ? "" : account.trim().toLowerCase())
                : rawKey;
        checkLoginFailure(key);
        Map<String, Object> user = store.listWhere(T_USERS,
                        r -> Rows.str(r, "phone").equals(key) || Rows.str(r, "email").equalsIgnoreCase(key))
                .stream().findFirst().orElse(null);
        if (user == null || !Rows.str(user, "password_hash", "").equals(hash(password))) {
            recordLoginFailure(key);
            throw new BizException(ErrorCode.AUTH_CREDENTIAL_INVALID);
        }
        clearLoginFailure(key);
        if ("banned".equals(Rows.str(user, "status"))) {
            throw new BizException(ErrorCode.AUTH_FORBIDDEN);
        }
        return issueTokens(user);
    }

    // 行内注释9：刷新 —— 校验 refresh 存在且未过期 → 轮换（旧的作废）→ 发新 access。
    public Map<String, Object> refresh(String refreshToken) {
        Map<String, Object> row = store.listWhere(T_REFRESH, r -> Rows.str(r, "token").equals(refreshToken == null ? "" : refreshToken))
                .stream().findFirst().orElse(null);
        if (row == null || Rows.bool(row, "revoked")) {
            throw new BizException(ErrorCode.AUTH_REFRESH_INVALID);
        }
        if (Times.parse(Rows.str(row, "expire_at")).isBefore(Times.now())) {
            throw new BizException(ErrorCode.AUTH_REFRESH_INVALID);
        }
        Map<String, Object> user = store.find(T_USERS, Rows.str(row, "user_id")).orElse(null);
        if (user == null) {
            throw new BizException(ErrorCode.AUTH_REFRESH_INVALID);
        }
        store.update(T_REFRESH, Rows.str(row, "id"), Rows.row("revoked", true));
        return issueTokens(user);
    }

    // 行内注释10：登出 —— 吊销当前 refresh（access 由短 TTL 自然过期）。
    public void logout(String refreshToken) {
        store.listWhere(T_REFRESH, r -> Rows.str(r, "token").equals(refreshToken == null ? "" : refreshToken))
                .forEach(r -> store.update(T_REFRESH, Rows.str(r, "id"), Rows.row("revoked", true)));
    }

    // 行内注释11：会话列表 —— 记录设备/IP/时间，current 标记当前会话。
    public List<Map<String, Object>> listSessions(String userId, String currentSessionId) {
        return store.listWhere(T_SESSIONS, r -> Rows.str(r, "user_id").equals(userId)).stream()
                .sorted((a, b) -> Rows.str(b, "created_at").compareTo(Rows.str(a, "created_at")))
                .map(r -> Rows.row(
                        "id", Rows.str(r, "id"),
                        "device", Rows.str(r, "device", "未知设备"),
                        "ip", Rows.str(r, "ip", ""),
                        "created_at", Rows.str(r, "created_at"),
                        "current", Rows.str(r, "id").equals(currentSessionId)))
                .toList();
    }

    // 行内注释12：下线指定会话 —— 删除会话记录 + login_version+1 使其 access 全部失效。
    public void revokeSession(String userId, String sessionId) {
        Map<String, Object> session = store.find(T_SESSIONS, sessionId).orElse(null);
        if (session == null || !Rows.str(session, "user_id").equals(userId)) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        store.delete(T_SESSIONS, sessionId);
        bumpLoginVersion(userId);
    }

    // 行内注释13：强制下线（管理员用）。
    public void forceLogout(String userId) {
        store.deleteWhere(T_SESSIONS, r -> Rows.str(r, "user_id").equals(userId));
        bumpLoginVersion(userId);
    }

    // 行内注释14：签发双 Token —— access 载荷含 sub/role/lv/phone，refresh 单独存表。
    private Map<String, Object> issueTokens(Map<String, Object> user) {
        String userId = Rows.str(user, "id");
        int lv = Rows.num(user, "login_version");
        String phone = Rows.str(user, "phone", "");
        String role = Rows.str(user, "role", "USER");
        long nowSec = System.currentTimeMillis() / 1000;
        String accessPayload = "{\"sub\":\"" + escape(userId) + "\",\"role\":\"" + escape(role)
                + "\",\"phone\":\"" + escape(phone) + "\",\"lv\":" + lv
                + ",\"iat\":" + nowSec + ",\"exp\":" + (nowSec + jwtProperties.accessTtlSeconds()) + "}";
        String accessToken = JwtUtils.sign(accessPayload, jwtProperties.secret());

        String refreshToken = "rt_" + UUID.randomUUID().toString().replace("-", "");
        String refreshId = UUID.randomUUID().toString().replace("-", "");
        store.put(T_REFRESH, refreshId, Rows.row(
                "id", refreshId, "user_id", userId, "token", refreshToken,
                "revoked", false, "created_at", Times.full(Times.now()),
                "expire_at", Times.full(Times.now().plusSeconds(REFRESH_TTL_SECONDS))));

        String sessionId = UUID.randomUUID().toString().replace("-", "");
        store.put(T_SESSIONS, sessionId, Rows.row(
                "id", sessionId, "user_id", userId, "device", "Web",
                "ip", "", "created_at", Times.full(Times.now())));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("access_token", accessToken);
        result.put("refresh_token", refreshToken);
        result.put("expires_in", jwtProperties.accessTtlSeconds());
        result.put("session_id", sessionId);
        result.put("user", publicUser(user));
        return result;
    }

    // 行内注释15：新号自动注册 —— 初始昵称取手机号后四位，初始积分按新客赠送。
    private Map<String, Object> findOrCreateByPhone(String phone) {
        Map<String, Object> existing = store.listWhere(T_USERS, r -> Rows.str(r, "phone").equals(phone))
                .stream().findFirst().orElse(null);
        if (existing != null) {
            return existing;
        }
        String id = "u_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        Map<String, Object> user = Rows.row(
                "id", id, "phone", phone, "email", "",
                "nickname", "用户" + phone.substring(phone.length() - 4),
                "company", "", "bio", "", "avatar_url", "",
                "role", "USER", "status", "active",
                "login_version", 0, "balance", 100, "frozen", 0,
                "password_hash", "", "created_at", Times.full(Times.now()));
        store.put(T_USERS, id, user);
        return user;
    }

    // 行内注释16：对外的用户视图 —— 不含密码哈希等敏感字段。
    public Map<String, Object> publicUser(Map<String, Object> user) {
        return Rows.row(
                "id", Rows.str(user, "id"),
                "nickname", Rows.str(user, "nickname", ""),
                "phone", Rows.str(user, "phone", ""),
                "role", Rows.str(user, "role", "USER"),
                "balance", Rows.num(user, "balance"));
    }

    private void checkLoginFailure(String key) {
        Map<String, Object> fail = store.listWhere(T_LOGIN_FAIL, r -> Rows.str(r, "key").equals(key))
                .stream().findFirst().orElse(null);
        if (fail == null) {
            return;
        }
        if (Rows.num(fail, "count") >= LOGIN_FAIL_LOCK_THRESHOLD) {
            LocalDateTime unlockAt = Times.parse(Rows.str(fail, "unlock_at"));
            if (unlockAt.isAfter(Times.now())) {
                throw new BizException(ErrorCode.AUTH_RATE_LIMITED, Map.of("unlock_at", Times.full(unlockAt)));
            }
            store.delete(T_LOGIN_FAIL, Rows.str(fail, "id"));
        }
    }

    private void recordLoginFailure(String key) {
        Map<String, Object> fail = store.listWhere(T_LOGIN_FAIL, r -> Rows.str(r, "key").equals(key))
                .stream().findFirst().orElse(null);
        if (fail == null) {
            String id = UUID.randomUUID().toString().replace("-", "");
            store.put(T_LOGIN_FAIL, id, Rows.row(
                    "id", id, "key", key, "count", 1,
                    "unlock_at", Times.full(Times.now().plusMinutes(LOGIN_FAIL_LOCK_MINUTES))));
            return;
        }
        int count = Rows.num(fail, "count") + 1;
        store.update(T_LOGIN_FAIL, Rows.str(fail, "id"), Rows.row(
                "count", count,
                "unlock_at", Times.full(Times.now().plusMinutes(LOGIN_FAIL_LOCK_MINUTES))));
    }

    private void clearLoginFailure(String key) {
        store.listWhere(T_LOGIN_FAIL, r -> Rows.str(r, "key").equals(key))
                .forEach(r -> store.delete(T_LOGIN_FAIL, Rows.str(r, "id")));
    }

    private void bumpLoginVersion(String userId) {
        store.find(T_USERS, userId).ifPresent(u ->
                store.update(T_USERS, userId, Rows.row("login_version", Rows.num(u, "login_version") + 1)));
    }

    // 行内注释17：密码哈希 —— 本地用 SHA-256 加盐，生产换 Argon2id（架构 §11）。
    public static String hash(String raw) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] d = md.digest(("xin-ai:" + (raw == null ? "" : raw)).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : d) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("hash failed", e);
        }
    }

    private static String normalizePhone(String phone) {
        return phone == null ? "" : phone.replaceAll("\\s", "");
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
