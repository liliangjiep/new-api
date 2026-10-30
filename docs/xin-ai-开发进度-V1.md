# xin.ai 开发进度跟踪（V1 · 前端优先）

> 规则：一次只做一项，做完打勾 ✅。前端 M1 全量完成后才进后端 M2/M3 实现。
> JDK 基线已按要求锁定为 **JDK 17**（架构文档 V1 写 21，以本文为准，后续回写架构文档）。
> 后端：MyBatis-Plus 3.5.x；缓存：Redis（Lettuce + Spring Cache）+ 本地 Caffeine 二级；限流：自研令牌桶（本地版 + Redis 分布式版）。
> 占位符约定：`TODO(UI-ASSET)` 视觉资源待 toapi 生成（需 TOAPIS_API_KEY，当前未提供，先用 SVG 占位）；
> `TODO(API)` 后端接口待实现，前端按契约 mock；`TODO(SPEC)` 规格未明确。

## M1 前端功能全量（当前阶段）

### M1.1 工程基座
- [x] M1-01 Next.js 15 应用骨架 + TS + Tailwind 4
- [x] M1-02 设计系统：CSS 变量主题（6 套预设）+ 字体 + 间距 + 圆角
- [x] M1-03 UI 原子组件（Button/Input/Textarea/Select/Checkbox/Switch/Radio/Card/Tabs/Badge/Table/Dialog/Drawer/Dropdown/Tooltip/Progress/Skeleton/EmptyState/Pagination/Toast）
- [x] M1-04 布局组件：TopNav / SideNav / AppShell / Breadcrumb / ThemeSwitcher / UserMenu
- [x] M1-05 数据层：fetch 封装 + 错误归一化 + 鉴权拦截器 + TanStack Query Provider
- [x] M1-06 状态层：Zustand（theme / auth / canvas / player）
- [x] M1-07 契约占位：`src/generated/api.ts`（已建占位文件，待 openapi-typescript 替换）
- [x] M1-08 图标与静态资源（lucide-react + SVG 占位图）

### M1.2 公开页
- [x] M1-09 首页 `/`（Hero + 场景入口 + 能力矩阵 + 发现流位 + CTA）
- [x] M1-10 发现流 `/discover`（mock 数据 + 筛选交互）
- [x] M1-11 登录 `/login`、注册 `/register`（验证码流程 mock）

### M1.3 工作台
- [x] M1-12 工作台首页 `/workbench`
- [x] M1-13 工具箱总览 `/toolbox`（13 能力域分类）
- [x] M1-14 图片生成 `/toolbox/image-generation`（11 技能包配置化渲染）
- [x] M1-15 视频生成 `/toolbox/video-generation`（7 模型 + 批次 + 分镜）
- [x] M1-16 商详套图 `/toolbox/ecommerce-image-set`
- [x] M1-17 深度复刻 `/toolbox/depth-video-clone`
- [x] M1-18 一键裂变 `/toolbox/video-remix-viral`
- [x] M1-19 画质增强 `/toolbox/video-quality-enhance`
- [x] M1-20 字幕擦除 `/toolbox/video-subtitle-erase`
- [x] M1-21 剪辑台 `/toolbox/editor`（时间轴 + mediabunny 占位）
- [x] M1-22 数字人 `/toolbox/digital-human`
- [x] M1-23 视频创意 `/toolbox/video-creator`（19 套技能包 + 5 分类）
- [x] M1-24 资产库 `/assets`（分组 + 网格 + 详情抽屉 + 直传）
- [x] M1-25 画布 `/canvas`（多节点 + 连线 + 版本 + 模板）
- [x] M1-26 Agent 对话 `/agent-chat`（会话 + SSE 占位 + 技能挂载）
- [x] M1-27 Agent Cloud `/agent-cloud`（沙箱运行时占位，列表/模板/用量/日志交互全量）
- [x] M1-28 账户中心 `/account`（资料/安全/余额/流水/订单/发票/API Key）
- [x] M1-28b 定价 `/pricing`（售价积分表 + 套餐）
- [x] M1-28c 文档 `/docs`（接入文档占位）

### M1.4 运营后台（16 分组 → 20 页签展开）
- [x] M1-29 后台骨架 `/admin`：侧栏 + 顶栏 + 权限门禁 + 面包屑（20 页签全量）
- [x] M1-30 用户与审核 / M1-31 技能包 / M1-32 视频技能 / M1-33 公告 / M1-34 邀请码
- [x] M1-35 计费与充值 / M1-36 积分流水 / M1-37 发票 / M1-38 分销 / M1-39 用户增长
- [x] M1-40 公共素材 / M1-41 任务报表 / M1-42 审计日志 / M1-43 数据看板 / M1-44 模型接入 / M1-45 定价
- [x] M1-45b 后端已预留：通道/接入点/定价/余额/对账接口契约占位

### M1.5 前端收尾
- [x] M1-46 空态/加载态/错误态全量覆盖（EmptyState + Progress + Toast 全路由覆盖）
- [x] M1-47 响应式（320/768/1024/1440 走查，Tailwind 断点栅格全覆盖）
- [x] M1-48 可访问性走查（键盘可达、焦点管理、ARIA，role/tab/aria-* 全量）
- [x] M1-49 视觉资源替换（toapi 批量出图已完成：`public/images/toapi/*.png` 12 张真实图，全站替换 placeholders 引用）
- [x] M1-50 前端构建 `next build` 无 error（32 路由全量预渲染成功，exit 0）

## M2 后端骨架（只搭架、不实现 —— 本轮完成架子）
- [x] M2-01 Maven 父 POM + 5 子模块（common / domain / model-adapters / api / worker）
- [ ] M2-02 `common`：统一响应 / 分页 / 全局异常 / 错误码
- [ ] M2-03 `common`：工具类（Id/Assert/Json/Date/Crypto/Mask）
- [ ] M2-04 `common`：Redis 配置 + 三级缓存（Caffeine → Redis → DB）
- [ ] M2-05 `common`：令牌桶限流器（本地 + Redis 分布式两版）
- [ ] M2-06 `common`：自定义线程池（业务池/IO池/调度池）
- [ ] M2-07 `common`：幂等注解 + 分布式锁注解
- [ ] M2-08 `common`：审计 AOP + traceId MDC
- [ ] M2-09 `common`：安全配置（JWT 双 Token + login_version）
- [ ] M2-10 `domain`：实体 + Mapper
- [ ] M2-11 `domain`：枚举
- [ ] M2-12 Flyway 迁移脚本 V1~V5

## toapi 生图记录
- 状态：已执行（2026-10-30）。12 张全部走 `gpt-image-2 / 1k` 真实生成，存放 `apps/web/public/images/toapi/*.png`，全站 `placeholders/*.svg` 引用已替换。
- 成本：约 $0.18（12 × $0.015）。
- 去 AI 味要求：已在 skill 约束下定调 —— 深色光学台面 + 发丝边框 + 等宽数字 + 细网格纹理，禁用紫色渐变与通用卡片堆砌。
