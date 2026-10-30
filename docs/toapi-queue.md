# toapi 生图记录（已完成 2026-10-30 v2 专业模板版）

12 张全部走 `gpt-image-2` 真实生成，存放 `apps/web/public/images/toapi/*.png`。
全站 `placeholders/*.svg` 引用已替换为真实图，`TODO(UI-ASSET)` 已清理。
提示词规则见 `docs/prompt-image-v1.md`（六段式：场景→主体缺陷→光→机位→禁令）。

| 文件 | 尺寸 | 模板 | 内容 |
|------|------|------|------|
| result-1.png | 16:9 2k | stone-effect | 卡拉拉白大理石客厅效果图（bookmatched通纹+落地窗 daylight） |
| result-2.png | 16:9 2k | stone-effect | 暮色石材展厅长廊（暖射灯+镜面反射） |
| result-3.png | 1:1 2k | avatar | 创始人形象照（毛孔+碎发+85mm浅景深） |
| result-4.png | 1:1 2k | avatar | 讲解员形象照（自然妆+皮肤纹理） |
| result-5.png | 1:1 2k | stone-material | 白底灰金纹大理石微距（矿物透光+抛光滚降） |
| result-6.png | 1:1 1k | general | 工艺师打磨深色石材纪实 |
| asset-1.png | 16:9 1k | stone-effect | 展厅空镜 |
| asset-2.png | 1:1 1k | stone-material | 大理石样砖俯拍 |
| asset-3.png | 1:1 1k | general | 录音麦克风静物 |
| asset-4.png | 1:1 1k | stone-material | 米黄洞石纹理 |
| asset-5.png | 16:9 1k | general | 鱼肚白洗手台 |
| asset-6.png | 1:1 1k | general | 深色石材楼梯 |
| hero-showroom-16x9.png | 16:9 2k | stone-effect | 首页 Hero：挑高展厅+大板连续纹+暖光（浅色编辑风主视觉） |
| hero-lobby-16x9.png | 16:9 2k | stone-effect | 首页横幅：酒店大堂米黄洞石+黄昏暖光交付图 |
| craftsman-1x1.png | 1:1 1k | general | 首页 Hero 浮卡：石材打磨纪实（去 AI 味） |

成本：v1 约 $0.18 + v2 约 $0.30（2k 单价更高）。
前端图片生成页 11 个技能包已挂 `promptTemplate`，提交自动拼接硬约束。
