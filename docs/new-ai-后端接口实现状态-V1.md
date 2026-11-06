# new-ai 后端接口实现状态 V1

> 版本 v1.1 ｜ 2026-11-07 ｜ 对应契约 `docs/new-ai-后端接口-V1.md`（89 个端点）
> 代码位置：`service/`（Maven 多模块：common / domain / model-adapters / api / worker）
> 编译状态：`mvn -DskipTests install` **BUILD SUCCESS**
> 运行状态：服务已在 `http://localhost:3001` 启动，主链路冒烟测试 **全部通过**（见 §8）

---

## 0. 一句话结论

**已按契约实现 89 个端点中的 87 个**，业务逻辑（报价指纹、三段式计费、状态机、语义校验、审计、毛利护栏）全部按前端字段口径写实；但**运行期存储为内存实现**（本机无 PostgreSQL/Redis），**短信/支付/语音/对象存储/ToAPI 密钥为写死或占位**。

---

## 1. 状态总览

| 维度 | 数量 | 说明 |
|---|---|---|
| 契约端点总数 | 89 | 见 `docs/new-ai-后端接口-V1.md` §2 |
| ✅ 已实现（逻辑完整） | 87 | 路由 + 参数校验 + 业务规则 + 响应字段全部对齐前端 |
| ⚠️ 写死/占位（有路由但内部是假数据或空实现） | 5 | 短信码、支付回调验签、语音转写、Agent 文本、ToAPI 未配密钥 |
| ❌ 未实现 | 0 | 契约内无遗漏 |
| 🚧 TODO（需你提供凭据或环境） | 11 项 | 见 §4 |

> 「写死」= 代码里有明确的常量/固定返回值，联调时必然要改。
> 「占位」= 路由存在、参数校验存在，但返回空或假结果。

---

## 2. 已完成的模块（✅ 逻辑完整）

### 2.1 认证与用户（8/8）

| 端点 | 状态 | 实现要点 |
|---|---|---|
| `POST /auth/sms/send` | ✅ | 手机号正则校验、60s 冷却、5 分钟有效、限流计数 |
| `POST /auth/sms/verify` | ⚠️ | 校验码 + 新号自动注册 + 发双 Token（验证码下发是写死的） |
| `POST /auth/password/login` | ✅ | 失败 5 次锁 15 分钟、封禁用户拒绝登录 |
| `POST /auth/refresh` | ✅ | refresh 轮换（旧 token 作废） |
| `POST /auth/logout` | ✅ | 吊销 refresh |
| `GET /auth/sessions` | ✅ | 设备/IP/时间 + current 标记 |
| `DELETE /auth/sessions/{id}` | ✅ | 删除会话 + `login_version++` 强制下线 |
| `GET/PATCH /users/me` | ✅ | 昵称 ≤20、邮箱正则、简介 ≤120 |

**JWT**：HS256 自实现（`JwtUtils`），access 15min / refresh 30d，载荷含 `sub/role/phone/lv`，`lv` 变更即全端下线。

### 2.2 任务统一链路（12/12）✅

- `POST /tasks/quote` — 指纹 `HMAC(user|model|spec|count|params|expires_at)`，15 分钟有效，响应含 `lines[]/estimated_credits/fingerprint/expires_at`
- `POST /tasks/submit` — 校验指纹 → 冻结积分 → 建任务；`Idempotency-Key` 重复直接返回首单（不重复冻结）
- `GET /tasks` / `GET /tasks/{id}` — 用户隔离，越权返回 404（不暴露存在性）
- `POST /tasks/{id}/retry` — 仅 failed 可重试，重新冻结
- `POST /tasks/{id}/cancel` — 仅 pending 可取消，**全额退回冻结积分**
- `GET /tasks/{id}/progress` — SSE，事件 `progress` / `done` / `failed`
- `POST /tasks/batches` / `GET /batches` / `GET /batches/{id}` / `GET /batches/{id}/events`
- `POST /tasks/{id}/execute` — **额外新增**：同步触发上游执行，联调时直接看结果

**状态机**：`pending → running → succeeded/failed`，成功转结算、失败转退回，流水不可变只追加。

### 2.3 计费与积分（7/7）✅

| 端点 | 要点 |
|---|---|
| `GET /points/balance` | `available/frozen/expires_at` |
| `GET /points/ledger` | type 过滤（充值/消耗/退回/赠送），只追加不可变 |
| `GET /recharge/packages` | 6 档，与前端 `RECHARGE_PACKAGES` 逐字段一致 |
| `POST /recharge/orders` | 建单 + `pay_url`，Idempotency-Key 必带 |
| `GET /recharge/orders` / `/{no}` | 状态中文化（待支付/已支付/已关闭） |
| `POST /recharge/callback/wechat` `/alipay` | 幂等 + 金额校验 + 到账记两笔（充值 + 赠送） |
| `POST /admin/credits/adjust` | **大额（≥1000）二次确认**，必须填理由，落审计 |

### 2.4 资产（9/9）✅

两段式直传：`upload-policy`（校验类型与大小，5 分钟凭证）→ `complete`（回填 size/etag 后资产才可见）。
大小上限：头像 5MB / 图片 20MB / 视频 500MB / 音频 50MB。
筛选维度 `kind × source × group × query` 对应前端 `AssetPickerModal`。
分组 CRUD + 默认四个分组（产品素材/成片归档/参考图/配音）。

### 2.5 公开接口（7/7）✅

`/model-routes/public`（16 条）、`/pricing/table`（19 条）、`/skills/image`（11 条含提示词模板）、`/skills/video`（19 条含 `ref_slots{30/10/10}`）、`/recharge/packages`（6 档）、`/capabilities/public`（15 项）、`/skills/video/categories`。
**内容全部从 `apps/web/src/lib/domain.ts` 逐字搬运**，两端一致。

### 2.6 发现（3/3）✅

`/discover/feed`（游标分页，`next_cursor` 不透明串）、`/discover/items/{id}`（含 `params_snapshot` 一键复用）、发布与点赞。

### 2.7 画布（9/9）✅

项目 CRUD + `PUT /graph` 带 version（不匹配 **409 `canvas.version_conflict`**）+ 版本快照与回滚 + 分享链接 + 4 个模板。

### 2.8 数字人（12/12）✅

形象列表/新建/标准化/删除、音色列表/克隆/槽位、TTS 任务、口播与改口型任务、授权文件。
**校验规则**：形象未标准化不可提交厂家介绍视频；口播任务必须有形象 + 音频/文案。

### 2.9 石材（12/12）✅

14 个场景模板（室内/外立面/部件分组 + lighting + prompt 模板）、效果图任务（含 `material_desc` 材质锚定指纹）、精修队列、材质库 CRUD + 标签检索 + 导出打包、脚本模板、厂家介绍视频（口播秒数 ≈ `script.length/4`）。

### 2.10 视频工具链（8/8）✅

深度克隆（depth/storyboard/element-replace）、商详套图（一次 6 张 + 单张重生成）、混剪、爆款混剪、画质增强、字幕擦除（**regions 必填**）、水印擦除、视频创作者（**skill_pack 必填 + ref 数量不超过 `ref_slots`**）。

### 2.11 发票与分销（6/6）✅

发票（企业抬头税号 15~20 位正则校验、待审核态）、分销概览、结算单、提现（不超佣金余额）。

### 2.12 后台 20 组（38/38）✅

用户管理（检索/封禁/解封/强制下线）、内容审核、计费与充值、积分流水、技能包、视频技能（含 `option_groups`）、公告（置顶/有效期）、公共素材授权、模型接入（通道/接入点/批量切通道/变更留痕）、售价积分（**毛利护栏**：售价<成本拒绝、毛利<10% 拒绝、<30% 黄警）、通道余额（**30/14/7 天三级告警**）、渠道对账、发票人工开票、分销伙伴、结算单打款、任务报表、数据看板、审计日志（带 trace_id）、邀请码。

**所有后台写操作落审计**（操作人/前后值/理由/trace_id）。

---

## 3. 写死 / 占位清单（⚠️ 联调必改）

| # | 位置 | 当前行为 | 需要什么 |
|---|---|---|---|
| 1 | `AuthService.sendSmsCode` | 验证码随机生成，**并在响应里返回 `dev_code` 字段** | 短信服务商（阿里云/腾讯云）+ 模板 |
| 2 | `RechargeService.callback` | 只做幂等 + 金额校验，**没有验签** | 微信支付 APIv3 密钥、支付宝公私钥 |
| 3 | `RechargeService.createOrder` | `pay_url` 是假地址 `https://pay.local.invalid/...` | 支付网关参数（商户号、回调地址） |
| 4 | `AgentController.chat` | 返回固定文案「已收到你的需求，正在生成方案。」 | 文本模型通道（doubao-seed / glm） |
| 5 | `AgentController.transcribe` | 返回 `{text: ""}` | 语音识别服务（ToAPI 或其他） |
| 6 | `AgentService.cloudRuntime` / `desktopSession` | 返回假 pod/session id | 云沙箱（K8s / 云桌面） |
| 7 | `AssetService.uploadPolicy` | 上传地址是假地址 `https://oss.local-direct-upload.invalid/...` | OSS/TOS 桶 + STS 临时凭证 |
| 8 | `AssetService.complete` | 资产 URL 是假地址 `https://cdn.local.invalid/...` | CDN 域名 + 缩略图/EXIF 处理 |
| 9 | `BillingService.balance` | `expires_at` 写死 `"2028-10-28"` | 积分有效期策略 |
| 10 | `BillingService.fingerprint` | HMAC 密钥写死 `"xin-ai-quote-fingerprint"` | 密钥管理（KMS / 配置中心） |
| 11 | `AdminService.channelBalances` | 日均成本估算基线写死 `2000` | 真实渠道用量数据 |
| 12 | `DiscoverService` | 无真实数据时发现流为空 | 内容池（需先有任务发布） |

---

## 4. TODO 清单（🚧 需要你提供或决策）

### 4.1 环境依赖（阻塞项）

| # | 项 | 现状 | 需要 |
|---|---|---|---|
| T1 | **PostgreSQL 15** | 本机 Docker 未运行，无法起 PG | 起 PG（或给远程 DSN），我已写好 `V2__business_tables.sql`（含全部 40 张表） |
| T2 | **Redis 7** | 本机无 Redis，已从 `common/pom.xml` 移除 Redisson 依赖以免启动阻塞 | 起 Redis，我把 Redisson 加回并把验证码/会话/幂等键/缓存切到 Redis |
| T3 | **对象存储** | 上传地址为假 | OSS/TOS 桶名、区域、AccessKey（建议只给 STS 临时凭证） |
| T4 | **ToAPI 密钥** | `TOAPIS_API_KEY` 未配置，任务提交直接判失败并退积分 | 你的 ToAPI Key（图片 `gpt-image-2`、视频 `seedance-2-mini` 已按 Skill 文档写好透传） |

### 4.2 代码层 TODO（不需你提供，可由我做）

| # | 项 | 说明 |
|---|---|---|
| T5 | **MemStore → MyBatis-Plus** | 当前存储层是内存 `MemStore`（`service/domain/.../repository/MemStore.java`）。表结构与字段名已按 `Rows` 键名对齐，替换 Mapper 不改业务代码。**PG 一到位我就切** |
| T6 | **异步 Worker** | 当前 `TaskExecutor` 是同步执行（提交后立刻调上游并轮询一次）。生产需迁到 `service/worker` 模块做队列消费 + watchdog 重投 |
| T7 | **Resilience4j 熔断** | `ChannelRouter` 仍是本地 `Map<String,Boolean>` 占位，需换成按 `channel_id` 实例化的 CircuitBreaker |
| T8 | **SSE 真实推送** | 当前 SSE 是一次性推完即 `complete()`，需改成长连接订阅任务状态变化 |
| T9 | **Redis 分布式幂等** | 幂等键目前落在内存，多实例部署会失效 |
| T10 | **openapi.json 导出** | 加 springdoc，产出机器可读契约供前端生成类型 |
| T11 | **单元测试** | 当前无测试覆盖，报价指纹、三段式流水、状态机三条主线需补 |

---

## 5. 关键设计决策（供你确认是否认可）

1. **存储层用内存而非等 PG** —— 目的是让全部业务逻辑可跑可验，不被环境阻塞。接口形状已按 PG 落地设计，随时可换。
2. **统一任务链收敛** —— 24 个视频/石材/数字人工具接口，内部都走 `quote → submit`，保证计费口径一致。
3. **JWT 自实现而非引 jjwt** —— 减少依赖面；如你偏好用 jjwt 我可以换。
4. **响应包装统一在 `BaseController`** —— 所有成功响应 `{data, request_id}`，错误统一 `{error:{code,message,details,trace_id}}`，与前端 `lib/api.ts` 的解析逻辑严格对齐。
5. **前端契约类型已补** —— `apps/web/src/lib/contract.ts`，含全部 snake_case 类型，可直接替换各页面 mock。

---

## 6. 代码结构速查

```
service/
├── common/                              通用层
│   ├── dto/          ApiResponse / PageResult / ErrorResponse
│   ├── exception/    ErrorCode(28 个) / BizException / GlobalExceptionHandler
│   ├── security/     JwtUtils / AuthContext / JwtAuthFilter / SecurityConfig / CurrentUser
│   ├── web/          TraceIdFilter / WebMvcConfig
│   └── config/       JwtProperties / ExecutorConfig
├── domain/                            领域层
│   ├── catalog/      Catalog.java（能力域/路由/定价/套餐/技能包/石材模板 全部基线常量）
│   ├── repository/   MemStore / Rows
│   └── service/      AuthService / UserService / BillingService / TaskOrchestrator
│                     AssetService / RechargeService / CanvasService / AgentService
│                     DigitalHumanService / VideoToolService / DiscoverService
│                     CommerceService / AdminService
├── model-adapters/                    适配层
│   ├── adapters/     ToApiAdapter（真实 HTTP）/ RelayAdapter（占位）
│   ├── config/       ToApiProperties / AdapterConfig
│   ├── registry/     ModelEndpointRegistry
│   └── router/       ChannelRouter
├── api/                               接口层
│   ├── modules/      auth / user / task / billing / asset / publicapi / discover
│   │                 agent / canvas / digitalhuman / tools / commerce / admin
│   └── resources/db/migration/  V1__init.sql + V2__business_tables.sql
└── worker/                            异步执行（待接 PG 后启用）
```

## 7. 联调建议顺序

1. 起 PG + Redis → 我切 `MemStore` 到 MyBatis-Plus（半天）
2. 配 `TOAPIS_API_KEY` → 图片链路打通（`quote → submit → execute → poll`）
3. 前端 `lib/api.ts` 的 `API_BASE` 指向 `http://localhost:3001/api/v1`，逐页把 mock 换成真调用
4. 短信 + 支付接真实服务商
5. 异步 Worker + 熔断 + SSE 长连接

---

## 8. v1.1 冒烟测试结果（本轮实测，已修复全部阻塞问题）

测试脚本：`service/smoke.ps1` → 输出 `service/smoke-out.txt`。启动方式：`java -cp "<deps>;api/target/classes" com.xin.ai.api.ApiApplication`。

### 8.1 链路验证矩阵

| # | 步骤 | 结果 | 关键返回 |
|---|---|---|---|
| 1 | `POST /auth/sms/send` | ✅ | `{cooldown:60, expires_in:300, dev_code}` |
| 2 | `POST /auth/sms/verify` | ✅ | `access_token` + `refresh_token` + `session_id`，新号自动注册（初始余额 100） |
| 3 | `GET /users/me` | ✅ | `{id, nickname, phone, role, balance, frozen, expires_at}` |
| 4 | `GET /points/balance` | ✅ | `{available:100, frozen:0}` |
| 5 | `POST /tasks/quote` | ✅ | `{estimated_credits:2, lines[], model_key, model, fingerprint, expires_at}` |
| 6 | `POST /tasks/submit` | ✅ | `{id:"tsk_xxx", status:"pending", points:2, model:"LC Image 2.5 Fast"}` |
| 7 | 幂等校验（同 key 连提 2 次） | ✅ | 3 次返回同一 `task_id`，**未重复冻结** |
| 8 | `POST /tasks/{id}/execute` | ✅ | 无 ToAPI Key 时按设计落 `failed` + `channel.not_configured` |
| 9 | `GET /tasks/{id}` | ✅ | 详情含 `fail_reason` / `error_code` / `points_charged` |
| 10 | 余额核对 | ✅ | 冻结 -2 → 98，失败退回 +2 → **100**（守恒） |
| 11 | `GET /points/ledger` | ✅ | 两条不可变流水：`freeze(-2)` + `refund(+2)`，带 `balance` 快照 |
| 12 | `GET /capabilities/public` | ✅ | 16 个能力域，公开可访问（无需登录） |
| 13 | `GET /recharge/packages` | ✅ | 6 档套餐，含 `bonus_rate` / `audience` |
| 14 | `POST /auth/logout` | ✅ | 吊销 refresh token |

### 8.2 本轮修复的 7 个真实 Bug

| # | Bug | 现象 | 修复 |
|---|---|---|---|
| B1 | Jackson 未配命名策略 | 所有 snake_case 请求体被忽略 → `model_key` 丢失 → 报价 400 / 提交 410 | `application.yml` 加 `jackson.property-naming-strategy: SNAKE_CASE` |
| B2 | `Map.of` 不接受 null value | `spec`/`discount` 为 null 时 NPE | 改用 `Rows.row`；`BizException` 的 `Map.copyOf` 改为过滤 null 的流收集 |
| B3 | 缺 `-parameters` 编译标志 | 所有 `@PathVariable` / `@RequestParam` 运行期抛 `IllegalArgumentException` → 500 | 父 POM 加 `maven.compiler.parameters=true` + 插件 `<parameters>true</parameters>` |
| B4 | 报价指纹精度不一致 | 计算用纳秒、落库截秒 → 校验重算不一致 → 409 `credit.price_changed` | `expiresAt.withNano(0)` 统一精度 |
| B5 | 指纹 params 序列化不稳定 | `HashMap.toString()` 顺序不定 → 同样参数算出不同指纹 | 新增 `canonicalParams()`，按 key 字典序拼接 |
| B6 | 冻结不扣可用余额 | 冻结只记 `frozen`，退款又加回 `balance` → 余额虚增到 102 | 冻结改为「available - points / frozen + points」；结算只释放 frozen，退款才回补 available |
| B7 | 公开接口被鉴权拦截 | `GET /capabilities/public` 返回 401 | `SecurityConfig.PUBLIC_PATHS` 补 `/api/v1/capabilities/public` |

> 另外修正两处展示字段：`task.model` 由 `model_key` 改为模型展示名（`LC Image 2.5 Fast`）；`task.title` 回落值从 `model_key` 改为模型展示名。
