-- M2-12 V1 初始化：通道 / 接入点 / 定价 / 任务 / 积分（PostgreSQL 方言，MySQL 需微调）
-- 行内注释1：secret 只存引用，密钥本体在 KMS
-- 行内注释2：model_endpoints(model_key, sort_order) 唯一，保证降级序不冲突

CREATE TABLE IF NOT EXISTS model_channels (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  provider VARCHAR(16) NOT NULL,
  base_url VARCHAR(256) NOT NULL,
  secret_ref VARCHAR(128),
  priority INT NOT NULL DEFAULT 100,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  rpm_limit INT,
  qps_limit INT,
  cost_ratio DECIMAL(5,4) NOT NULL DEFAULT 1.0000,
  circuit_state VARCHAR(16) NOT NULL DEFAULT 'closed',
  balance DECIMAL(12,2),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS model_endpoints (
  id VARCHAR(32) PRIMARY KEY,
  model_key VARCHAR(64) NOT NULL,
  capability VARCHAR(32) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  channel_id VARCHAR(32) NOT NULL REFERENCES model_channels(id),
  base_url VARCHAR(256),
  upstream_model VARCHAR(128) NOT NULL,
  secret_ref VARCHAR(128),
  timeout_ms INT NOT NULL DEFAULT 30000,
  max_retries INT NOT NULL DEFAULT 2,
  rpm_limit INT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  cost_ratio DECIMAL(5,4),
  sort_order INT NOT NULL DEFAULT 10,
  config_json TEXT DEFAULT '{}',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(64),
  UNIQUE (model_key, sort_order)
);

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  model_key VARCHAR(64) NOT NULL,
  capability VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  progress INT NOT NULL DEFAULT 0,
  points_frozen INT NOT NULL DEFAULT 0,
  points_charged INT NOT NULL DEFAULT 0,
  channel_id VARCHAR(32),
  idempotency_key VARCHAR(64) NOT NULL,
  params_json TEXT,
  result_json TEXT,
  error_code VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (idempotency_key)
);
