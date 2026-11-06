-- ============================================================
--  V2 业务表（MySQL 8.0 方言）
--  行内注释1：由原 PostgreSQL 方言整体转换而来：
--            TEXT → LONGTEXT / JSON，TIMESTAMP → DATETIME，
--            CREATE INDEX IF NOT EXISTS（PG 专属）→ 建表时内联 KEY。
--  行内注释2：字段名与 service/domain 的 Rows 键名一一对应，切库不改业务代码。
--  行内注释3：point_ledger 只追加不修改 —— 业务层不提供 update/delete 路径。
--  行内注释4：MySQL 无 BOOLEAN（实为 TINYINT(1)）；外键统一改为「仅索引，不加 FK 约束」，
--            避免导入顺序与级联删除带来的运维复杂度。
-- ============================================================

-- ---------------- 通用实体行表 ----------------
-- 行内注释4.1：entity_rows 是业务实体的通用承载表（类型 + JSON 列）。
--             业务层用「entity_type + Map 字段」建模，这张表让切 MySQL 时无需改任何 Service。
--             强类型表（users / model_channels / point_ledger 等）保留在下方，供直接写 SQL 使用。
CREATE TABLE IF NOT EXISTS entity_rows (
  entity_type VARCHAR(64) NOT NULL,
  row_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(32) NULL,
  data LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (entity_type, row_id),
  KEY idx_entity_user (entity_type, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(32) PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(128) NOT NULL DEFAULT '',
  nickname VARCHAR(32) NOT NULL DEFAULT '',
  company VARCHAR(128) NOT NULL DEFAULT '',
  bio VARCHAR(256) NOT NULL DEFAULT '',
  avatar_url VARCHAR(512) NOT NULL DEFAULT '',
  avatar_asset_id VARCHAR(32) NULL,
  password_hash VARCHAR(128) NOT NULL DEFAULT '',
  role VARCHAR(16) NOT NULL DEFAULT 'USER',
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  login_version INT NOT NULL DEFAULT 0,
  balance INT NOT NULL DEFAULT 0,
  frozen INT NOT NULL DEFAULT 0,
  -- 行内注释5：积分有效期 —— 按充值批次记录到期时间，默认充值起两年（见 billing_points_batches）。
  points_expire_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_users_phone (phone),
  KEY idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  device VARCHAR(64) NOT NULL DEFAULT 'Web',
  ip VARCHAR(64) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sessions_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  token VARCHAR(128) NOT NULL,
  revoked TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_at DATETIME NOT NULL,
  UNIQUE KEY uk_refresh_token (token),
  KEY idx_refresh_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sms_codes (
  id VARCHAR(32) PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(8) NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_at DATETIME NOT NULL,
  KEY idx_sms_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------- 积分与报价 ----------------

CREATE TABLE IF NOT EXISTS quotes (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  model_key VARCHAR(64) NOT NULL,
  spec VARCHAR(64) NOT NULL DEFAULT '',
  count INT NOT NULL DEFAULT 1,
  points INT NOT NULL DEFAULT 0,
  params LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_at DATETIME NOT NULL,
  KEY idx_quotes_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 行内注释6：流水表仅追加，业务层不提供 update/delete。
CREATE TABLE IF NOT EXISTS point_ledger (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  type VARCHAR(16) NOT NULL,
  amount INT NOT NULL DEFAULT 0,
  balance INT NOT NULL DEFAULT 0,
  note TEXT NULL,
  task_id VARCHAR(32) NULL,
  order_no VARCHAR(32) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ledger_user_type (user_id, type),
  KEY idx_ledger_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 行内注释7：积分有效期批次 —— 每次充值生成一批，记录到���时间。
--            「充值起两年到期」由本表承载，用户余额 = 未过期批次的 credits 之和。
CREATE TABLE IF NOT EXISTS billing_points_batches (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  source_type VARCHAR(16) NOT NULL DEFAULT 'recharge',
  source_id VARCHAR(64) NOT NULL DEFAULT '',
  credits INT NOT NULL DEFAULT 0,
  consumed INT NOT NULL DEFAULT 0,
  expire_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_batch_user (user_id, expire_at),
  KEY idx_batch_expire (expire_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------- 充值与订单 ----------------

CREATE TABLE IF NOT EXISTS recharge_packages (
  id VARCHAR(32) PRIMARY KEY,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(32) NOT NULL,
  amount INT NOT NULL,
  credits INT NOT NULL,
  bonus_rate DECIMAL(6,4) NOT NULL DEFAULT 0,
  audience VARCHAR(64) NOT NULL DEFAULT '',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_pkg_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recharge_orders (
  id VARCHAR(32) PRIMARY KEY,
  no VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  package_code VARCHAR(32) NOT NULL,
  package_name VARCHAR(64) NOT NULL DEFAULT '',
  amount INT NOT NULL,
  credits INT NOT NULL,
  bonus INT NOT NULL DEFAULT 0,
  pay_method VARCHAR(32) NOT NULL DEFAULT '微信支付',
  paid_channel VARCHAR(32) NOT NULL DEFAULT '',
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_order_no (no),
  KEY idx_orders_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------- 资产 ----------------

CREATE TABLE IF NOT EXISTS assets (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  name VARCHAR(256) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  content_type VARCHAR(128) NOT NULL DEFAULT '',
  etag VARCHAR(128) NOT NULL DEFAULT '',
  `group` VARCHAR(64) NOT NULL DEFAULT '',
  tags LONGTEXT NULL,
  source VARCHAR(16) NOT NULL DEFAULT 'upload',
  thumb VARCHAR(512) NOT NULL DEFAULT '',
  url VARCHAR(512) NOT NULL DEFAULT '',
  duration INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_assets_user (user_id, kind, source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS asset_groups (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS upload_policies (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  `group` VARCHAR(64) NOT NULL DEFAULT '',
  filename VARCHAR(256) NOT NULL DEFAULT '',
  content_type VARCHAR(128) NOT NULL DEFAULT '',
  size BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------- 中转站与接入点（多中转站兼容的核心） ----------------

-- 行内注释8：model_channels —— 中转站配置表。
--            新增一个中转站 = 往这张表插一行，代码零改动。
--            template_json 承载该站的协议差异（路径、鉴权、请求体模板、响应取值路径）。
CREATE TABLE IF NOT EXISTS model_channels (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'relay',
  base_url VARCHAR(256) NOT NULL,
  -- 行内注释9：api_key 存密文（见 AdminService.encryptChannelKey），解密口令走环境变量。
  api_key VARCHAR(512) NOT NULL DEFAULT '',
  -- 行内注释10：protocol 标识协议族，仅用于后台展示与日志；实际行为由 template_json 决定。
  protocol VARCHAR(32) NOT NULL DEFAULT 'openai-image',
  -- 行内注释11：template_json —— 该站的协议模板（见 RelayTemplate）。
  template_json LONGTEXT NULL,
  capabilities VARCHAR(128) NOT NULL DEFAULT '',
  priority INT NOT NULL DEFAULT 100,
  rpm_limit INT NOT NULL DEFAULT 600,
  cost_ratio DECIMAL(6,4) NOT NULL DEFAULT 1.0000,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  circuit_state VARCHAR(16) NOT NULL DEFAULT 'closed',
  consecutive_failures INT NOT NULL DEFAULT 0,
  balance DECIMAL(12,4) NOT NULL DEFAULT 0,
  remark VARCHAR(256) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(64) NOT NULL DEFAULT '',
  KEY idx_channels_status (status, priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 行内注释12：model_endpoints —— 平台 model_key 在某个中转站上的落点。
--            同一个 model_key 可有多条（不同 channel），按 sort_order 依次回退。
CREATE TABLE IF NOT EXISTS model_endpoints (
  id VARCHAR(32) PRIMARY KEY,
  model_key VARCHAR(64) NOT NULL,
  display_name VARCHAR(64) NOT NULL DEFAULT '',
  channel_id VARCHAR(32) NOT NULL,
  base_url VARCHAR(256) NOT NULL DEFAULT '',
  upstream_model VARCHAR(64) NOT NULL DEFAULT '',
  timeout_ms INT NOT NULL DEFAULT 60000,
  max_retries INT NOT NULL DEFAULT 2,
  sort_order INT NOT NULL DEFAULT 10,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  -- 行内注释13：param_map_json —— 平台参数 → 上游参数的映射，缺省用内置默认映射。
  param_map_json LONGTEXT NULL,
  -- 行内注释13.1：template_json —— 接入点级协议模板覆盖。
  --             同一中转站下图片走 /v1/images/generations、视频走 /v1/videos/generations，
  --             路径不同，所以模板要能按接入点覆盖；留空则继承通道模板。
  template_json LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(64) NOT NULL DEFAULT '',
  KEY idx_endpoints_model (model_key, enabled, sort_order),
  KEY idx_endpoints_channel (channel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------- 定价与审核 ----------------

CREATE TABLE IF NOT EXISTS ability_pricing (
  id VARCHAR(128) PRIMARY KEY,
  model_key VARCHAR(64) NOT NULL,
  spec VARCHAR(64) NOT NULL,
  points INT NOT NULL,
  cost DECIMAL(10,4) NOT NULL DEFAULT 0,
  label VARCHAR(64) NOT NULL DEFAULT '',
  model VARCHAR(64) NOT NULL DEFAULT '',
  capability VARCHAR(32) NOT NULL DEFAULT '',
  updated_by VARCHAR(64) NOT NULL DEFAULT '',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_pricing (model_key, spec)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pricing_change_log (
  id VARCHAR(32) PRIMARY KEY,
  model_key VARCHAR(64) NOT NULL,
  spec VARCHAR(64) NOT NULL,
  points_before INT NOT NULL,
  points_after INT NOT NULL,
  reason TEXT NULL,
  operator VARCHAR(64) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS review_queue (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(256) NOT NULL DEFAULT '',
  `user` VARCHAR(64) NOT NULL DEFAULT '',
  thumb VARCHAR(512) NOT NULL DEFAULT '',
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------- 画布 / Agent / 数字人 / 石材 / 发现 ----------------

CREATE TABLE IF NOT EXISTS canvases (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  title VARCHAR(128) NOT NULL DEFAULT '未命名画布',
  version INT NOT NULL DEFAULT 0,
  nodes LONGTEXT NULL,
  edges LONGTEXT NULL,
  share_url VARCHAR(512) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS canvas_versions (
  id VARCHAR(32) PRIMARY KEY,
  canvas_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  version INT NOT NULL,
  nodes LONGTEXT NULL,
  edges LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS agent_sessions (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  title VARCHAR(128) NOT NULL DEFAULT '新会话',
  skill VARCHAR(32) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS agent_messages (
  id VARCHAR(32) PRIMARY KEY,
  session_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  role VARCHAR(16) NOT NULL,
  content LONGTEXT NOT NULL,
  seq INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS avatars (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  asset_id VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL DEFAULT '未命名形象',
  url VARCHAR(512) NOT NULL DEFAULT '',
  standardized TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS voices (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL DEFAULT '',
  source VARCHAR(16) NOT NULL DEFAULT 'clone',
  audio_asset_ids LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS voice_slots (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  voice_id VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL DEFAULT '',
  `index` INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS authorizations (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  type VARCHAR(16) NOT NULL DEFAULT 'portrait',
  subject VARCHAR(128) NOT NULL DEFAULT '',
  file_url VARCHAR(512) NOT NULL DEFAULT '',
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stone_materials (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  asset_id VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL DEFAULT '',
  tags LONGTEXT NULL,
  attrs LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stone_refine_queue (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  job_id VARCHAR(32) NOT NULL,
  note TEXT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS discover_items (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  title VARCHAR(256) NOT NULL DEFAULT '',
  cover_url VARCHAR(512) NOT NULL DEFAULT '',
  capability VARCHAR(32) NOT NULL DEFAULT 'image',
  points INT NOT NULL DEFAULT 0,
  tags LONGTEXT NULL,
  tool_href VARCHAR(256) NOT NULL DEFAULT '',
  params_snapshot LONGTEXT NULL,
  likes INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_discover_cap (capability, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------- 发票 / 分销 / 后台 ----------------

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  title_type VARCHAR(16) NOT NULL DEFAULT '个人',
  title VARCHAR(128) NOT NULL,
  tax_no VARCHAR(32) NOT NULL DEFAULT '',
  amount DECIMAL(12,2) NOT NULL,
  order_nos LONGTEXT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  invoice_no VARCHAR(64) NOT NULL DEFAULT '',
  reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS affiliate_partners (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  rate INT NOT NULL DEFAULT 10,
  status VARCHAR(16) NOT NULL DEFAULT '合作中',
  pending_amount INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  amount INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS affiliate_settlements (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  period VARCHAR(32) NOT NULL DEFAULT '',
  amount INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT '待打款',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS affiliate_withdrawals (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  amount INT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(32) PRIMARY KEY,
  operator VARCHAR(64) NOT NULL DEFAULT 'system',
  action VARCHAR(64) NOT NULL,
  target VARCHAR(128) NOT NULL DEFAULT '',
  diff LONGTEXT NULL,
  reason TEXT NULL,
  trace_id VARCHAR(64) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(256) NOT NULL,
  body LONGTEXT NULL,
  pinned TINYINT(1) NOT NULL DEFAULT 0,
  `range` VARCHAR(32) NOT NULL DEFAULT '长期',
  status VARCHAR(16) NOT NULL DEFAULT 'published',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS public_materials (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(256) NOT NULL DEFAULT '',
  scope VARCHAR(32) NOT NULL DEFAULT '全员',
  thumb VARCHAR(512) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS skill_packages (
  id VARCHAR(32) PRIMARY KEY,
  label VARCHAR(128) NOT NULL DEFAULT '',
  description LONGTEXT NULL,
  prompt_template LONGTEXT NULL,
  version VARCHAR(16) NOT NULL DEFAULT 'v1.0',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS video_skills (
  id VARCHAR(32) PRIMARY KEY,
  `key` VARCHAR(64) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  option_groups LONGTEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_video_skill (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS endpoint_changes (
  id VARCHAR(32) PRIMARY KEY,
  model_key VARCHAR(64) NOT NULL,
  from_channel VARCHAR(32) NOT NULL DEFAULT '',
  to_channel VARCHAR(32) NOT NULL DEFAULT '',
  operator VARCHAR(64) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invite_codes (
  code VARCHAR(32) PRIMARY KEY,
  used TINYINT(1) NOT NULL DEFAULT 0,
  used_by VARCHAR(32) NOT NULL DEFAULT '',
  created_by VARCHAR(64) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------- 任务 ----------------

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  model_key VARCHAR(64) NOT NULL,
  model VARCHAR(64) NOT NULL DEFAULT '',
  spec VARCHAR(64) NOT NULL DEFAULT '',
  title VARCHAR(256) NOT NULL DEFAULT '',
  capability VARCHAR(32) NOT NULL DEFAULT 'image',
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  progress INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  points_frozen INT NOT NULL DEFAULT 0,
  points_charged INT NOT NULL DEFAULT 0,
  idempotency_key VARCHAR(128) NOT NULL DEFAULT '',
  quote_fingerprint VARCHAR(128) NOT NULL DEFAULT '',
  upstream_task_id VARCHAR(64) NOT NULL DEFAULT '',
  channel_id VARCHAR(32) NOT NULL DEFAULT '',
  fail_reason LONGTEXT NULL,
  error_code VARCHAR(64) NOT NULL DEFAULT '',
  usage_record LONGTEXT NULL,
  params LONGTEXT NULL,
  result LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tasks_user (user_id, status, created_at),
  KEY idx_tasks_idem (user_id, idempotency_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS task_batches (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  item_count INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'running',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS task_batch_items (
  id VARCHAR(32) PRIMARY KEY,
  batch_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  task_id VARCHAR(32) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ecommerce_set_items (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  product_asset_ids LONGTEXT NULL,
  lang VARCHAR(16) NOT NULL DEFAULT '',
  ratio VARCHAR(16) NOT NULL DEFAULT '',
  model VARCHAR(64) NOT NULL DEFAULT '',
  resolution VARCHAR(16) NOT NULL DEFAULT '',
  format VARCHAR(16) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------- 工具任务（视频/数字人/石材/商详） ----------------

CREATE TABLE IF NOT EXISTS tool_jobs (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  title VARCHAR(256) NOT NULL DEFAULT '',
  payload LONGTEXT NULL,
  result LONGTEXT NULL,
  fail_reason LONGTEXT NULL,
  points INT NOT NULL DEFAULT 0,
  task_id VARCHAR(32) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tooljobs_user (user_id, kind, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
