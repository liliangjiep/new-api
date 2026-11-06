# new-ai 后端接口 V1（按前端字段逻辑对齐）

> 版本 v1.0 ｜ 2026-11-06 ｜ 对齐前端 34 页面 + REA 逆向 4 个真实端点 + 技术架构 §5.2
> 约定继承技术架构：前缀 `/api/v1`，成功 `{data,request_id}`，列表 `{data,pagination}`，错误 `{error:{code,message,details}}`，写操作支持 `Idempotency-Key`，`Authorization: Bearer <access_token>`（access 15min / refresh 30d，服务端 `login_version` 踢下线）。
> 图片联调第一优先级走 ToAPI 透传（前端已有 `/api/images/generations` Next 代理），Java Adapter 侧以 `RelayAdapter(toapi)` 先跑通图片，后续再切渠道路由。

## 0. 缺口对照（前端要什么 / 后端现状 / 本次补什么）

| 模块 | 前端页面要的接口 | 后端现状 | 本次补齐 |
|---|---|---|---|
| 认证/用户 | sms发送/校验、密码登录、refresh、logout、sessions列表+下线、GET/PATCH /users/me、头像直传 | 架构文档只有 sms 4 个，无密码登录/sessions/用户资料 | 新增 `password/login`、`sessions`、`users/me`，字段按 `LoginModal`（双页签：短信/账号）与 `panels-a ProfilePanel`（nickname/email/company/bio/avatar_asset_id） |
| 积分/充值/订单 | balance、ledger（充值/消耗/退回/赠送）、packages、orders建单+列表+详情、微信+支付宝回调 | 只有 balance/ledger/orders建单 | 补 `packages` 公开表、`orders` 列表详情、微信/支付宝双回调、`/admin/credits/adjust`（大额≥1000二次确认， panels-a/b 逻辑） |
| 任务统一链路 | quote（指纹防篡改15min）→submit（幂等键）→详情/列表/重试/取消→SSE progress/events→batches批量 | 只有 quote/submit/详情/progress/batches提交 | 补 `tasks` 列表/重试/取消、`batches` 详情+`events(SSE)`、`video-segment-retake/quote+submit`（editor 分段重生成），字段按 `QuotePanel`（lines/label/spec/points/discount/fingerprint/expires_at）与 tasks/workbench mock（title/capability/status/progress/points/createdAt/model/failReason/usage_record追溯） |
| 资产 | 列表（kind/group/source/query）、upload-policy→complete两段式、改名/分组/删除/批量删、分组CRUD、按source筛选（全部/我上传/AI生成） | 只有 upload-policy/complete | 补全列表/改名/分组/删除/批量，按 `AssetPickerModal` 筛选维度（kind=video/image/audio/media × source=all/upload/ai + 文件名query + maxSelect）与 assets 页（group+tags+thumb+size+createdAt） |
| 发现 | feed游标分页（filter图片/视频/数字人/石材+query）、详情（含params_snapshot一键复用） | 无 | 新增 `discover/feed+items/{id}`，复刻 REA 真实端点 `/discover/items/`，字段按 discover 页 MOCK_ASSETS派生（cover/capability/points/tags/tool_href） |
| 模型路由/定价公开 | model-routes/public、pricing/table、recharge/packages、image/video skills | 只有 model-routes/public | 补 `pricing/table`（与 PRICING_TABLE 19项：capability/label/spec/points/margin/model）、`skills/image+video`（IMAGE_SKILLS 11 promptTemplate / VIDEO_SKILLS 19 refSlots{images:30,videos:10,audios:10} + option_groups） |
| 语音输入/Agent | transcribe（PromptComposer语音按钮）、agent/chat SSE+技能挂载+sessions+messages、cloud-runtime+desktop-session | 无 | 复刻 REA 真实端点 `POST /speech-input/transcribe`、`POST /agent/cloud-runtime`、`POST /agent/cloud-runtime/desktop-session`，补 chat/sessions/messages/skills，字段按 agent-chat/agent-cloud（skill/model/streaming/stop/regenerate） |
| 画布 | 列表/新建/改名/删除、graph整体存取（last-write-wins+version 409）、versions+restore、share链接、templates | 架构表有 canvases 但无接口 | 新增 7 个，字段按 canvas 页（Project{id,title,at} + Card{id,x,y,text} + 本地键 xin-canvas-projects 迁移） |
| 数字人 | avatars列表（standardized_only）+新建+标准化、voices+clone+slots、tts/jobs、digital-human/jobs（avatar+audio/script→image-speak/lipsync）、authorizations | 无 | 新增 8 个，字段按 digital-human 页（avatar/audio/script三步 + ready=avatar&&audio + 队列+预览） |
| 石材/厂介 | scene-templates14、effect-jobs（材质锚定material_desc+模板+规格+多视角）、refine-queue（色差>0.15重生转人工）、materials CRUD+export打包、script-templates、factory-video-jobs（avatar+sites+template_id+variables） | 无 | 新增 8 个，字段按 stone-effect（mainColor/textureDesc/scene/lighting/resolution/views/material_desc指纹 + consistency 0.08~0.2）、stone-materials（tags/attrs）、factory-video（STEPS四步 + script.length/4≈秒数 + auth授权） |
| 视频工具链 | depth-clone（depth/storyboard/element-replace三模式）、ecommerce-set（6张+单张regenerate）、video-remix/viral、quality-enhance、subtitle-erase（regions框选）、watermark-remove、video-creator（skill_pack+19技能+ref槽位） | 无 | 新增 8 个，统一收敛到 `tasks(submit)` capability 区分：`video-depth-clone/video-storyboard/element-replace/ecommerce-set/video-remix/video-enhance/video-erase/video-decensor/video-creator`，保留业务语义校验（如 erase 必须带 regions，creator 必须带 skill_pack 且 ref 计数符合 VIDEO_SKILLS.refSlots） |
| 发票/分销用户侧 | invoices申请+列表（抬头类型个人/企业+税号15~20位+金额）、affiliate概览/结算/提现 | 无 | 新增 6 个，字段按 panels-b InvoicesPanel（titleType/title/taxNo/amount/status）与 affiliate（partner/commission/settlement/withdrawal） |
| 管理后台20组 | users/review/billing/ledger/packages/video-skills/announcements/public-assets/channels/endpoints/pricing/bills/invoices/affiliate/settlement/reports/dashboard/audit/invite-codes + endpoint-changes + balances告警 | 只有 channels/endpoints/pricing 9个 | 补全 20 组共 ~38 个，字段按 admin/[section] 各 Panel（users检索/封禁/下线、review审核、billing套餐+充值卡、ledger三段式不可变、packages版本、video-skills option_groups、announcements置顶有效期、public-assets授权、channels余额三级告警、bills日终对账、invoices人工开票、affiliate佣金账期、settlement打款、reports归因、dashboard日报、audit trace_id、invite-codes归因） |

## 1. 通用逻辑（跨接口，全局遵守）

1. 报价→冻结→提交→轮询→结算五步，幂等键贯穿通道重试，跨通道重试不消耗 attempts；失败全额退回并记 ledger 一笔“退回”。
2. 报价指纹：`fingerprint= HMAC(params+model_key+spec+count+user_id+expires_at)`，15min有效，submit 必带且服务端重算比对，防篡改（QuotePanel/editor/各工具页共用）。
3. 冻结/结算/退回三段式：submit 冻结（ledger type=frozen），worker 成功转结算（settle）/失败转退回（refund），余额=可用-冻结，流水不可变。
4. SSE：`GET /tasks/{id}/progress` 与 `GET /batches/{id}/events` 均为 `text/event-stream`，事件 `progress{progress,status}` / `done{result_urls}` / `failed{error_code,message,refunded}`；断线前端降级轮询（tasks 页 TODO 即此逻辑）。
5. 直传：`upload-policy→complete` 两段式，前端直连 OSS/TOS 不经后端中转；policy 返回 `{upload_url,asset_id,headers,expires_in}`，complete 回填 `{size,etag}` 后资产才可见；图片需 EXIF 清理+缩略图派生。
6. 管理写操作全部记 audit（含操作人/前后值/理由/二次确认），改价带毛利护栏（毛利<30%黄警，<10%或售价<成本红禁），大额补扣（≥1000）需二次确认。
7. 错误码 `<域>.<原因>`：`auth.unauthorized/auth.code_invalid/credit.insufficient/task.quote_expired/task.idempotent_conflict/channel.circuit_open/asset.too_large/invoice.tax_invalid` 等，message 中文可展示。

## 2. 端点清单（按页面，89 个，字段即契约）

### 2.1 认证/用户（LoginModal + panels-a，短信+密码双轨）

- `POST /auth/sms/send` {phone} → `{cooldown:60}`，限流 同IP 5次/10min。
- `POST /auth/sms/verify` {phone,code} → `{access_token,refresh_token,user{id,nickname,phone,role,balance}}`，新号自动注册。
- `POST /auth/password/login` {account(phone/email),password} → 同上，失败 5 次锁 15min。
- `POST /auth/refresh` {refresh_token} → 新 access_token（refresh 轮换）。
- `POST /auth/logout` → 204（refresh 作废）。
- `GET /auth/sessions` → `[{id,device,ip,created_at,current}]`；`DELETE /auth/sessions/{id}` 下线。
- `GET /users/me` → `{id,nickname,phone,email,company,bio,avatar_url,role,balance,frozen,expires_at}`。
- `PATCH /users/me` {nickname(≤20),email,company,bio,avatar_asset_id} → user，email 正则校验。

### 2.2 积分/充值（panels-a CreditsPanel + panels-b + pricing）

- `GET /points/balance` → `{available:2480,frozen:0,expires_at}`。
- `GET /points/ledger?page,page_size,type(全部/充值/消耗/退回/赠送)` → `[{id,time,type,amount,balance,note,task_id,order_no}]` 不可变。
- `GET /recharge/packages` → RECHARGE_PACKAGES 6 档 `{code,name,amount,credits,bonus_rate,audience}` 公开。
- `POST /recharge/orders` {package_code,pay_method(微信支付/支付宝/对公转账)} → `{order_no,pay_url,amount,credits}`，Idempotency-Key 必带。
- `GET /recharge/orders?page,page_size` / `GET /recharge/orders/{no}` → `{no,pkg,amt,cr,status(待支付/已支付/已关闭),time}`。
- `POST /recharge/callback/wechat` + `POST /recharge/callback/alipay`（验签+幂等+金额校验）→ 到账并记 ledger 充值+赠送两笔。
- `POST /admin/credits/adjust` {user_id,amount,reason} → ledger 新条 + audit，大额二次确认。

### 2.3 任务统一链路（tasks/workbench + 全部工具页 SubmitBar/QueuePanel）

- `POST /tasks/quote` {model_key,spec,count,params} → `{estimated_credits,lines[{label,spec,points,discount?}],fingerprint,expires_at}`。
- `POST /tasks/submit` {model_key,params,quote_fingerprint,idempotency_key} → `{id,status:pending,progress:0,points,model,created_at}`；指纹过期 410 `task.quote_expired`；幂等键冲突 409 返回原 task。
- `GET /tasks?page,page_size,status,query` / `GET /tasks/{id}` → task 含 `fail_reason,usage_record{channel,upstream_cost,points_charged}` 追溯。
- `POST /tasks/{id}/retry` / `POST /tasks/{id}/cancel(pending可取消)`。
- `GET /tasks/{id}/progress(SSE)` / `POST /tasks/batches{items[]}` / `GET /batches?page,page_size,status` / `GET /batches/{id}` / `GET /batches/{id}/events(SSE)`。
- `POST /video-segment-retake/quote` {segment_id,track_snapshot} → `{quote,fingerprint}`；`POST /video-segment-retake/submit` 同 tasks 语义。

### 2.4 资产（assets + AssetPickerModal + UploadSlots）

- `GET /assets?page,page_size,kind(video/image/audio),group,source(all/upload/ai),query` → `[{id,name,kind,size,created_at,group,tags,thumb,url,duration,source}]`。
- `POST /assets/upload-policy` {filename,size,content_type,kind,group} → `{upload_url,asset_id,headers,expires_in}`（≤5MB 头像 / 视频 ≤500MB 校验）。
- `POST /assets/complete` {asset_id,size,etag} → asset。
- `PATCH /assets/{id}` {name,group,tags} / `DELETE /assets/{id}` / `POST /assets/batch-delete{ids}`。
- `GET /asset-groups` / `POST /asset-groups{name}`（assets 页分组维度）。

### 2.5 发现/公开（discover + pricing + toolbox）

- `GET /discover/feed?cursor,limit,filter(全部/图片/视频/数字人/石材),query` → `{items[{id,title,cover_url,capability,points,tags,tool_href,params_snapshot}],next_cursor}`。
- `GET /discover/items/{id}` → 详情含 `params_snapshot` 一键复用（复刻 REA 真实端点）。
- `GET /model-routes/public` → `[{key,label,provider,capability,discount_rate,enabled}]`。
- `GET /pricing/table` → PRICING_TABLE 19 项 `{capability,label,spec,points,margin,model}`。
- `GET /skills/image` → IMAGE_SKILLS 11 项含 `promptTemplate({user}占位拼接)`；`GET /skills/video` → VIDEO_SKILLS 19 项含 `refSlots+category/description`。

### 2.6 语音/Agent（PromptComposer + agent-chat + agent-cloud，复刻 REA 3 个真实端点）

- `POST /speech-input/transcribe` {audio_asset_id} → `{text}`（原站直调，PromptComposer 语音按钮）。
- `POST /agent/chat(SSE)` {session_id?,message,skill?,model?} → 流式 tokens，前端 mock 逻辑（挂载技能回显+stop/regenerate）即此流。
- `GET /agent/sessions` / `POST /agent/sessions{title,skill?}` / `GET /agent/sessions/{id}/messages`。
- `GET /agent/skills` → 可挂载 6 项（智能编导/视频生成/图片生成/字幕擦除/画质增强/厂家介绍视频）。
- `POST /agent/cloud-runtime{task}` → `{pod_id,status}`；`POST /agent/cloud-runtime/desktop-session` → `{session_url}`（agent-cloud 沙箱占位）。

### 2.7 画布（canvas，localStorage 迁移）

- `GET /canvases` / `POST /canvases{title}` / `GET /canvases/{id}` / `PATCH /canvases/{id}{title}` / `DELETE /canvases/{id}`。
- `PUT /canvases/{id}/graph{nodes[{id,x,y,text}],edges,version}` → version mismatch 409 `canvas.version_conflict`（last-write-wins）。
- `GET /canvases/{id}/versions` / `POST /canvases/{id}/versions/{v}/restore` / `POST /canvases/{id}/share` → `{share_url}` / `GET /canvas/templates`。

### 2.8 数字人（digital-human + factory-video 步骤1）

- `GET /avatars?standardized_only` → `[{id,name,url,standardized}]`（未标准化不可提交，factory-video 校验）。
- `POST /avatars{asset_id}` / `POST /avatars/{id}/standardize`。
- `GET /voices` / `POST /voices{name,audio_asset_ids[]}` 克隆 / `GET /voice-slots`。
- `POST /tts/jobs{text,voice_id}` → task(capability=tts)。
- `POST /digital-human/jobs{avatar_id,audio_asset_id|tts_text,script?,mode(口播/改口型)}` → task（image-speak/lipsync），ready=avatar&&audio。
- `GET /authorizations`（肖像/声音授权文件，敏感链路走官方直连）。

### 2.9 石材/厂介（stone-effect + stone-materials + factory-video）

- `GET /stone/scene-templates` → 14 类 `{key,label,prompt,group(室内/外立面/部件),lighting}`。
- `POST /stone/effect-jobs{material_asset_id,main_color,texture_desc,scene_key,lighting,resolution(2k/4k),views[]}` → batch（含 material_desc 锚定指纹 + quote）。
- `POST /stone/refine-queue{job_id,note}`（色差>0.15 自动重生，重试失败转人工）。
- `GET /stone/materials?page,page_size,tags,query` / `POST /stone/materials{asset_id,tags,attrs}` / `PATCH /stone/materials/{id}` / `DELETE /stone/materials/{id}` / `POST /stone/materials/export{ids}` → `{download_url}`。
- `GET /stone/script-templates` → `[{id,label,body}]`；`POST /stone/factory-video-jobs{avatar_id,site_asset_ids[],template_id,variables,spec(60秒标准/轻量)}` → batch（口播秒数≈script.length/4）。

### 2.10 视频工具链（收敛到 tasks capability，保留语义校验）

- `POST /depth-clone/jobs{mode(depth/storyboard/element-replace),ref_video_asset_id,ref_image_asset_ids[],prompt,model,spec}`。
- `POST /ecommerce-set/jobs{product_asset_ids[],lang,ratio,model,resolution,format}` → batch 6 项；`POST /ecommerce-set/items/{id}/regenerate`。
- `POST /video-remix/jobs{source_video_asset_id,strategy}`（hot-video-remix） / `POST /video-remix-viral/jobs{...}`。
- `POST /video-quality-enhance/jobs{video_asset_id,target}` / `POST /video-subtitle-erase/jobs{video_asset_id,regions[]}` / `POST /video-watermark-remove/jobs{video_asset_id}`。
- `POST /video-creator/jobs{skill_pack,ref_image_ids[],ref_video_ids[],ref_audio_ids[],prompt,model,spec}`（ref 计数按 VIDEO_SKILLS.refSlots 校验）。

### 2.11 发票/分销用户侧（account/invoices + affiliate）

- `GET /invoices?page,page_size` / `POST /invoices{title_type(个人/企业),title,tax_no(企业15~20位),amount,order_nos[]}` → 待审核。
- `GET /affiliate/overview` `{partner,commission_balance,settlements}` / `GET /affiliate/settlements` / `POST /affiliate/withdrawals{amount}`。

### 2.12 管理后台 20 组（admin + admin/[section]，38 个）

- users：`GET /admin/users?page,q,status` / `GET /admin/users/{id}` / `POST /admin/users/{id}/ban|unban` / `POST /admin/users/{id}/force-logout`（login_version++）。
- review：`GET /admin/review?status` / `POST /admin/review/{id}/approve|reject{reason}`。
- billing/ledger：`GET /admin/packages`+CRUD（含充值卡）、`GET /admin/ledger?page,type`、`GET /admin/endpoint-changes`（改通道留痕行）。
- packages/video-skills：`GET/POST/PATCH/DELETE /admin/packages`（版本管理）、`GET/PUT /admin/video-skills`（含 option_groups JSON）。
- announcements/public-assets：CRUD + `POST /announcements/{id}/pin`（置顶有效期）、public-assets 授权范围。
- channels/endpoints/pricing（架构已有 9 个照搬）+ `GET /admin/channels/balances`（三级告警 30/14/7 天）+ `GET /admin/bills` + `POST /admin/bills/reconcile`（差异>0.5%告警/>2%停通道）。
- invoices/affiliate/settlement：`GET /admin/invoices` + `POST /admin/invoices/{id}/approve|reject`（人工开票）、partners/commissions/settlements/withdrawals 审核打款。
- reports/dashboard/audit/invite-codes：`GET /admin/reports/tasks`（量/成功率/失败归因）、`GET /admin/dashboard`（增长/成本/毛利日报）、`GET /admin/audit?page`（trace_id链路）、invite-codes 生成/归因/统计。

## 3. 按页面补齐清单（联调顺序 = ToAPI先行 → 任务链 → 资产 → 商业化 → 后台）

| 顺序 | 页面 | 首批联调接口 | 字段注意 |
|---|---|---|---|
| P0 | image-generation/video-generation + PromptComposer | quote→submit→tasks/{id}(轮询)→upload-policy/complete→transcribe→model-routes/public+skills | ToAPI 先行：Java `RelayAdapter(toapi)` 透传 `gpt-image-2`，body `{model,prompt,size,resolution,n}` 与前端 Next 代理一致；size 仅 `1:1/3:2/4:3/16:9/9:16/2:1/3:4`，resolution 1k/2k/4k |
| P0 | tasks/workbench | tasks列表/详情/重试/取消 + batches+events(SSE) | failReason/已退回徽标/报价指纹/幂等键/usage_record，一个 SSE 断线必须能降级轮询 |
| P1 | assets + 各工具 UploadSlots/AssetPickerModal | assets列表/policy/complete/改名/分组/删除 | kind×source 两维筛选 + maxSelect 限数，policy 5min过期 |
| P1 | account（资料/安全/余额/流水/订单/发票/API Key） | users/me+sessions+balance+ledger+orders+invoices | 密码≥8位、税号正则、API Key 仅展示一次、冻结/有效期文案 |
| P1 | pricing/discover/toolbox | packages+pricing/table+discover/feed+items | 测算器口径=QuotePanel，feed cursor 分页 |
| P2 | agent-chat/agent-cloud | chat SSE+sessions+messages+skills+cloud-runtime×2 | 流式 stop/regenerate 语义 |
| P2 | canvas/editor | canvases×7 + segment-retake×2 | version 409、本地 localStorage 迁移 |
| P2 | digital-human/stone/factory/ecommerce/depth/remix/enhance/erase/decensor/creator | §2.8–2.10 共 24 个 | 每个 submit 必须先 quote；erase 带 regions；creator 带 skill_pack+ref计数；effect 带 material_desc；factory 带 template_id+variables |
| P3 | admin 20组 | 38 个管理接口 | 写操作 audit+二次确认，改价毛利护栏，余额三级告警 |

## 4. 需要你确认的联调问题（已按你选项落定）

1. 登录双轨：短信+密码都要真接口，密码失败5次锁15min可接受？（已按 sms-pwd 落文档）
2. 支付双通道：微信+支付宝都接真回调，对公转账走人工确认（orders 状态机 待支付→已支付/已关闭，回调验签+金额校验）。
3. 上游：图片先透传 ToAPI（`TOAPIS_BASE_URL/TOAPIS_API_KEY` 由后端持有，前端继续走 Next 代理或切 Java `/tasks/submit`，参数同构），视频后切 Adapter+渠道路由。
4. 后台 20 组全做：首批先联调 channels/endpoints/pricing/users/ledger 5 个，其余按 §2.12 逐组开（接口已全部在契约中定义，前端可并行切 mock→真数据）。
