# new-ai 接口完成度与「待你提供」清单 V2

> 日期：2026-11-07 ｜ 上一版：`new-ai-后端接口实现状态-V1.md`（MySQL 迁移前，已过时）
> 本版基于**代码实际状态**逐个 Controller 核对，非文档自述。

---

## 0. 一句话结论

**后端 156 个端点全部有路由，逻辑层无空壳。** 真正的缺口分两类：

| 类型 | 数量 | 需要谁 |
|---|---|---|
| **A. 需要外部账号/凭据才能真跑**（代码写好了，缺 key/商户号/桶） | 9 项 | **你** |
| **B. 内部仍是假数据/占位**（我不缺凭据，缺的是我自己要写完的实现） | 7 项 | 我 |
| **C. 前端还在用 mock 的页面** | 11 个 | 我 |

**你已经给过的**：ToAPIs key ✅、MySQL ✅、Redis ✅。**还缺的都是外部服务账号。**

---

## 1. A 类：需要你提供账号/凭据的（9 项）

| # | 接口 / 功能 | 代码状态 | **需要你给** | 拿不到的后果 |
|---|---|---|---|---|
| **A1** | 短信验证码 `POST /auth/sms/send` | ✅ 逻辑完整（正则/60s冷却/5分钟有效/Redis存储） | **短信服务商**：阿里云/腾讯云/容联云 三选一 + 签名 + 模板ID + AccessKey | 现在响应里直接返回 `dev_code`，**验证码直接暴露给前端**。生产环境这是致命漏洞 |
| **A2** | 充值下单 `POST /recharge/orders` | ✅ 建单/幂等/金额校验 | **微信支付商户号**（MCHID + APIv3 密钥 + 商户证书）或**支付宝**（AppId + 应用私钥 + 公钥） | `pay_url` 是假地址 `https://pay.local.invalid/...`，用户点不进去 |
| **A3** | 支付回调 `POST /recharge/callback/{wechat,alipay}` | ✅ 幂等 + 金额校验 | 同上（回调验签需要商户密钥） | **回调没验签** —— 伪造回调就能白嫖充值 |
| **A4** | 资产直传 `POST /assets/upload-policy` | ✅ 两段式流程/类型大小校验/5分钟凭证 | **对象存储**：阿里OSS / 腾讯COS / 七牛 的 Bucket + 区域 + AccessKey（建议只给 STS 临时凭证） | 上传地址是假域名 `https://oss.local-direct-upload.invalid/`，**实际文件传不上去** |
| **A5** | 资产完成 `POST /assets/complete` | ✅ 落库带 size/etag/mime | 同 A4 | 资产 URL 是假域名 `https://cdn.local.invalid/...`，前端缩略图裂图 |
| **A6** | Agent 对话 `POST /agent/chat` | ✅ SSE 通道已通 | **文本模型**：豆包 seed / GLM / DeepSeek 的 API Key | 现在返回固定文案「已收到你的需求，正在生成方案。」 |
| **A7** | 语音转写 `POST /speech-input/transcribe` | ✅ 路由参数校验 | **ASR 服务**：火山录音文件识别 / 讯飞 / 阿里 的 key | 返回 `{text: ""}` 空字符串 |
| **A8** | 语音合成 `POST /digital-human/tts/jobs` | ✅ 报价→提交→扣费链路通 | 同 A6/A7 的语音通道（豆包 TTS） | 任务提交后无上游可调，永久 pending → 熔断失败 |
| **A9** | 云沙箱 `POST /agent/cloud-runtime`、`/desktop-session` | ✅ 路由参数校验 | **云桌面/K8s 沙箱** 的 API（这套最重，可后置） | 返回假 pod id，用户点开是死链 |

### A 类补充说明

- **A1 最高优先级**：`dev_code` 现在是**每个请求都返回**。这个字段必须改成「仅 dev profile 返回」，或接了真短信后直接去掉。
- **A2/A3 一起给**：`pay_url` 和验签是同一套商户号，缺一个另一个也没用。
- **A6/A7/A8 是同一个 provider 家族**（豆包/火山），给火山引擎的 `ARK_API_KEY`（火山方舟）能同时解掉文本 + TTS；语音识别需要另外的 `APPID + AccessToken`。
- **A9 是唯一「可以永远不做」的** —— 原站这个功能本身就是演示性质。

---

## 2. B 类：内部仍是假数据（7 项，不需要凭据，我来写）

| # | 位置 | 现状 | 计划 |
|---|---|---|---|
| **B1** | `UserService.profile` | `expires_at` 写死 `"2028-10-28"` | 接 `BillingService.balance()` 的真实到期时间 |
| **B2** | `DigitalHumanService.createAvatar` | `url` 写死 `https://cdn.local.invalid/avatars/{id}` | 改为真实资产 URL（A4 落地后自然修好） |
| **B3** | `VideoToolService.exportMaterials` | `download_url` 写死 `https://cdn.local.invalid/exports/...zip` | 改为对象存储预签名 URL |
| **B4** | `AgentController.chat` | SSE 一次性推完即 `complete()` | 改真流式：边生成边推 token，长连接保持 |
| **B5** | `TaskController.progress` | SSE 一次性推完 | 改真长连接，订阅任务状态变化推送 |
| **B6** | `RedisTokenBucket` | 注释写着「用 Redisson」，但没实现 | 实现真实分布式令牌桶（Redis `INCR`+TTL 或 Lua） |
| **B7** | `ChannelRouter` 熔断 | 本地 `ConcurrentHashMap` 计数器 | 换 Resilience4j CircuitBreaker，或把熔断状态落 `model_channels.circuit_state` |

**注：B7 的熔断状态已经落库了**（`model_channels.circuit_state` 字段存在），只是运行时判定还是走内存。改成读库即可，不必引 Resilience4j。

### 2.1 本轮已顺手修掉的：A1 验证码外泄

原 `AuthService.sendSmsCode` **无条件**把 `dev_code` 塞进响应，等于把验证码直接发给调用方。

已改为双模式（`xin.sms.mode`）：

| mode | 行为 | 响应含 dev_code |
|---|---|---|
| `mock`（默认，本地开发） | 本地生成验证码，不发短信 | ✅ 是 |
| `real`（生产） | 调阿里云短信 HTTP API | ❌ **否** |

新增 `SmsProperties`（配置项）+ `SmsSender`（阿里云 HMAC-SHA1 签名实现）。
**real 模式下凭据不全会直接抛错**，不会出现「以为接了短信其实还在吐验证码」的静默失败。

切换方式：设环境变量 `XIN_SMS_MODE=real` + `XIN_SMS_ACCESS_KEY_ID/SECRET/SIGN_NAME/TEMPLATE_CODE`。

---

## 3. C 类：前端还在用 mock 的 11 个页面

前端 13 个控制器共 156 端点已通，但**只有 5 个页面真正接了真接口**：

| # | 页面 | mock 内容 | 对应后端端点（已存在，等前端接） |
|---|---|---|---|
| C1 | `toolbox/depth-video-clone` | `setTimeout` 假装提交 | `POST /tools/depth-clone/jobs` |
| C2 | `toolbox/ecommerce-image-set` | `setTimeout` + `EXAMPLES` 假图 | `POST /tools/ecommerce-set/jobs` + `/ecommerce-set/items/{id}/regenerate` |
| C3 | `toolbox/digital-human` | `setTimeout` 假装提交 | `POST /digital-human/jobs`、`/tts/jobs`、`/avatars`、`/voices` |
| C4 | `components/features/BenchVideoTools` | `setTimeout` 假装提交 | `POST /tools/video-remix/jobs`、`/video-quality-enhance/jobs`、`/video-subtitle-erase/jobs`、`/video-watermark-remove/jobs` |
| C5 | `components/features/HotVideoRemixTool` | `setTimeout` 假装提交 | `POST /tools/video-remix-viral/jobs` |
| C6 | `app/agent-cloud` | 前端本地 mock 流式 | `POST /agent/chat`（SSE） |
| C7 | `app/canvas` | 工具栏按钮 toast「前端 mock」 | `PUT /canvas/{id}/graph`、`/versions`、`/share` |
| C8 | `components/features/AssetPickerModal` | 写死 `MOCK_VIDEOS/MOCK_IMAGES/MOCK_AUDIOS` | `GET /assets?kind=video` 等 |
| C9 | `app/admin/[section]` | **20 个后台分组全部本地 state** | `GET /admin/*`（52 个端点都已存在） |
| C10 | `app/account/panels-a` | 资料保存 `setTimeout` | `PATCH /users/me` |
| C11 | `app/account/panels-b` | 充值下单 toast「充值成功」 | `POST /recharge/orders` |

> **C8 特别提醒**：`AssetPickerModal` 的写死假数据（`v1`/`i1`/`a1` 这类 id）会导致**所有工具页选素材时拿到假 id**，提交到后端必然 `asset_not_found`。这个优先级应该排在 C9 之前。

---

## 4. 「已完全写好、只差前端接线」的接口（无缺口）

这些后端逻辑完整、前端已接或不需要前端：

- **认证 7 个** —— 全部完整（JWT 自实现，refresh 轮换，会话吊销）
- **任务链 12 个** —— 报价指纹/幂等/冻结/状态机/批次 全部完整
- **计费 7 个** —— 余额/流水/套餐/建单/回调骨架 完整
- **资产 9 个** —— 两段式直传流程完整（凭据缺失见 A4）
- **公开接口 7 个** —— 从前端 `domain.ts` 逐字搬运，两端一致
- **发现 4 个** —— 游标分页/发布/点赞 完整
- **画布 10 个** —— 版本冲突 409/快照/回滚/分享 完整
- **数字人 12 个** —— 校验规则完整（未标准化不可提交/必须带音频）
- **石材 19 个** —— 14 场景模板 + 材质指纹 完整
- **视频工具 19 个** —— 统一收敛到 quote→submit，校验规则完整
- **发票分销 5 个** —— 正则校验完整
- **后台 52 个** —— 全部有路由有逻辑，毛利护栏、审计留痕都在

---

## 5. 还有 2 个「模型接入点」缺口（这个也归你）

DB 里现在只有 12 条 `model_endpoints`，但代码里用到的 `model_key` 有 **19 个**。缺的这些在提交任务时会落 `channel.not_configured`：

| model_key | 用途 | 建议上游模型 |
|---|---|---|
| `video.process.enhance` | 画质增强 | 火山 AI MediaKit |
| `video.erase.subtitle` | 字幕擦除 | 腾讯云 MPS |
| `video.erase.watermark` | 水印擦除 | 腾讯云 MPS |
| `image-speak.60s` | 图片口播 60s | Wan2.2-S2V |
| `image-speak.30s` | 图片口播 30s | Wan2.2-S2V |
| `image-speak.60s.light` | 图片口播轻量 | Wan2.2-S2V |
| `lipsync.volc.1min` | 改口型 | 火山视觉改口型 |
| `factory-video.60s` | 厂家介绍视频 | 组合链路（需拆多段） |
| `factory-video.60s.light` | 厂家介绍视频轻量 | 同上 |
| `doubao-tts-2.0` | 语音合成 | 豆包 TTS 2.0 |
| `image.t2i.2k` | — | ⚠️ 已有 3 条（死站/ToAPIs/Live Second），含测试数据 |

**另外**：DB 里的死站测试数据 `DeadRelay` / `Dead First` / `Live Second` 还在。要清掉吗？

---

## 6. 我的建议优先级

```
第 1 优先（安全漏洞）：A1 短信服务商  → 至少先关掉 dev_code 外泄
第 2 优先（用户能掏钱）：A2+A3 支付商户号
第 3 优先（素材闭环）  ：A4+A5 对象存储
第 4 优先（模型覆盖）  ：§5 的 10 个 model_key 接入点
第 5 优先（前端闭环）  ：C8 AssetPickerModal → C1~C7 工具页 → C9 后台
第 6 优先（体验细节）  ：B1~B7
```

---

## 7. 我现在就能干、等你一句话的

不依赖任何外部账号的部分，我可以立刻开工：

1. **C 类全部前端接线**（11 个页面 mock → 真接口）—— 这是让整个平台「能点能跑」的关键
2. **B1/B2/B3** 三个写死 URL/日期
3. **B6 分布式令牌桶**、**B7 熔断落库**
4. **§5 缺 10 个 model_key 的接入点**（我可以先按 ToAPIs 协议预置，等你给新站再改 `upstream_model`）

**但我建议先确认**：C 类 11 个页面一起改是个大工程，你是想让我**全部做完**，还是**先做 C8 + C1~C5**（工具页闭环，最影响用户），后台 C9（52 端点）单独放一轮？
