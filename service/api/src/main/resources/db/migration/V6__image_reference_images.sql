-- ============================================================
-- V6：图片接入点支持参考图（图生图）+ 技能包提示词合流
-- 行内注释1：为什么单独一个迁移 —— V2 已上线过，不能改它（Flyway 校验 checksum 会失败）。
--            这里新增 V6，只做「追加」：改写 model_endpoints 的 template_json。
--
-- 行内注释2：为什么需要参考图 —— 图片生成页有 9 个参考图槽位（原站实测上限 9），
--            但此前前端选了参考图后完全不提交，后端也不翻译，
--            整条「图生图」链路是断的：用户传了图，出图却跟没传一样。
--            上游 gpt-image-2 支持 reference_images（URL 数组，最多 14 张），
--            这里把接入点模板补上该字段，UpstreamParamBuilder 会把资产 ID 翻成真实 URL。
--
-- 行内注释3：reference_images 是单占位符 —— RelayAdapter 的 substitute 对
--            「整串就是一个 {key}」的模板值会保留原始类型（List），
--            所以上游收到的是 JSON 数组而不是字符串化的 "["a","b"]"。
--
-- 行内注释4：为什么这里是 CASE 而不是简单的 JSON_SET ——
--            图片接入点（ep_img_1k / ep_img_2k / ep_img_4k / ep_stone_*）的
--            template_json 在库里是 NULL（走通道级 + 内置默认模板），
--            而 e2e 测试建的死站接入点（ep_dead / ep_live）template_json 是空串。
--            对这些行做 JSON_SET 会得到 NULL（对 NULL 输入 JSON_SET 返回 NULL），
--            对空串做 JSON_EXTRACT 则直接报
--            "Invalid JSON text in argument 1 to function json_extract: The document is empty"，
--            实测这会让 V6 迁移整个失败、Flyway 记录 success=0，
--            后端启动直接被卡住（Application run failed）。
--            所以这里分三种情况：
--              a) template_json 为 NULL / 空串 / 非法 JSON / 空对象
--                 → 直接写入一份完整的图片模板（含 reference_images）；
--              b) 已有合法且非空的模板
--                 → 只补 reference_images 这一个键，不动其它字段；
--              c) 其余不动。
--            CASE 的 WHEN 条件按顺序短路求值，
--            因此 JSON_LENGTH 只会作用在已确认合法的 JSON 上。
-- ============================================================

UPDATE model_endpoints
SET template_json = CASE
      WHEN template_json IS NULL OR template_json = '' THEN
        '{"protocol":"toapis-image","submit_path":"/v1/images/generations",
          "poll_path":"/v1/images/generations/{task_id}",
          "auth_header":"Authorization","auth_prefix":"Bearer ",
          "request_template":{"model":"{upstream_model}","prompt":"{prompt}","size":"{size}",
            "resolution":"{resolution}","n":"{n}","reference_images":"{reference_images}"},
          "task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}'
      WHEN NOT JSON_VALID(template_json) THEN
        '{"protocol":"toapis-image","submit_path":"/v1/images/generations",
          "poll_path":"/v1/images/generations/{task_id}",
          "auth_header":"Authorization","auth_prefix":"Bearer ",
          "request_template":{"model":"{upstream_model}","prompt":"{prompt}","size":"{size}",
            "resolution":"{resolution}","n":"{n}","reference_images":"{reference_images}"},
          "task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}'
      WHEN JSON_LENGTH(template_json) = 0 THEN
        '{"protocol":"toapis-image","submit_path":"/v1/images/generations",
          "poll_path":"/v1/images/generations/{task_id}",
          "auth_header":"Authorization","auth_prefix":"Bearer ",
          "request_template":{"model":"{upstream_model}","prompt":"{prompt}","size":"{size}",
            "resolution":"{resolution}","n":"{n}","reference_images":"{reference_images}"},
          "task_id_path":"id","status_path":"status","result_urls_path":"result.data[0].url"}'
      ELSE JSON_SET(template_json, '$.request_template.reference_images', '{reference_images}')
    END
WHERE model_key IN ('image.t2i.1k', 'image.t2i.2k', 'image.t2i.4k',
                     'stone.effect.2k', 'stone.effect.4k', 'stone.effect.set6');
