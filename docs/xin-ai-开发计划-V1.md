# xin.ai 开发计划与验收清单

> 版本 v1.0 ｜ 2026-10-30
> 配套文档：《xin.ai 技术架构说明 V1》《xin.ai 开发规格说明书 V1》《xin.ai 中转站接入需求 V1》
> 规则：**一次只做一项，做完打勾**。前端全部完成后才进后端实现。

---

## 零、技术基线（本项目固定约定）

| 项 | 选型 | 说明 |
|---|---|---|
| 后端语言 | **JDK 17** | `JAVA_HOME=D:\tools\jdk17`（不用 21，虚拟线程留到二期） |
| 后端框架 | Spring Boot 3.5.x | 单体多模块 |
| 构建 | Maven 3.9 | 父 POM 统一版本管理 |
| ORM | **MyBatis-Plus 3.5.x** | `BaseMapper` + XML；DDL 用 Flyway |
| 缓存 | **Redis（Lettuce + Spring Cache）** | 本地 Caffeine 二级缓存 → Redis → DB 三级 |
| 限流 | **令牌桶（自研 Guava-free 实现 + Redis 分布式版）** | 见 §3.3 |
| 异步 | **自研 ThreadPoolExecutor 配置类** | 拒绝策略、命名、MDC 透传 |
| 表达式 | **Lambda 优先** | 禁匿名内部类做工具逻辑；集合操作一律 stream |
| 分层 | Controller → Service → **Handler** → Mapper | Handler 编排多个 Service |
| 前端 | Next.js 15 App Router + React 19 + TS 5 + Tailwind 4 | 复刻命脉，不动 |
| 契约 | OpenAPI（springdoc → openapi.json → openapi-typescript） | CI 卡漂移 |

### 分层职责（硬约束，ArchUnit 强制）

```
Controller  →  Service  →  Handler  →  Mapper  →  DB
   只做        单一      跨服务     数据访问
  校验/鉴权   领域逻辑    编排
                    ↓
              ModelAdapter（model-adapters 模块，只认 DTO）
```

- **Service**：一个 Service 只管一个聚合根，事务边界在此（`@Transactional`）
- **Handler**：需要跨多个 Service 编排时使用，**Handler 不加事务**（避免长事务），跨域一致性用补偿 + 幂等
- **Controller**：不写业务分支

---

## 一、里程碑 M1：前端功能全量（当前阶段）

> 目标：逆向出来的所有前端页面先全部可跑，交互用 mock 数据，后端接口按契约占位。

### 1.1 工程基座

- [ ] M1-01 Next.js 15 应用骨架 + TS + Tailwind 4
- [ ] M1-02 设计系统：CSS 变量主题（6 套预设）+ 字体 + 间距刻度 + 圆角刻度
- [ ] M1-03 UI 原子组件（Button / Input / Textarea / Select / Checkbox / Switch / Radio / Card / Tabs / Badge / Table / Dialog / Drawer / Dropdown / Tooltip / Progress / Skeleton / EmptyState / Pagination / Toast）
- [ ] M1-04 布局组件：TopNav / SideNav / AppShell / Breadcrumb / ThemeSwitcher / UserMenu
- [ ] M1-05 数据层：fetch 封装 + 错误归一化 + 鉴权拦截器 + TanStack Query Provider
- [ ] M1-06 状态层：Zustand（theme / auth / canvas / player）
- [ ] M1-07 契约占位：`src/generated/api.ts`（由 openapi-typescript 生成，当前为手写同构占位）
- [ ] M1-08 图标与静态资源（lucide-react + 占位图）

### 1.2 公开页（marketing）

- [ ] M1-09 首页 `/`（Hero + 场景入口 + 能力矩阵 + 发现流位 + CTA）
- [ ] M1-10 发现流 `/discover`
- [ ] M1-11 登录 `/login`、注册 `/register`（验证码流程）

### 1.3 工作台（studio）

- [ ] M1-12 工作台首页 `/workbench`（首屏聚合 + 常用工具 + 我的创作）
- [ ] M1-13 工具箱总览 `/toolbox`（13 能力域分类）
- [ ] M1-14 图片生成 `/toolbox/image-generation`（11 技能包配置化渲染）
- [ ] M1-15 视频生成 `/toolbox/video-generation`（7 模型 + 批次 + 分镜）
- [ ] M1-16 商详套图 `/toolbox/ecommerce-image-set`（卖点分析 + 批量出图 + 单行重生成）
- [ ] M1-17 深度复刻 `/toolbox/depth-video-clone`（动作轮廓 + 人物商品替换）
- [ ] M1-18 一键裂变 `/toolbox/video-remix-viral`（拆条重组）
- [ ] M1-19 画质增强 `/toolbox/video-quality-enhance`（分辨率提升 + 补帧）
- [ ] M1-20 字幕擦除 `/toolbox/video-subtitle-erase`（框选擦除）
- [ ] M1-21 剪辑台 `/toolbox/editor`（时间轴 + mediabunny 客户端合成占位）
- [ ] M1-22 数字人 `/toolbox/digital-human`（形象 → 音频 → 确认 → 生成）
- [ ] M1-23 视频创意 `/toolbox/video-creator`（19 套技能包 + 5 分类）
- [ ] M1-24 资产库 `/assets`（分组 + 网格 + 详情抽屉 + 直传）
- [ ] M1-25 画布 `/canvas`（多节点 + 连线 + 版本 + 模板）
- [ ] M1-26 Agent 对话 `/agent-chat`（会话 + SSE 占位 + 技能挂载）
- [ ] M1-27 Agent Cloud `/agent-cloud`（沙箱运行时占位）
- [ ] M1-28 账户中心 `/account`（资料 / 安全 / 余额 / 流水 / 订单 / 发票 / API Key）

### 1.4 运营后台（admin，20 页签）

- [ ] M1-29 后台骨架：侧栏 + 顶栏 + 权限门禁 + 面包屑
- [ ] M1-30 用户与审核 / M1-31 技能包 / M1-32 视频技能 / M1-33 公告 / M1-34 邀请码
- [ ] M1-35 计费与充值 / M1-36 积分流水 / M1-37 发票 / M1-38 分销 / M1-39 用户增长
- [ ] M1-40 公共素材 / M1-41 任务报表 / M1-42 审计日志 / M1-43 数据看板 / M1-44 模型接入 / M1-45 定价

### 1.5 前端收尾

- [ ] M1-46 空态 / 加载态 / 错误态 全量覆盖
- [ ] M1-47 响应式（320 / 768 / 1024 / 1440）
- [ ] M1-48 可访问性走查（键盘可达、焦点管理、ARIA）
- [ ] M1-49 视觉资源替换（toapi 批量出图，key 待提供）
- [ ] M1-50 前端构建通过 `next build` 无 error

---

## 二、里程碑 M2：后端骨架与公共层

- [ ] M2-01 Maven 父 POM + 5 子模块（common / domain / model-adapters / api / worker）
- [ ] M2-02 `common`：统一响应 `ApiResponse` / 分页 / 全局异常 / 错误码枚举
- [ ] M2-03 `common`：工具类（IdUtils / Assert / JsonUtils / DateUtils / CryptoUtils / MaskUtils）
- [ ] M2-04 `common`：Redis 配置 + 三级缓存（本地 Caffeine → Redis → DB）
- [ ] M2-05 `common`：**令牌桶限流器**（本地 + Redis 分布式两版）
- [ ] M2-06 `common`：自定义线程池（业务池 / IO 池 / 调度池，拒绝策略 + 命名 + MDC 透传）
- [ ] M2-07 `common`：幂等注解 + 分布式锁注解（Redis 实现）
- [ ] M2-08 `common`：审计 AOP + 追踪 ID（traceId MDC）
- [ ] M2-09 `common`：安全配置（Spring Security + JWT 双 Token + login_version）
- [ ] M2-10 `domain`：实体 + Mapper（按模块分组）
- [ ] M2-11 `domain`：枚举（任务状态 / 通道状态 / 能力域 / 流水类型 / 订单状态）
- [ ] M2-12 Flyway 迁移脚本（V1__init.sql ~ V5__seed.sql）

---

## 三、里程碑 M3：后端业务模块（按文档章节顺序）

### M3.1 模型供应链（文档 §9，最高优先级）

- [ ] M3-01 `model-adapters`：`ModelAdapter` 接口 + 错误归一化 + 请求上下文
- [ ] M3-02 `model-adapters`：RelayAdapter（OpenAI 兼容）
- [ ] M3-03 `model-adapters`：Volcengine / Bailian / TencentMps / Kie / Fal Adapter
- [ ] M3-04 `model-adapters`：`ModelEndpointRegistry`（缓存 + 主动失效 RTopic 广播）
- [ ] M3-05 `model-adapters`：`CapabilityRegistry`（13 能力域路由 + 折扣 + 售价）
- [ ] M3-06 `model-adapters`：`ChannelRouter`（Resilience4j 熔断 + 优先级降级 + 幂等键）
- [ ] M3-07 `model-adapters`：成本采集 + `cost_ratio` 计算 + usage_record 落库
- [ ] M3-08 后台：通道 CRUD + 接入点 CRUD + 连通性探测 + 批量切通道

### M3.2 计费与积分（文档 §8）

- [ ] M3-09 报价引擎（指纹防篡改 + 报价快照 + 过期）
- [ ] M3-10 积分账户 + 冻结/结算/退回三段式（原子性 + 并发安全）
- [ ] M3-11 积分流水（不可变 + 有效期批次先进先出）
- [ ] M3-12 充值套餐 / 订单 / 充值卡
- [ ] M3-13 售价积分后台可配（改价审计 + 毛利护栏 + 回滚）

### M3.3 任务与队列（文档 §4 / §7）

- [ ] M3-14 任务提交 + 幂等键 + 批次模型
- [ ] M3-15 队列：`RQueue` + `RDelayedQueue` + 能力域分队列 + 并发信号量
- [ ] M3-16 Worker 处理器（图片 / 视频 / 数字人 / 剪辑 / 擦除）
- [ ] M3-17 任务状态机 + watchdog 超时重投
- [ ] M3-18 SSE 进度流

### M3.4 资产与素材（文档 §5）

- [ ] M3-19 资产库 + 分组 + 派生件
- [ ] M3-20 两段式直传（upload-policy → complete）

### M3.5 账号与权限（文档 §2）

- [ ] M3-21 验证码登录注册 + 双 Token + 强制下线
- [ ] M3-22 RBAC 六角色 + 方法级鉴权

### M3.6 画布 / Agent / 数字人

- [ ] M3-23 画布 CRUD + 节点边 + 版本（last-write-wins）
- [ ] M3-24 Agent 会话 + 消息 + 技能挂载
- [ ] M3-25 数字人形象 + 音色档案 + 合成

### M3.7 商业化与后台

- [ ] M3-26 联盟分销（partner / commission / settlement / withdrawal）
- [ ] M3-27 发票申请 + 后台人工开票
- [ ] M3-28 运营后台 20 页签数据接口
- [ ] M3-29 毛利日报（物化视图 + 三级拆分）

---

## 四、里程碑 M4：契约与联调

- [ ] M4-01 springdoc 导出 openapi.json
- [ ] M4-02 openapi-typescript 生成前端类型（替换占位）
- [ ] M4-03 CI 契约漂移校验
- [ ] M4-04 前后端联调（按端点清单 89 个逐个勾）

---

## 五、里程碑 M5：交付与运维

- [ ] M5-01 Docker 镜像（web / api / worker）
- [ ] M5-02 K8s 清单 + Nginx（SSE + 限流）
- [ ] M5-03 可观测性（Prometheus 指标 + Loki 日志 + traceId 链路）
- [ ] M5-04 安全加固（密钥管理服务接入 + 脱敏 + 越权扣费防护）
- [ ] M5-05 运维手册 + 部署脚本 + 备份

---

## 六、当前阶段结论

**M1 前端优先**。后端 M2/M3 在 M1 完成后启动。
无法提供的信息统一用占位符标注 `TODO`：
- `TODO(UI-ASSET)` 视觉资源待 toapi 生成
- `TODO(API)` 后端接口待实现，前端按契约 mock
- `TODO(SPEC)` 规格未明确的业务规则
