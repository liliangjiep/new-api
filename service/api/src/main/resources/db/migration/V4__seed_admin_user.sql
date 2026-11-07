-- ============================================================
-- V4：种子管理员账号
-- 行内注释1：为什么单独一个迁移 —— 后台 20 组接口现在有角色门禁（/api/v1/admin/** 只放行
--            ADMIN / OPERATOR），联调时需要一个确定能登进后台的账号。
--            用固定手机号 13800000000，验证码登录后即可拿到 ADMIN 角色的 JWT。
--
-- 行内注释2：生产部署时必须删掉本迁移，或把手机号换成你自己的。
--
-- 行内注释3：users 强类型表与 entity_rows 都要写 ——
--            entity_rows 是业务层 DataStore 实际读写的承载表，
--            users 强类型表留着给直接写 SQL 的场景，两者保持一致。
-- ============================================================

-- 行内注释3.1：先清掉同手机号的历史行 —— 避免出现两个 13800000000 账号，
--              findOrCreateByPhone 按手机号查会拿到旧的那条（角色还是 USER）。
DELETE FROM entity_rows WHERE entity_type = 'users'
  AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.phone')) = '13800000000';

-- ---------------- entity_rows（业务层实际存储） ----------------
INSERT INTO entity_rows (entity_type, row_id, user_id, data, created_at, updated_at)
VALUES (
  'users',
  'u_admin_seed',
  'u_admin_seed',
  '{"id":"u_admin_seed","phone":"13800000000","email":"","nickname":"超级管理员","company":"","bio":"","avatar_url":"","password_hash":"","role":"ADMIN","status":"active","login_version":0,"balance":100000,"frozen":0,"created_at":"2026-01-01 00:00:00"}',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  data = JSON_SET(data, '$.role', 'ADMIN', '$.status', 'active'),
  updated_at = NOW();

-- ---------------- users（强类型表，给直接写 SQL 用） ----------------
INSERT INTO users (id, phone, email, nickname, company, bio, avatar_url, password_hash, role, status, login_version, balance, frozen)
VALUES ('u_admin_seed', '13800000000', '', '超级管理员', '', '', '', '', 'ADMIN', 'active', 0, 100000, 0)
ON DUPLICATE KEY UPDATE role = 'ADMIN', status = 'active';
