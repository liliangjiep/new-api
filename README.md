# new-ai

AI 中转站 / 文档与规格工程仓库。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `apps/web` | Next.js 前端应用 |
| `packages/contracts` | 共享契约（如 OpenAPI 定义） |
| `service` | Java / Maven 后端服务（api、common、domain、model-adapters、worker） |
| `docs` | 需求、架构、计划与进度文档 |
| `deliverables` | 对外交付的规格说明书（docx） |
| `scripts` | 构建、生成与辅助脚本 |

## 开发

```bash
# 前端
cd apps/web
npm install
npm run dev

# 后端
cd service
mvn clean install
```

## 许可证

内部项目，版权归团队所有。
