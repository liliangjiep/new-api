-- ============================================================
-- V7：修复「通道永久熔断」—— 熔断状态补上到期时间
--
-- 行内注释1：为什么需要 —— 这是本轮全栈闭环审计发现的最高危缺陷：
--            通道连续失败 3 次后 circuit_state 被置为 'open'，
--            但 ChannelRouter.isOpen() 每次被调用都会无条件
--            把本地冷却窗口往后推 60 秒（openUntil = now + COOLDOWN_MS），
--            而 isOpen() 在每次任务路由时都会调用 ——
--            等于「每路由一次就续期一次」，窗口永远不会到期。
--            结果：通道熔断后再也回不来，所有生成任务一律 channel.all_failed。
--            实测 ch_toapis 熔断后手工把 circuit_state 改回 closed，任务立刻成功。
--
-- 行内注释2：怎么修 —— 熔断必须带「到期时间」才能自动恢复。
--            新增 circuit_open_until 列：熔断时写入到期时刻，
--            到点后路由放一个半开探测请求过去：
--            成功 → 关闸（closed）；失败 → 重新熔断并顺延一个窗口。
--            这样既保留「坏站别猛打」的保护，也让站能自愈。
--
-- 行内注释3：兼容老数据 —— 已有 circuit_state='open' 的行补一个当前时刻 +60 秒的到期时间，
--            让它们能被判定为「冷却中」，随后自然走到半开探测，而不是永久拉黑。
-- ============================================================

ALTER TABLE model_channels
  ADD COLUMN circuit_open_until DATETIME NULL DEFAULT NULL AFTER circuit_state;

-- 行内注释3.1：存量 open 行补到期时间 —— 从当前时间起给一个完整冷却窗口。
UPDATE model_channels
SET circuit_open_until = DATE_ADD(NOW(), INTERVAL 60 SECOND)
WHERE circuit_state = 'open' AND circuit_open_until IS NULL;

-- 行内注释3.2：closed 行不需要到期时间。
UPDATE model_channels
SET circuit_open_until = NULL
WHERE circuit_state = 'closed';
