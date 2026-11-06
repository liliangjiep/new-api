-- ============================================================
--  V2 种子数据（MySQL 8.0）
--  行内注释1：表结构在 V1__business_tables.sql，本文件只放种子数据。
--  行内注释2：中转站与接入点的基线配置 —— 你可以直接改这张表来加新的中转站。
-- ============================================================

-- ---------------- 中转站基线 ----------------
-- 行内注释3：toapis 是当前已确认可用的中转站。
--            template_json 描述该站的协议 —— 换协议只改这个 JSON，不改代码。
INSERT INTO model_channels
  (id, name, provider, base_url, api_key, protocol, template_json, capabilities, priority, rpm_limit, cost_ratio, status, remark)
VALUES
  ('ch_toapis', 'ToAPIs', 'relay', 'https://toapis.cn', '', 'toapis',
   '{"submit_path":"/v1/images/generations","poll_path":"/v1/images/generations/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","prompt":"{prompt}","size":"{size}","resolution":"{resolution}","n":"{n}"},"task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url","status_map":{"completed":"succeeded","failed":"failed","running":"running","pending":"pending"}}',
   'image,video', 10, 600, 1.0000, 'active', '主用中转站（图片+视频）')
ON DUPLICATE KEY UPDATE name = VALUES(name), base_url = VALUES(base_url);

-- 行内注释4：备用站占位 —— 你拿到新中转站后改这一行的 base_url / api_key / template_json 即可，
--            或直接在后台「模型接入」里新增一条（会自动写这张表）。
INSERT INTO model_channels
  (id, name, provider, base_url, api_key, protocol, template_json, capabilities, priority, rpm_limit, cost_ratio, status, remark)
VALUES
  ('ch_backup', '备用中转站', 'relay', '', '', 'openai-image',
   '{"submit_path":"/v1/images/generations","poll_path":"/v1/images/generations/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","prompt":"{prompt}","size":"{size}","n":"{n}"},"task_id_path":"id","status_path":"status","result_urls_path":"data[0].url","status_map":{"completed":"succeeded","failed":"failed"}}',
   'image', 20, 300, 1.0500, 'inactive', '待填入真实 base_url 与 API Key')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ---------------- 接入点基线 ----------------
-- 行内注释5：sort_order 越小越优先 —— 同站失败自动回退到下一条。
-- 行内注释5.1：图片与视频的提交路径不同 —— 视频接入点用 template_json 覆盖为 /v1/videos/generations。
INSERT INTO model_endpoints
  (id, model_key, display_name, channel_id, base_url, upstream_model, timeout_ms, max_retries, sort_order, enabled, param_map_json, template_json)
VALUES
  ('ep_img_1k',   'image.t2i.1k',   'LC Image 2.5 Fast', 'ch_toapis', 'https://toapis.cn', 'gpt-image-2',    60000, 2, 10, 1, '{}', NULL),
  ('ep_img_2k',   'image.t2i.2k',   'LC Image 2.5 Pro',  'ch_toapis', 'https://toapis.cn', 'gpt-image-2',    60000, 2, 10, 1, '{}', NULL),
  ('ep_img_4k',   'image.t2i.4k',   'LC Image 2.5 Pro',  'ch_toapis', 'https://toapis.cn', 'gpt-image-2',    60000, 2, 10, 1, '{}', NULL),
  ('ep_stone_2k', 'stone.effect.2k','石材空效果单张 2K', 'ch_toapis', 'https://toapis.cn', 'gpt-image-2',    60000, 2, 10, 1, '{}', NULL),
  ('ep_stone_4k', 'stone.effect.4k','石材空效果单张 4K', 'ch_toapis', 'https://toapis.cn', 'gpt-image-2',    60000, 2, 10, 1, '{}', NULL),
  ('ep_stone_set','stone.effect.set6','石材批量出图 6张','ch_toapis', 'https://toapis.cn', 'gpt-image-2',    90000, 2, 10, 1, '{}', NULL),
  ('ep_vid_720',  'video.t2v.720p', 'Seedance 2.0',      'ch_toapis', 'https://toapis.cn', 'seedance-2-mini',300000, 2, 10, 1, '{}',
   '{"protocol":"toapis-video","submit_path":"/v1/videos/generations","poll_path":"/v1/videos/generations/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","prompt":"{prompt}","duration":"{duration}","aspect_ratio":"{aspect_ratio}","resolution":"{resolution}"},"task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}'),
  ('ep_vid_mini', 'video.t2v.mini', 'Seedance 2.0 Mini', 'ch_toapis', 'https://toapis.cn', 'seedance-2-mini',300000, 2, 10, 1, '{}',
   '{"protocol":"toapis-video","submit_path":"/v1/videos/generations","poll_path":"/v1/videos/generations/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","prompt":"{prompt}","duration":"{duration}","aspect_ratio":"{aspect_ratio}","resolution":"{resolution}"},"task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}'),
  ('ep_vid_batch','video.batch.480p','Seedance 批量生成','ch_toapis', 'https://toapis.cn', 'seedance-2-mini',300000, 2, 10, 1, '{}',
   '{"protocol":"toapis-video","submit_path":"/v1/videos/generations","poll_path":"/v1/videos/generations/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","prompt":"{prompt}","duration":"{duration}","aspect_ratio":"{aspect_ratio}","resolution":"{resolution}"},"task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}'),
  ('ep_vid_kling','video.i2v.kling','Kling 4.0',         'ch_toapis', 'https://toapis.cn', 'seedance-2-mini',300000, 2, 20, 1, '{}',
   '{"protocol":"toapis-video","submit_path":"/v1/videos/generations","poll_path":"/v1/videos/generations/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","prompt":"{prompt}","duration":"{duration}","aspect_ratio":"{aspect_ratio}","resolution":"{resolution}"},"task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), upstream_model = VALUES(upstream_model),
  template_json = VALUES(template_json);

-- ---------------- 充值套餐 ----------------
INSERT INTO recharge_packages (id, code, name, amount, credits, bonus_rate, audience, enabled)
VALUES
  ('pkg_trial',        'trial',        '体验包',   99,    100,   0.00, '新客试用',     1),
  ('pkg_standard',     'standard',     '标准包',   500,   520,   0.04, '个人创作者',   1),
  ('pkg_advanced',     'advanced',     '进阶包',   2000,  2120,  0.06, '活跃工作室',   1),
  ('pkg_professional', 'professional', '专业包',   5000,  5400,  0.08, '企业客户',     1),
  ('pkg_flagship',     'flagship',     '旗舰包',   20000, 22400, 0.12, '大规模采购',   1),
  ('pkg_agent',        'agent',        '代理包',   50000, 58000, 0.16, '代理商 / 销售',1)
ON DUPLICATE KEY UPDATE name = VALUES(name), amount = VALUES(amount), credits = VALUES(credits);

-- ---------------- 售价积分基线 ----------------
-- 行内注释6：与 Catalog 基线一致 —— 后台改价会写 ability_pricing 并留 pricing_change_log。
INSERT INTO ability_pricing (id, model_key, spec, points, cost, label, model, capability)
VALUES
  ('image.t2i.1k|1K',    'image.t2i.1k',    '1K',    2,   0.76, '轻量图片',       'LC Image 2.5 Fast', 'image'),
  ('image.t2i.2k|2K',    'image.t2i.2k',    '2K',    4,   1.70, '标准图片',       'LC Image 2.5 Pro',  'image'),
  ('image.t2i.4k|4K',    'image.t2i.4k',    '4K',    6,   2.70, '高清图片',       'LC Image 2.5 Pro',  'image'),
  ('video.t2v.720p|720P 5 秒','video.t2v.720p','720P 5 秒', 14, 5.88, '标准视频（优速）','Seedance 2.0', 'video'),
  ('video.t2v.mini|720P 5 秒','video.t2v.mini','720P 5 秒',  3, 1.17, '轻量视频',       'Seedance 2.0 Mini','video'),
  ('video.batch.480p|5 镜头 × 5 秒 480P','video.batch.480p','5 镜头 × 5 秒 480P', 30, 13.50, '批量分镜生成','Seedance 2.0','video'),
  ('video.i2v.kling|Kling 4.0 720P 5 秒','video.i2v.kling','Kling 4.0 720P 5 秒', 18, 7.92, '参考生视频','Kling 4.0','video'),
  ('video.process.enhance|720P','video.process.enhance','720P', 12, 5.04, '画质增强','火山 AI MediaKit','video-process'),
  ('video.erase.subtitle|720P','video.erase.subtitle','720P', 6, 1.50, '字幕擦除（无痕）','智影云雀 MPS','erase'),
  ('video.erase.watermark|1080P','video.erase.watermark','1080P', 8, 3.04, '水印擦除','智影云雀 MPS','erase'),
  ('image-speak.30s|30 秒 720P','image-speak.30s','30 秒 720P', 80, 35.20, '图片口播','Wan2.2-S2V','image-speak'),
  ('image-speak.60s|60 秒 720P','image-speak.60s','60 秒 720P', 160, 70.40, '图片口播','Wan2.2-S2V','image-speak'),
  ('image-speak.60s.light|60 秒 480P','image-speak.60s.light','60 秒 480P', 90, 39.60, '图片口播（轻量）','Wan2.2-S2V','image-speak'),
  ('lipsync.volc.1min|1 分钟（对口型）','lipsync.volc.1min','1 分钟（对口型）', 260, 117.00, '视频改口型','火山视频对口型','lipsync'),
  ('stone.effect.2k|单张 2K','stone.effect.2k','单张 2K', 8, 1.44, '石材空效果单张','LC Image 2.5 Pro','stone-effect'),
  ('stone.effect.4k|4K 高清单张','stone.effect.4k','4K 高清单张', 12, 1.44, '石材空效果单张','LC Image 2.5 Pro','stone-effect'),
  ('stone.effect.set6|6 张套图 2K','stone.effect.set6','6 张套图 2K', 45, 3.60, '石材批量出图','LC Image 2.5 Pro','stone-effect'),
  ('factory-video.60s|60 秒标准版','factory-video.60s','60 秒标准版', 320, 96.00, '厂家介绍视频','组合短剧','stone-video'),
  ('factory-video.60s.light|60 秒轻量版','factory-video.60s.light','60 秒轻量版', 165, 47.85, '厂家介绍视频','组合短剧','stone-video')
ON DUPLICATE KEY UPDATE points = VALUES(points), cost = VALUES(cost), label = VALUES(label);
