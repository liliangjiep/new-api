-- ============================================================
-- V5：充值卡面额字段
-- 行内注释1：为什么需要 —— 充值卡兑换（文档 §2.2 R13「充值卡兑换」，P0）此前完全没有
--            实现：后台 /admin/invite-codes 只能生成「无面额邀请码」，
--            用户侧没有兑换端点，前端「兑换充值卡」只能弹 toast —— 链路是断的。
--            现在制卡时带 points 面额，用户用 POST /recharge-cards/redeem 兑换入账。
--
-- 行内注释2：为什么改 invite_codes 而不是新建表 ——
--            invite_codes 本身就是「后台制卡 → 用户使用」的那张表，
--            只是以前缺面额与使用记录字段。复用它比新表更一致。
--
-- 行内注释3：业务层实际读写的是 entity_rows（JSON 列），
--            points 字段随 JSON 一起落库，无需迁移；
--            这里的 ALTER 只是让「直接写 SQL」的强类型表也保持字段一致。
-- ============================================================

ALTER TABLE invite_codes
  ADD COLUMN points INT NOT NULL DEFAULT 0 COMMENT '充值卡面额积分，0 表示纯邀请码';

ALTER TABLE invite_codes
  ADD COLUMN used_at DATETIME NULL DEFAULT NULL COMMENT '兑换时间';
