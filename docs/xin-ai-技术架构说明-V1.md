# xin.ai 技术架构说明 V1

> 版本 v1.0 ｜ 2026-10-29 ｜ **内部文档 · 不对外**
> 配套文档：《xin.ai 开发规格说明书 V1》（业务与功能）、《xin.ai 中转站接入需求 V1》（供应链）

---

## 摘要（一页看完）

| 层 | 选型 | 版本 |
|---|---|---|
| 前端 | **Next.js（App Router）+ React + TypeScript + Tailwind CSS** | Next 15 / React 19 / TS 5.x |
| 前端状态 | **TanStack Query**（服务端状态）+ **Zustand**（客户端状态） | v5 |
| 后端 | **Spring Boot**（Java） | Java 21 / Spring Boot 3.5 |
| 数据库 | **PostgreSQL** | 15+ |
| 缓存 / 队列 | **Redis**（Redisson） | 7+ |
| 对象存储 | 阿里云 OSS / 火山 TOS + CDN | — |
| 模型接入 | **自研 Adapter 层 + 渠道路由层**（`service/model-adapters`） | — |
| 部署 | **Docker + Kubernetes**（生产）/ Docker Compose（本地） | — |
| 监控 | Sentry + Grafana + Loki + OpenTelemetry | — |

**一句话架构**：一套 Next.js 全栈应用 + 一个 Spring Boot 独立 API + 一个 Spring Boot 异步 Worker，共用 PostgreSQL 与 Redis；所有模型调用经统一 Adapter 层，出入参与成本记录全部落库。

> **技术栈边界声明（重要）**：后端与 Worker **全量 Java**（Spring Boot 3.5 / Java 21）。前端保留 TypeScript，因为 `mediabunny` 剪辑台等复刻命脉依赖原站前端 chunk 结构，不可替换。前后端**不共享代码，只共享 OpenAPI 契约**（后端 `springdoc-openapi` 出契约 → 前端 `openapi-typescript` 生成类型 → CI 校验契约漂移）。

---

## 一、技术选型理由

### 1.1 前端

| 选型 | 版本 | 为什么选它 |
|---|---|---|
| **Next.js（App Router）** | 15.x | 原站实测为 Next.js App Router（前端 chunk 中存在 `useSyncExternalStore`、`useTransition`、`createRenderParamsFromClient` 等 RSC 特征）。沿用同款可最大化复用逆向成果：路由结构、Server/Client Component 边界、SEO 与首屏性能策略一致。 |
| **React** | 19.x | Next 15 配套版本 |
| **TypeScript** | 5.x | 类型定义来自后端 OpenAPI 契约自动生成（`openapi-typescript`），**不与后端共享源码，只共享契约** |
| **Tailwind CSS** | 4.x | 原站主题系统基于 CSS 变量（6 套内置主题），Tailwind 变量绑定天然适配 |
| **TanStack Query** | v5 | 服务端状态缓存、失效、乐观更新；原站大量列表页依赖此类行为 |
| **Zustand** | v5 | 轻量客户端状态：编辑���撤销栈、画布状态、播放器状态 |
| **ky** | latest | HTTP 客户端，自动重试、超时、错误归一化 |
| **mediabunny** | — | 视频剪辑台的客户端合成引擎（原站前端 297 处引用，**必须沿用，否则剪辑台行为无法 1:1 复刻**） |
| **video.js** | 8.x | 视频帧提取 + 字幕擦除区域框选 |
| **reactflow** | v12 | 画布编辑器节点连线（自研或用此库，待验证） |
| **tldraw** | — | 候选方案：画布的图层/版本/选择框交互 |

### 1.2 后端

> **决策记录**：初版方案为 NestJS（TypeScript），因「全栈统一语言」而选型。现调整为 **Spring Boot 3.5 / Java 21**。原因：①本项目 95% 是 CRUD + 编排 + 适配层，与 Spring 生态完全对应；②维护方为单一 Java 工程师，后端用其主力语言可独立读懂、独立排障，零交接成本；③JVM 在长连接池、批量报表与内存缓存上性能上限更高，直接利好计费与毛利聚合查询。代价是失去前后端共享 Zod Schema 的便利，改用 **OpenAPI 契约作为唯一真相源**并在 CI 卡死漂移。

| 选型 | 版本 | 为什么选它 |
|---|---|---|
| **Spring Boot** | 3.5.x | 模块化 DI 天然适合「Adapter 按能力域注册」；`@PreAuthorize` 直接映射 RBAC 六角色；`@Aspect` 直接映射审计需求；`springdoc-openapi` 自动出契约 |
| **Java** | 21 LTS | 长期支持；虚拟线程（Loom）对 SSE 长连接与并发模型调用显著友好，替代 Node 的单线程事件循环 |
| **MyBatis-Plus** | 3.5.x | 类型安全 CRUD + 原生 SQL 自由度高，与「复杂报表用原生 SQL」的毛利日报需求一致；DDL 迁移用 Flyway 手写可控 |
| **Redisson** | 3.x | Redis 客户端；提供分布式锁、限流器（令牌桶）、延迟队列，**替代 BullMQ** |
| **Spring Security** | 6.x | 认证授权体系成熟：双 Token、登录态版本号强制下线、`@PreAuthorize` 方法级鉴权 |
| **Resilience4j** | 2.x | 熔断（CircuitBreaker）、重试、限流、舱壁隔离 —— 直接对应 ChannelRouter 的熔断降级设计 |
| **OkHttp** | 4.x | Adapter 调上游模型；超时、重试、连接池、拦截器（埋点/加签）可控 |
| **Flyway** | 10.x | 数据库版本化迁移 |

> **队列方案变更（重点）**：BullMQ 的延迟、优先级、并发控制语义**不是 1:1 可映射**。改用 **Redisson `RDelayedQueue` + `RTopic`/Stream** 承担主链路，配合 **Quartz** 处理定时与周期任务（余额巡检、健康检查、对账）。优先级、幂等键、死信语义已在 §2.2《队列语义对照表》逐条对齐。

#### 1.2.1 原 NestJS 方案 → Java 概念映射表

> 初版文档按 NestJS 描述过一遍后端，本表用于快速对齐概念，避免"看到 TS 概念找不到 Java 对应物"。

| NestJS 概念 | Java 对应 | 说明 |
|---|---|---|
| Module + DI | `@Configuration` + `@Bean`；或直接用 `@Component` 扫描 | 能力域划分 = Spring 包划分 |
| NestJS Provider 注册表 | Spring 注入 `List<ModelAdapter>` | Adapter 按能力域注册，Spring 自动收集所有实现 |
| Guard（RBAC） | Spring Security `@PreAuthorize("hasRole('ADMIN')")` | 六角色直接映射 |
| Interceptor（审计） | Spring AOP `@Aspect` | 统一审计埋点 |
| Pipe（DTO 校验） | Jakarta Validation `@NotBlank` 等 + `@Valid` | |
| ExceptionFilter | `@RestControllerAdvice` + 全局异常处理 | 统一错误响应格式 |
| DTO / Entity | Java `record`（请求）/ POJO + MyBatis-Plus `@TableName`（实体） | |
| Repository | Mapper 接口 + XML | |
| Prisma Migration | Flyway 脚本（`V1__init.sql`） | |
| BullMQ Queue | Redisson `RDelayedQueue` / `RQueue` | 延迟、重试；优先级需自定义 |
| BullMQ Worker | Spring `@Component` 消费者 + `@Scheduled` 或 `RQueue` 监听 | |
| BullMQ RateLimiter | Redisson `RRateLimiter` | 令牌桶 |
| ioredis pub/sub | Redisson `RTopic` | 跨进程广播（余额变更、通道状态） |
| 手写熔断器 | Resilience4j `CircuitBreaker` | 成熟度更高 |
| ky / fetch | OkHttp / Spring `WebClient` | |
| ConfigService | `@ConfigurationProperties` | 类型安全配置 |
| Schedule（cron） | Quartz 或 Spring `@Scheduled` | |
| 共享 Zod Schema | `packages/contracts/openapi.json` 契约 | **不再共享源码** |

---

### 1.3 数据与基础设施

| 选型 | 用途 | 说明 |
|---|---|---|
| **PostgreSQL 15** | 主库 | 需要 jsonb（`model_endpoints.config_json`）、物化视图（毛利日报）、分区表（`usage_record` 按月分区）、全文检索（素材检索） |
| **Redis 7** | 缓存 + 队列 | 限流令牌桶、任务队列、报价缓存、热点数据 |
| **OSS / TOS** | 对象存储 | 用户素材、生成产物、原片；**前端直传**（两段式 upload-policy → complete），不经后端中转大文件 |
| **CDN** | 静态与产物分发 | 缩略图、EXIF 清理后的产物 |
| **Valkey** | Redis 兼容替代 | 云上可选，降低托管成本 |

### 1.4 模型接入层（自研，本项目核心）

| 组件 | 职责 |
|---|---|
| `ModelAdapter`（Java 接口） | 单个上游模型的请求转换、响应解析、错误归一化；Spring 注入 `List<ModelAdapter>` 自动注册 |
| `ChannelRouter` | 按 `model_key` 选接入点；Resilience4j 熔断判定；Redisson 限流；成本采集 |
| `ModelEndpointRegistry` | 从 DB 加载 `model_endpoints` 到内存缓存，支持主动失效（Redis `RTopic` 广播） |
| `CapabilityRegistry` | 13 个能力域的路由表、折扣、售价积分 |

**关键约束**：代码中**不得出现任何具体上游 URL**，全部来自 `model_endpoints.base_url`。

**Java 实现要点**：

```java
// Adapter 注册：Spring 启动时收集所有实现，按 capability 归组
public interface ModelAdapter {
    String capability();                                  // 如 "image" / "video"
    ModelResponse submit(ModelRequest request);           // 同步模型
    default ModelResponse poll(String taskId) { throw new UnsupportedOperationException(); }
}

// 单个适配器：配置从 Endpoint 注入，构造器不含硬编码 URL
@Component
class RelayAdapter implements ModelAdapter {
    private final OkHttpClient client;

    @Override
    public String capability() { return "image"; }

    @Override
    public ModelResponse submit(ModelRequest req) {
        // base_url / apiKey / upstreamModel 均来自 ModelRequest 携带的 Endpoint 快照
        return client.newCall(buildRequest(req)).execute();
    }
}
```

**熔断与降级**：`ChannelRouter` 用 Resilience4j `CircuitBreaker` 包住 `adapter.submit()`；失败后按 `sort_order` 取下一个 Endpoint，**幂等键不变**；全部失败则全额退回冻结积分。

---

## 二、总体架构

```
┌─────────────────────────────────────────────────────────────────┐
│  浏览器                                                          │
│  Next.js (App Router) — SSR 首屏 + 客户端交互                     │
│  · 首页/工具箱/画布/Agent/工作台/账户中心/管理后台                │
└──────────────┬──────────────────────────────┬───────────────────┘
               │ REST /api/v1 (HTTPS)         │ SSE 进度流
               ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Spring Boot API  (service/api)                                 │
│  Controller → Service → Mapper (MyBatis-Plus)                   │
│  · 认证/RBAC · 积分计费 · 报价 · 订单 · 后台管理                 │
│  · ChannelRouter（熔断/限流/降级）· 成本采集                     │
└───────┬───────────────────────────────┬─────────────────────────┘
        │ 入队                             │ 读模型/写库
        ▼                                 ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│  Spring Boot Worker      │   │  PostgreSQL 15                   │
│  (service/worker)        │   │  Redis 7                         │
│  · 调用 Adapter           │   │  OSS / TOS                       │
│  · 轮询/回调解析          │   │  密钥管理服务（密钥本体）          │
│  · 重试/降级/结算         │   └──────────────────────────────────┘
└───────────┬──────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  service/model-adapters（Java 独立模块）                        │
│  ├ RelayAdapter（OpenAI 兼容，中转站）                          │
│  ├ VolcengineAdapter（火山方舟）                                │
│  ├ BailianAdapter（阿里百炼）                                    │
│  ├ TencentMpsAdapter（腾讯云 MPS）                               │
│  └ KieAdapter / FalAdapter                                     │
│  ↑ 全部从 model_endpoints 读取 base_url 与密钥                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 请求时序（生成任务）

```
用户提交
  → POST /api/v1/tasks/quote      返回预计积分与明细（用户确认）
  → POST /api/v1/tasks/submit
       ├ Service: 冻结积分（创建冻结流水）
       ├ Service: ChannelRouter 按 model_key 取 Endpoint
       ├ Worker: 调 Adapter → 上游
       │    ├ 成功 → 落库 → 转存 OSS → 结算积分 → SSE 推进度
       │    ├ 失败 → 换下一优先级 Endpoint（幂等键不变）
       │    └ 全失败 → 全额退回冻结积分
       └ 记录 usage_record（通道、真实成本、扣费积分、毛利）
```

### 2.2 队列语义对照表（BullMQ → Redisson / Quartz）★ 实现前必读

> BullMQ 与 Redisson/Quartz 的语义**不是 1:1**。本表逐条对齐，缺一条都可能导致线上丢任务、重复扣费或任务堆积。

| 语义项 | 原 BullMQ 方案 | Java 侧实现 | 风险与对策 |
|---|---|---|---|
| 基础队列 | `Queue`（FIFO） | Redisson `RQueue` | 无风险 |
| 延迟任务 | `Job.setDelay()` | Redisson `RDelayedQueue` | 底层是 Redis ZSet，**进程重启不丢**；但消费端需运行才能把到期元素搬到目标队列，且单条不精确。对策：延迟任务同时在 DB 落 `tasks` 记录，watchdog 兜底扫描 |
| 优先级 | `job.setPriority()` | **无原生等价** | 需自建：每个能力域拆 `high` / `normal` 两个队列，Worker 消费时先探 high 队列；或用 `RPriorityQueue`（Redisson 3.x 提供，但基于有序集合，元素需可比较） |
| 并发控制 | `concurrency` / `limiter.max` | Worker 侧 `Semaphore` + Redisson 分布式锁 | 需保证多副本下总并发不超限，**不能只用本地信号量**；对策：用 Redisson `RSemaphore` 分布式限并发 |
| 失败重试 | `attempts` + `backoff` | Resilience4j `Retry` + 死信表 | 重试次数与退避需与 `model_endpoints.max_retries` 对齐；**跨通道重试不消耗 attempts 配额**（通道级重试 vs 接入点级重试要分开算） |
| 死信队列 | `failed` 集合 | DB 表 `tasks` 状态 `FAILED` + 人工重投接口 | BullMQ 的 failed set 是 Redis 里的集合，Java 侧落 DB 更利于审计与对账 |
| 幂等键 | `jobId` 去重 | DB `task_idempotency` 表 + 唯一索引 | **必须落 DB**，Redis 去重在主从切换时可能失效 |
| 任务可见性 | 队列锁 | DB 状态机 `PENDING → RUNNING → DONE/FAILED` + 超时扫描 | Worker 崩溃后任务卡在 RUNNING，需 watchdog 定时扫描超时任务重投 |
| 队列积压监控 | BullMQ 队列长度 | Redisson `RQueue.size()` + Prometheus 指标 | 需暴露 `xin_task_queue_size{capability}` 指标 |
| 跨进程广播 | BullMQ EventEmitter | Redisson `RTopic` | 用于通道配置变更广播、余额变更通知 |
| 定时/周期任务 | BullMQ repeatable | Quartz | 余额巡检、健康检查、日终对账 |

**结论**：主链路用 **Redisson `RQueue` + `RDelayedQueue`**，兜底用 **DB 任务表 + watchdog 扫描**，定时用 **Quartz**。凡是"队列消息是唯一真相源"的地方，一律改成"**DB 是唯一真相源，队列只是通知**"——这条原则能同时解决丢任务、重复扣费、进程重启三个问题。

### 2.3 为什么 API 与 Worker 分开
| 原因 | 说明 |
|---|---|
| 长任务不能阻塞 HTTP | 视频生成 30 秒~5 分钟，必须异步 |
| 资源隔离 | Worker 吃满 CPU（FFmpeg 合成、缩略图）不影响 API 响应 |
| 独立扩缩容 | 任务高峰扩 Worker，流量平稳缩 API |
| 崩溃隔离 | Worker OOM 不影响 API 与用户页面 |

部署上：**同一 Maven 多模块工程，不同启动入口**（`service/api` 的 `ApiApplication` 与 `service/worker` 的 `WorkerApplication`，共用 `service/model-adapters`、`service/common`、`service/domain`）。

> **Java 侧额外收益**：Spring Boot 天然支持同一份多模块工程打成一个 fat jar 后用不同 profile / main class 启动，无需像 Node 那样维护多份 `main.ts` 入口。

---

## 三、目录结构

```
xin-ai/
├─ apps/
│  └─ web/                    Next.js 前端（TypeScript，不与后端共享源码）
│     ├─ app/
│     │  ├─ (marketing)/      官网、落地页（SEO）
│     │  ├─ (studio)/         工作台（需登录）
│     │  │  ├─ tools/          9 个工具页
│     │  │  ├─ canvas/         画布编辑器
│     │  │  ├─ agent/          Agent 对话
│     │  │  ├─ assets/         素材库
│     │  │  └─ admin/         管理后台 20 页签
│     │  ├─ (auth)/           登录、注册
│     │  └─ api/              BFF / 代理层（可选）
│     ├─ components/
│     │  ├─ ui/               基础组件（shadcn 风格自建）
│     │  ├─ canvas/           画布节点与边
│     │  ├─ player/           视频播放器、帧选择器
│     │  └─ forms/            表单
│     ├─ hooks/
│     ├─ lib/                 请求封装、鉴权、埋点
│     ├─ styles/              CSS 变量主题
│     └─ generated/           ★ openapi-typescript 生成的 API 类型（禁止手改）
├─ service/                   ★ Java 后端（Maven 多模块）
│  ├─ pom.xml                 父 POM，统一依赖与插件版本
│  ├─ common/                 公共模块
│  │  ├─ config/              配置类、Redis/OkHttp/线程池 Bean
│  │  ├─ security/            Spring Security 配置、JWT 过滤器
│  │  ├─ exception/           全局异常处理、错误码枚举
│  │  ├─ aspect/              审计日志 AOP、幂等 AOP
│  │  ├─ dto/                 统一响应包装、分页、请求上下文
│  │  └─ util/                工具类
│  ├─ domain/                 领域模块
│  │  ├─ entity/              数据库实体（MyBatis-Plus @TableName）
│  │  ├─ mapper/              MyBatis-Plus Mapper 接口
│  │  ├─ service/             业务服务（事务边界在此）
│  │  └─ enums/               状态枚举（任务状态、通道状态、能力域）
│  ├─ model-adapters/         ★ 适配器与渠道路由
│  │  ├─ base/                ModelAdapter 接口、错误归一化、请求上下文
│  │  ├─ registry/            ModelEndpointRegistry、CapabilityRegistry
│  │  ├─ router/              ChannelRouter、熔断器（Resilience4j）、限流器
│  │  ├─ adapters/            relay/ volcengine/ bailian/ tencent/ kie/ fal
│  │  └─ cost/                成本采集、成本系数
│  ├─ api/                    Spring Boot API 服务
│  │  ├─ src/main/java/com/xin/ai/api/
│  │  │  ├─ ApiApplication.java   启动入口
│  │  │  ├─ common/           守卫/拦截器/过滤器/DTO 基类
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/          登录、双 Token、登录态版本号
│  │  │  │  ├─ users/         用户、RBAC 六角色
│  │  │  │  ├─ assets/        素材库、直传、派生件
│  │  │  │  ├─ tasks/         任务编排、队列
│  │  │  │  ├─ pricing/       报价引擎、积分定价
│  │  │  │  ├─ billing/       充值、支付、发票、对账
│  │  │  │  ├─ models/        ★ 能力域路由、接入点配置、渠道管理
│  │  │  │  ├─ canvas/        画布数据、版本冲突
│  │  │  │  ├─ agent/         会话、技能挂载
│  │  │  │  ├─ distribution/  联盟分销
│  │  │  │  └─ admin/         运营公告、审计等后台能力
│  │  │  └─ jobs/             队列消费者（Redisson DelayedQueue）
│  │  └─ src/main/resources/
│  │     ├─ application.yml
│  │     └─ db/migration/      ★ Flyway 迁移脚本
│  └─ worker/                 Spring Boot Worker 服务（独立入口）
│     └─ src/main/java/com/xin/ai/worker/
│        ├─ WorkerApplication.java  启动入口
│        ├─ processors/        图片/视频/数字人/剪辑/擦除 处理器
│        └─ scheduler/         Quartz：余额巡检、健康检查、日终对账
├─ packages/
│  └─ contracts/               ★ OpenAPI 契约（唯一真相源）
│     ├─ openapi.json          后端 springdoc 导出，CI 校验漂移
│     └─ ts/                   openapi-typescript 生成的类型（供 apps/web 引用）
├─ infra/
│  ├─ docker/                  Dockerfile（api / worker / web 三个镜像）
│  ├─ k8s/                     部署清单
│  ├─ nginx/                   反向代理、SSE 配置、限流
│  └─ scripts/                 迁移、种子数据、备份
└─ docs/
```

---

## 四、数据库设计（核心表）

### 4.1 模型接入配置（本次重点）

```sql
-- 通道：一家供应商（中转站 / 官方）
CREATE TABLE model_channels (
  id              UUID PRIMARY KEY,
  name            VARCHAR(64)  NOT NULL,      -- 'relay-a' / 'official-volc'
  provider        VARCHAR(16)  NOT NULL,      -- 'relay' | 'official'
  base_url        VARCHAR(256) NOT NULL,      -- 接入点，后台可改
  secret_ref      VARCHAR(128),               -- 密钥引用，不存明文
  priority        INT          NOT NULL DEFAULT 100,  -- 越小越优先
  status          VARCHAR(16)  NOT NULL DEFAULT 'active', -- active/paused/degraded
  rpm_limit       INT,
  qps_limit       INT,
  cost_ratio      DECIMAL(5,4) NOT NULL DEFAULT 1.0000, -- 1.0=刊例价, 0.85=中转85折
  health_check    JSONB        DEFAULT '{}',
  circuit_state   VARCHAR(16)  NOT NULL DEFAULT 'closed',
  circuit_opened_at TIMESTAMPTZ,
  failure_count   INT          NOT NULL DEFAULT 0,
  success_count   INT          NOT NULL DEFAULT 0,
  balance         DECIMAL(12,2),              -- 中转站余额（可查时同步）
  balance_checked_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_by      VARCHAR(64)
);

-- 接入点：模型 → 通道的具体映射 ★ 核心表
CREATE TABLE model_endpoints (
  id              UUID PRIMARY KEY,
  model_key       VARCHAR(64)  NOT NULL,      -- 'image.text2image.2k'
  capability      VARCHAR(32)  NOT NULL,      -- 'image' / 'video' / ...
  display_name    VARCHAR(128) NOT NULL,      -- 前台展示名
  channel_id      UUID         NOT NULL REFERENCES model_channels(id),
  base_url        VARCHAR(256),               -- 可覆盖通道默认值（针对该模型单独指定）
  upstream_model  VARCHAR(128) NOT NULL,      -- 上游真实模型名
  secret_ref      VARCHAR(128),               -- 可覆盖通道默认密钥
  timeout_ms      INT          NOT NULL DEFAULT 30000,
  max_retries     INT          NOT NULL DEFAULT 2,
  rpm_limit       INT,
  enabled         BOOLEAN      NOT NULL DEFAULT true,
  is_default      BOOLEAN      NOT NULL DEFAULT false,
  cost_ratio      DECIMAL(5,4),               -- 可覆盖通道默认值
  sort_order      INT          NOT NULL DEFAULT 10,  -- 同能力域内降级顺序
  config_json     JSONB        DEFAULT '{}',  -- 能力域特有参数映射
  last_probe_at   TIMESTAMPTZ,
  last_probe_ok   BOOLEAN,
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_by      VARCHAR(64),
  UNIQUE (model_key, sort_order)
);

CREATE INDEX idx_endpoints_capability ON model_endpoints(capability, enabled, sort_order);
CREATE INDEX idx_endpoints_model_key   ON model_endpoints(model_key) WHERE enabled = true;
```

### 4.2 售价积分（后台可配）

```sql
CREATE TABLE ability_pricing (
  id              UUID PRIMARY KEY,
  capability      VARCHAR(32)  NOT NULL,
  model_key       VARCHAR(64)  NOT NULL,
  spec            VARCHAR(32)  NOT NULL,      -- '2K' / '720P' / '5秒'
  points          INT          NOT NULL,      -- 售价积分
  cost_override   DECIMAL(10,4),              -- 成本覆盖（可选）
  discount_rate   DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  effective_from  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  version         INT          NOT NULL DEFAULT 1,
  updated_by      VARCHAR(64),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (model_key, spec)
);

-- 改价审计
CREATE TABLE pricing_change_log (
  id            UUID PRIMARY KEY,
  ability_pricing_id UUID REFERENCES ability_pricing(id),
  model_key     VARCHAR(64) NOT NULL,
  spec          VARCHAR(32) NOT NULL,
  points_before INT,
  points_after  INT,
  margin_before DECIMAL(6,4),
  margin_after  DECIMAL(6,4),
  reason        TEXT,
  operator      VARCHAR(64) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.3 成本与毛利

```sql
CREATE TABLE usage_record (
  id              UUID PRIMARY KEY,
  user_id         UUID,
  task_id         UUID,
  model_key       VARCHAR(64)  NOT NULL,
  channel_id      UUID         REFERENCES model_channels(id),
  provider        VARCHAR(16)  NOT NULL,      -- 'relay' | 'official' | 'user_key'
  upstream_model  VARCHAR(128),
  official_cost   DECIMAL(12,4) NOT NULL,      -- 按刊例价计算
  upstream_cost   DECIMAL(12,4) NOT NULL,      -- 真实拿货成本
  saved_cost      DECIMAL(12,4) NOT NULL,      -- official - upstream ← 中转站贡献
  points_charged INT          NOT NULL,
  revenue         DECIMAL(12,2) NOT NULL,      -- points × 1.00
  gross_margin    DECIMAL(6,4) NOT NULL,
  duration_ms     INT,
  succeeded       BOOLEAN      NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);            -- 按月分区

CREATE INDEX idx_usage_model_channel ON usage_record(model_key, channel_id, created_at);
CREATE INDEX idx_usage_created        ON usage_record(created_at DESC);
```

### 4.4 其余核心表（清单）

| 域 | 表 |
|---|---|
| 账号 | `users` / `user_sessions` / `roles` / `permissions` / `login_versions` |
| 素材 | `assets` / `asset_groups` / `asset_derivatives` / `asset_favorites` |
| 任务 | `tasks` / `task_batches` / `task_progress` / `task_idempotency` |
| 计费 | `point_accounts` / `point_ledger`（冻结/结算/退回） / `point_batches` / `recharge_packages` / `recharge_orders` / `usage_record` |
| 画布 | `canvases` / `canvas_nodes` / `canvas_edges` / `canvas_versions` / `canvas_templates` |
| Agent | `agent_sessions` / `agent_messages` / `agent_skills` / `agent_cloud_pods` |
| 数字人 | `avatars` / `voices` / `voice_slots` / `authorizations` |
| 商业化 | `distribution_partners` / `referral_codes` / `commissions` / `settlements` / `invoices` / `announcements` |
| 后台 | `audit_logs` / `skill_packages` / `public_materials` / `invite_codes` / `task_reports` |
| 接入 | `model_channels` / `model_endpoints` / `model_channel_health` / `ability_pricing` / `pricing_change_log` / `channel_bills` |

---

## 五、接口规范

### 5.1 通用约定

| 项 | 约定 |
|---|---|
| 前缀 | `/api/v1` |
| 命名 | 资源用小写复数名词；动作用子资源 `/quote` `/complete` `/submit` |
| 鉴权 | `Authorization: Bearer <access_token>`；access 15 分钟、refresh 30 天 |
| 强制下线 | 服务端维护 `login_version`，不匹配即踢下线 |
| 成功响应 | `{ "data": ..., "request_id": "..." }` |
| 列表响应 | `{ "data": [...], "pagination": { page, page_size, total } }` |
| 错误 | `{ "error": { "code": "...", "message": "...", "details": {...} } }` |
| 幂等 | 写操作支持 `Idempotency-Key` 头 |

### 5.2 核心端点

**认证**
```
POST /api/v1/auth/sms/send          发送验证码
POST /api/v1/auth/sms/verify        验证码登录/注册
POST /api/v1/auth/refresh           刷新 Token
POST /api/v1/auth/logout            登出
```

**模型接入与配置**（本次新增）
```
GET    /api/v1/model-routes/public    能力域路由表（前台用，含售价积分）
GET    /api/v1/admin/channels         通道列表
POST   /api/v1/admin/channels         新建通道
PATCH  /api/v1/admin/channels/:id     修改通道（含 base_url、优先级、成本系数）
POST   /api/v1/admin/channels/:id/test 测试连通性
GET    /api/v1/admin/endpoints        接入点列表（按能力域分组）
POST   /api/v1/admin/endpoints        新建接入点
PATCH  /api/v1/admin/endpoints/:id    修改接入点（base_url、上游模型名、启用、排序）
POST   /api/v1/admin/endpoints/:id/probe  连通性 + 版本探测
POST   /api/v1/admin/endpoints/bulk   批量切通道
```

**定价**
```
GET    /api/v1/admin/pricing          售价积分列表（含实时毛利率）
PATCH  /api/v1/admin/pricing/:id      改价（带毛利护栏校验）
GET    /api/v1/admin/pricing/changelog 改价审计日志
POST   /api/v1/admin/pricing/rollback  回滚到历史版本
```

**任务与报价**
```
POST /api/v1/tasks/quote              报价（返回预计积分与明细）
POST /api/v1/tasks/submit             提交任务
GET  /api/v1/tasks/:id                任务详情与状态
GET  /api/v1/tasks/:id/progress       SSE 进度流
POST /api/v1/tasks/batches            批量提交
```

**计费**
```
GET  /api/v1/points/balance           积分余额
GET  /api/v1/points/ledger            流水
POST /api/v1/recharge/orders          创建充值订单
```

**素材直传**
```
POST /api/v1/assets/upload-policy     获取直传凭证
POST /api/v1/assets/complete          确认完成
```

### 5.3 前后端契约生成链路（★ Java 拆分后新增）

> 后端换成 Java 后，前后端**不再共享 Zod Schema 源码**，改为以 OpenAPI 契约为唯一真相源。这条链路必须在 CI 里卡死，否则类型会悄悄跑偏。

```
后端 Spring Boot（springdoc-openapi）
        │  mvn spring-boot:run / 启动时导出
        ▼
packages/contracts/openapi.json          ← 契约快照，提交进 Git
        │  npx openapi-typescript packages/contracts/openapi.json -o apps/web/generated/api.ts
        ▼
前端 apps/web/generated/api.ts          ← 类型定义，禁止手改
```

**CI 校验规则**（任一不满足即构建失败）：

| # | 规则 | 实现 |
|---|---|---|
| 1 | 后端契约与快照一致 | 启动 API 导出 openapi.json，与 `packages/contracts/openapi.json` 做 diff；有差异则失败并提示「请重新生成并提交契约」 |
| 2 | 前端类型已重新生成 | CI 先跑 `gen:api`，若 `git diff --exit-code apps/web/generated/api.ts` 非零则失败 |
| 3 | 契约文件本身必须提交 | `packages/contracts/openapi.json` 变更需与后端代码在同一个 PR 内提交 |

**接口变更流程**：改后端 DTO → 本地跑 `gen:api` → 提交契约与生成物 → 前端只需 `pnpm install` 即可拿到新类型。**任何一方单独改契约快照而不同步代码，CI 立刻拦下。**

---

## 六、主题系统

原站主题基于 CSS 变量，Tailwind 直接绑定变量：

```css
:root {
  --background: 0 0% 100%;
  --foreground: 200 30% 12%;
  --accent: 193 78% 26%;
  --primary: 193 78% 26%;
  --muted: 195 16% 94%;
  --border: 195 20% 88%;
}
[data-theme="midnight"] { /* 6 套内置主题之一 */ }
```

- Tailwind 配置：`colors: { background: 'hsl(var(--background))', ... }`
- 主题切换：`<html data-theme="...">`，CSS 变量即时生效，无需重渲染
- 后台自定义：运营改主色 → 生成变量覆盖样式注入

---

## 七、本地开发环境

```bash
# 后端依赖（Java 21 + Maven 3.9）
java -version      # 21 LTS
mvn -v
mvn -pl service/api -am spring-boot:run -Dspring-boot.run.profiles=local  # :3001
mvn -pl service/worker -am spring-boot:run -Dspring-boot.run.profiles=local  # 队列消费者
mvn -f service/pom.xml flyway:clean flyway:migrate   # 数据库迁移

# 前端依赖（仅前端需要 Node）
node -v            # 20 LTS
pnpm install
pnpm --filter web dev            # :3000
pnpm --filter web gen:api        # 从 packages/contracts/openapi.json 生成 TS 类型
```

**本地依赖**：`docker compose up -d postgres redis minio`

**最小可行本地环境**：4C8G 即可跑起来（后端 JVM + Next.js 需各留 1G 内存；不接真实模型，用 mock adapter）。

---

## 八、部署

### 8.1 环境

| 环境 | 用途 | 配置 |
|---|---|---|
| `dev` | 集成测试 | 单台 4C8G，CI 自动部署 |
| `staging` | 压测与发布前验证 | 与生产同构 |
| `prod` | 生产 | 多可用区 + 负载均衡 + 自动伸缩 |

### 8.2 镜像

| 镜像 | 基础 | 说明 |
|---|---|---|
| `web` | `node:20-alpine` + Next standalone | 静态产物 + SSR runtime |
| `api` | `eclipse-temurin:21-jre-alpine` | Spring Boot fat jar |
| `worker` | 同 api 镜像，不同启动类 | 复用构建产物（`WorkerApplication`） |

**FFmpeg** 需求：剪辑台合成、字幕擦除、画质增强需 FFmpeg（`jammy` 全量包，约 200MB 镜像增量）。

**JVM 参数**：开启容器感知 `-XX:MaxRAMPercentage=75`；SSE 长连接场景启用虚拟线程（`spring.threads.virtual.enabled=true`，Java 21 特性），显著提升并发 SSE 连接的承载能力。

### 8.3 生产资源估算（起步）

| 资源 | 规格 | 数量 | 月成本估算 |
|---|---|---|---|
| 应用服务器 | 4C8G | 2 | ¥600 |
| Worker | 8C16G | 2（按任务量扩缩） | ¥1,000 |
| PostgreSQL | 2C4G 高可用 | 1 | ¥500 |
| Redis | 2G 标准 | 1 | ¥150 |
| OSS + CDN | — | — | ¥600 |
| 负载均衡 + 监控 | — | — | ¥300 |

**起步月成本约 ¥3,150**（不含模型调用费）。

### 8.4 CI/CD

```
push → 后端: mvn verify（编译 + 单测 + ArchUnit 架构测试 + Spotless）
     → 前端: lint + typecheck + unit test
     → 契约校验: springdoc 导出 openapi.json → 与 packages/contracts 快照 diff，有漂移则失败
     → build 3 images → staging deploy → smoke test
     → manual approve → prod deploy (canary 10% → 100%)
```

---

## 九、可观测性

| 维度 | 工具 | 关键指标 |
|---|---|---|
| 错误 | Sentry | 前端异常率、API 5xx 率、Worker 崩溃 |
| 指标 | Grafana + Prometheus | QPS、P95 延迟、任务成功率、队列积压 |
| 日志 | Loki | 结构化 JSON，全链路 `trace_id` |
| 链路 | OpenTelemetry | 一次生成贯穿：报价→冻结→提交→上游→落库→结算 |
| 业务 | 自建毛利日报 | 按能力域/通道/模型三级，见《中转站接入需求》§5.1 |

**关键告警**：

| 级别 | 条件 | 动作 |
|---|---|---|
| P0 | 任务成功率 < 90% 持续 5 分钟 | 值班告警 |
| P0 | 中转站余额 < 7 天用量 | 自动暂停低优先级能力域 |
| P1 | 某能力域毛利率低于目标 15 个百分点（连续 3 日） | 自动下调售价积分或暂停折扣 |
| P1 | 日终对账差异率 > 0.5% | 告警 + 人工核查 |
| P2 | P95 延迟 > 2s | 扩容评估 |

---

## 十、Java 后端工程约定

> 本节是后端代码的硬性约定，用 ArchUnit 做架构测试强制执行，违反即构建失败。

### 10.1 分层与依赖方向

```
Controller  →  Service  →  Mapper  →  DB
     ↓            ↓
   DTO       Domain/Entity
                  ↑
           ModelAdapter（model-adapters 模块）
```

| 规则 | 说明 |
|---|---|
| Controller 不写业务分支 | 只做参数校验（`@Valid`）、鉴权（`@PreAuthorize`）、响应封装（`ApiResponse<T>`） |
| Service 持有事务边界 | `@Transactional` 只标在 Service 方法上；**跨通道调用不能包在事务里**（网络调用不应持有 DB 锁） |
| Mapper 不跨表写 | 禁止在 Mapper XML 里做多表 join 写操作；多表写由 Service 用多个 Mapper 在事务内编排 |
| domain 不依赖 api/worker | 领域层不得 import 任何 Web/队列框架类（`HttpServletRequest`、`@RestController` 等） |
| model-adapters 不依赖 domain | 适配器只认 DTO，不认数据库实体 |
| api 与 worker 互不依赖 | 两个独立启动模块，通过 Redis 队列与 DB 通信 |

### 10.2 命名与包约定

| 类型 | 约定 | 示例 |
|---|---|---|
| Controller | `XxxController` | `TaskController`、`AdminChannelController` |
| Service | `XxxService`（接口）+ `XxxServiceImpl` | `PricingService` / `PricingServiceImpl` |
| Mapper | `XxxMapper`（继承 `BaseMapper<T>`） | `ModelEndpointMapper` |
| Entity | `XxxEntity`（`@TableName("xxx")`） | `ModelEndpointEntity` |
| 请求 DTO | `XxxRequest`（`record`） | `SubmitTaskRequest` |
| 响应 DTO | `XxxResponse`（`record`） | `TaskResponse` |
| Adapter | `XxxAdapter implements ModelAdapter` | `RelayAdapter` |
| 配置项 | `XxxProperties`（`@ConfigurationProperties`） | `ChannelProperties` |

**包结构**：`com.xin.ai.<module>.<layer>`，如 `com.xin.ai.api.modules.tasks.controller`。

### 10.3 统一响应与错误码

```java
// 统一响应包装
public record ApiResponse<T>(T data, String requestId) {}

// 全局异常处理
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(BizException.class)
    public ResponseEntity<ApiResponse<ErrorBody>> handle(BizException e) {
        return ResponseEntity.status(e.getHttpStatus())
            .body(new ApiResponse<>(new ErrorBody(e.getCode(), e.getMessage(), e.getDetails()), traceId()));
    }
}
```

错误码规范：`<域>.<原因>`，如 `auth.unauthorized`、`credit.insufficient`、`channel.circuit_open`。**code 为机器可读枚举，message 为中文可展示文案**，与 §5.1 契约保持一致。

### 10.4 工具链与代码质量

| 项 | 工具 | 门禁 |
|---|---|---|
| 构建 | Maven 3.9 + 多模块 | `mvn -f service/pom.xml verify` |
| 格式化 | Spotless（palantir-java-format） | 格式不符即失败 |
| 静态检查 | SpotBugs + Checkstyle | 告警升级为错误 |
| 架构测试 | ArchUnit | 违反分层依赖即失败 |
| 测试 | JUnit 5 + Testcontainers（PostgreSQL/Redis 真实容器） | 覆盖率门槛：领域层 ≥ 70% |
| 契约 | springdoc-openapi | 见 §5.3 |

---

## 十一、安全
| 项 | 做法 |
|---|---|
| 密码 | 加盐哈希（Argon2id，Java 侧用 `spring-security-crypto` 的 `Argon2PasswordEncoder`） |
| Token | access 短期 + refresh 轮换 + `login_version` 强制下线 |
| 越权 | 全量接口鉴权 + RBAC 六角色 + 资源归属校验 |
| 上传 | 类型/尺寸/内容三重校验；图片检测人脸与违规内容 |
| 密钥 | **入库只存 `secret_ref`，密钥本体在密钥管理服务**；代码中无任何 URL |
| 日志 | 脱敏 `api_key` / `authorization` / 手机号 / 身份证 / 银行卡 |
| 支付 | 回调验签 + 幂等 + 金额校验 |
| 越权扣费 | 报价与扣费在同一事务内冻结/结算，防篡改指纹 |

---

## 十二、待定事项

| # | 事项 | 影响 | 建议 |
|---|---|---|---|
| 1 | 画布自研 vs reactflow vs tldraw | C1 14 人天 | 先用 tldraw 验证交互，成本可控 |
| 2 | Agent Cloud 沙箱运行时 | C4 12 人天，最高风险 | 优先评估 Modal / E2B 现成方案，别自建 |
| 3 | 中转站选型 | 成本与稳定性 | 至少 2 家 A/B 对比 |
| 4 | **队列语义对照表**（见 §2.2） | **中高** | 已在 §2.2 给出逐条对齐方案。**遗留待定**：优先级用「双队列」还是 `RPriorityQueue`（建议双队列，简单可控）；watchdog 超时阈值定为多久（建议 10 分钟） |
| 5 | 密钥管理服务选型 | 安全 | 云厂商 KMS（阿里云 KMS / 火山） |
| 6 | 前端包管理器 | — | pnpm（前端 monorepo） |
| 7 | 前端 UI 组件库 | 交付速度 | 自建 + shadcn 风格，不引 Ant Design（体积与风格不匹配原站） |
| 8 | **契约生成链路**（springdoc → openapi.json → openapi-typescript） | 中 | 必须在 CI 卡死：契约未重新生成或存在漂移则构建失败，否则前后端类型会悄悄跑偏 |
| 9 | **后端分层粒度与包命名规范** | 低 | 用 ArchUnit 加架构测试，约束 `controller → service → mapper` 不越层、领域模块不互相依赖 |
| 10 | **Maven 多模块 vs 单模块拆包** | 低 | 起步用多模块（`common`/`domain`/`model-adapters`/`api`/`worker`）；团队小可先合并为单模块减少构建摩擦 |

---

## 十三、与原站的功能差异（复刻边界）

| 维度 | 原站 | xin.ai | 说明 |
|---|---|---|---|
| 画布编辑器 | 有 | 有 | 优先用 tldraw 加速 |
| Agent Cloud 沙箱 | 自建 Pod 运行时 | **优先用第三方现成**（Modal/E2B） | 省 8~10 人周，风险最高的部分 |
| 主题预设 | 6 套 | 6 套 + 后台自定义 | 一致 |
| 用户迁移 | 分家专用页 | **不做** | 自营新站无历史用户 |
| 发票 | 人工开票 | 同 | 接第三方开票待定 |
| 分销 | 完整 | 完整 | — |
