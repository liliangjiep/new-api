-- ============================================================
-- V3：补齐缺失的模型接入点 + 语音合成定价
-- 行内注释1：为什么单独一个迁移 —— V2 已经上线过，不能改它（Flyway 校验 checksum 会失败）。
--            这里新增 V3，只做「追加」：不改已有行的语义，只插入缺的那些。
--
-- 行内注释2：这些接入点对应 10 个此前没配 model_endpoints 的 model_key，
--            缺配置时任务会以 channel.not_configured 失败，前端表现为「提交后一直失败」。
--
-- 行内注释3：上游模型统一用 ToAPIs 的 wan3.0-video —— 它是当前 key 唯一可用且支持
--            多模态参考（reference_images / video_list / audio_with_roles）的视频模型，
--            画质增强、字幕/水印擦除、图片口播、改口型、厂家介绍视频都用「视频编辑」能力实现。
--            等拿到火山 MediaKit / 腾讯 MPS / Wan S2V 的正式凭据后，
--            在后台「模型接入」里新增接入点并把 sort_order 调到更小即可回退切换，代码不用动。
-- ============================================================

-- ---------------- 中转站 ----------------
-- 行内注释4：语音合成单独开一个通道（占位）——
--            A 类（需要你提供凭据）项先不动，这里把通道骨架建好，
--            status=inactive 表示「有配置但不参与回退」，
--            等你填入 base_url / api_key 后在后台点一下启用即可。
INSERT INTO model_channels
  (id, name, provider, base_url, api_key, protocol, template_json, capabilities, priority, rpm_limit, cost_ratio, status, remark)
VALUES
  ('ch_tts', '语音合成通道（待配置凭据）', 'relay', '', '', 'openai-audio',
   '{"protocol":"openai-audio","submit_path":"/v1/audio/speech","poll_path":"/v1/audio/speech/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","input":"{text}","voice":"{voice}"},"task_id_path":"id","status_path":"status","result_urls_path":"data[0].url"}',
   'tts', 30, 120, 1.0000, 'inactive', '待填入语音合成服务商凭据；凭据到位后在后台启用')
ON DUPLICATE KEY UPDATE name = VALUES(name), remark = VALUES(remark);

-- ---------------- 接入点 ----------------
-- 行内注释5：视频类接入点的模板 —— request_template 里用 {video_url} / {reference_images}
--            等占位符，由 UpstreamParamBuilder 在执行前填好真实 URL。
--            RelayAdapter 已支持嵌套结构（Map/List）递归渲染，所以 video_list 这类数组能正常下发。
-- 行内注释5.1：结果地址取 result.data[0].url —— 与 ToAPIs 视频接口实测一致。
INSERT INTO model_endpoints
  (id, model_key, display_name, channel_id, base_url, upstream_model, timeout_ms, max_retries, sort_order, enabled, param_map_json, template_json)
VALUES
  -- 画质增强
  ('ep_vid_enhance', 'video.process.enhance', '画质增强（视频编辑）', 'ch_toapis', 'https://toapis.cn', 'wan3.0-video', 300000, 2, 10, 1, '{}',
   '{"protocol":"toapis-video","submit_path":"/v1/videos/generations","poll_path":"/v1/videos/generations/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","prompt":"{prompt}","video_url":"{video_url}","resolution":"{resolution}","ratio":"{ratio}","duration":"{duration}"},"task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}'),
  -- 字幕擦除
  ('ep_vid_erase_sub', 'video.erase.subtitle', '字幕擦除（视频编辑）', 'ch_toapis', 'https://toapis.cn', 'wan3.0-video', 300000, 2, 10, 1, '{}',
   '{"protocol":"toapis-video","submit_path":"/v1/videos/generations","poll_path":"/v1/videos/generations/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","prompt":"{prompt}","video_url":"{video_url}","resolution":"{resolution}","ratio":"{ratio}","duration":"{duration}"},"task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}'),
  -- 水印擦除
  ('ep_vid_erase_wm', 'video.erase.watermark', '水印擦除（视频编辑）', 'ch_toapis', 'https://toapis.cn', 'wan3.0-video', 300000, 2, 10, 1, '{}',
   '{"protocol":"toapis-video","submit_path":"/v1/videos/generations","poll_path":"/v1/videos/generations/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","prompt":"{prompt}","video_url":"{video_url}","resolution":"{resolution}","ratio":"{ratio}","duration":"{duration}"},"task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}'),
  -- 图片口播 30 秒
  ('ep_speak_30', 'image-speak.30s', '图片口播 30 秒', 'ch_toapis', 'https://toapis.cn', 'wan3.0-video', 300000, 2, 10, 1, '{}',
   '{"protocol":"toapis-video","submit_path":"/v1/videos/generations","poll_path":"/v1/videos/generations/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","prompt":"{prompt}","reference_images":"{reference_images}","audio_with_roles":"{audio_with_roles}","resolution":"{resolution}","ratio":"{ratio}","duration":"{duration}"},"task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}'),
  -- 图片口播 60 秒
  ('ep_speak_60', 'image-speak.60s', '图片口播 60 秒', 'ch_toapis', 'https://toapis.cn', 'wan3.0-video', 300000, 2, 10, 1, '{}',
   '{"protocol":"toapis-video","submit_path":"/v1/videos/generations","poll_path":"/v1/videos/generations/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","prompt":"{prompt}","reference_images":"{reference_images}","audio_with_roles":"{audio_with_roles}","resolution":"{resolution}","ratio":"{ratio}","duration":"{duration}"},"task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}'),
  -- 图片口播 60 秒轻量
  ('ep_speak_60_light', 'image-speak.60s.light', '图片口播 60 秒（轻量）', 'ch_toapis', 'https://toapis.cn', 'wan3.0-video', 300000, 2, 10, 1, '{}',
   '{"protocol":"toapis-video","submit_path":"/v1/videos/generations","poll_path":"/v1/videos/generations/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","prompt":"{prompt}","reference_images":"{reference_images}","audio_with_roles":"{audio_with_roles}","resolution":"{resolution}","ratio":"{ratio}","duration":"{duration}"},"task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}'),
  -- 改口型
  ('ep_lipsync_1m', 'lipsync.volc.1min', '视频改口型 1 分钟', 'ch_toapis', 'https://toapis.cn', 'wan3.0-video', 300000, 2, 10, 1, '{}',
   '{"protocol":"toapis-video","submit_path":"/v1/videos/generations","poll_path":"/v1/videos/generations/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","prompt":"{prompt}","video_list":"{video_list}","audio_with_roles":"{audio_with_roles}","ratio":"{ratio}","duration":"{duration}"},"task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}'),
  -- 厂家介绍视频 标准版
  ('ep_factory_60', 'factory-video.60s', '厂家介绍视频 60 秒标准版', 'ch_toapis', 'https://toapis.cn', 'wan3.0-video', 300000, 2, 10, 1, '{}',
   '{"protocol":"toapis-video","submit_path":"/v1/videos/generations","poll_path":"/v1/videos/generations/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","prompt":"{prompt}","reference_images":"{reference_images}","resolution":"{resolution}","ratio":"{ratio}","duration":"{duration}"},"task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}'),
  -- 厂家介绍视频 轻量版
  ('ep_factory_60_light', 'factory-video.60s.light', '厂家介绍视频 60 秒轻量版', 'ch_toapis', 'https://toapis.cn', 'wan3.0-video', 300000, 2, 10, 1, '{}',
   '{"protocol":"toapis-video","submit_path":"/v1/videos/generations","poll_path":"/v1/videos/generations/{task_id}","auth_header":"Authorization","auth_prefix":"Bearer ","request_template":{"model":"{upstream_model}","prompt":"{prompt}","reference_images":"{reference_images}","resolution":"{resolution}","ratio":"{ratio}","duration":"{duration}"},"task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}'),
  -- 语音合成（占位接入点 —— 通道未启用前不会参与回退）
  ('ep_tts_doubao', 'doubao-tts-2.0', '豆包语音合成 2.0', 'ch_tts', '', 'doubao-tts-2.0', 120000, 1, 10, 1, '{}', NULL)
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), upstream_model = VALUES(upstream_model),
  template_json = VALUES(template_json);

-- ---------------- 定价 ----------------
-- 行内注释6：语音合成此前没有定价条目 —— /tts/jobs 会在报价阶段直接 400「未找到定价条目」，
--            导致「生成音频」这条路彻底走不通。这里补上基线价。
INSERT INTO ability_pricing (id, model_key, spec, points, cost, label, model, capability)
VALUES
  ('doubao-tts-2.0|默认音色', 'doubao-tts-2.0', '默认音色', 2, 0.80, '语音合成', '豆包语音合成 2.0', 'tts')
ON DUPLICATE KEY UPDATE points = VALUES(points), cost = VALUES(cost), label = VALUES(label),
  model = VALUES(model), capability = VALUES(capability);
