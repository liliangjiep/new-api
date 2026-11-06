/**
 * 领域常量与 Mock 数据
 * 能力域、技能包、模型路由等从文档 §2.4 / §9.1 逆向确认的结构
 * TODO(API): 接入后端后由 /model-routes/public 与 /tools 替换
 */

export type CapabilityKey =
  | "text"
  | "image"
  | "video"
  | "video-edit"
  | "video-process"
  | "erase"
  | "tts"
  | "voice-clone"
  | "image-speak"
  | "lipsync"
  | "stone-effect"
  | "stone-video"
  | "stone-materials"
  | "ecommerce-set"
  | "agent";

export interface Capability {
  key: CapabilityKey;
  label: string;
  group: "创作" | "处理" | "数字人" | "行业";
  summary: string;
  href: string;
}

export const CAPABILITIES: Capability[] = [
  { key: "text", label: "文本对话", group: "创作", summary: "多模型文本生成与长文续写", href: "/agent-chat" },
  { key: "image", label: "图片生成", group: "创作", summary: "文生图、图生图、1K/2K/4K", href: "/toolbox/image-generation" },
  { key: "video", label: "视频生成", group: "创作", summary: "文生视频、图生视频、参考生", href: "/toolbox/video-generation" },
  { key: "video-edit", label: "视频编辑", group: "处理", summary: "按输入视频参数化重生成", href: "/toolbox/video-generation" },
  { key: "video-process", label: "视频处理", group: "处理", summary: "画质增强、剪辑台合成", href: "/toolbox/video-quality-enhance" },
  { key: "erase", label: "字幕擦除", group: "处理", summary: "框选区域无痕擦除", href: "/toolbox/video-subtitle-erase" },
  { key: "tts", label: "语音合成", group: "数字人", summary: "多音色语音生成", href: "/toolbox/digital-human" },
  { key: "voice-clone", label: "音色克隆", group: "数字人", summary: "声音复刻与槽位管理", href: "/toolbox/digital-human" },
  { key: "image-speak", label: "图片口播", group: "数字人", summary: "静态形象生成口播视频", href: "/toolbox/digital-human" },
  { key: "lipsync", label: "视频改口型", group: "数字人", summary: "已有视频对齐口型", href: "/toolbox/digital-human" },
  { key: "stone-effect", label: "石材效果图", group: "行业", summary: "石材空间场景生成", href: "/toolbox/stone-effect" },
  { key: "stone-video", label: "厂家介绍视频", group: "行业", summary: "探厂探展厅风格视频", href: "/toolbox/factory-video" },
  { key: "stone-materials", label: "石材材质库", group: "行业", summary: "多维标签检索与材质卡", href: "/toolbox/stone-materials" },
  { key: "ecommerce-set", label: "商详套图", group: "行业", summary: "卖点分析后批量出图", href: "/toolbox/ecommerce-image-set" },
  { key: "agent", label: "Agent 对话", group: "创作", summary: "技能挂载与流式会话", href: "/agent-chat" },
];

export type SkillCategory = "ecommerce" | "local" | "brand" | "drama" | "default";

export interface VideoSkill {
  key: string;
  label: string;
  category: SkillCategory;
  description: string;
  refSlots: { images: number; videos: number; audios: number };
}

export const VIDEO_SKILL_CATEGORIES: {
  key: SkillCategory;
  label: string;
  note: string;
}[] = [
  { key: "ecommerce", label: "电商类", note: "5 套" },
  { key: "local", label: "本地门店类", note: "4 套" },
  { key: "brand", label: "品牌 TVC 类", note: "4 套" },
  { key: "drama", label: "短剧类", note: "5 套" },
  { key: "default", label: "默认", note: "1 套" },
];

export const VIDEO_SKILLS: VideoSkill[] = [
  { key: "ecommerce-spoken-selling", label: "口播带货", category: "ecommerce", description: "商品口播讲解与卖点强化", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "ecommerce-promotion-conversion", label: "促销转化", category: "ecommerce", description: "促销节点与转化引导", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "ecommerce-scene-seeding", label: "场景种草", category: "ecommerce", description: "使用场景化种草内容", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "ecommerce-pain-point-solution", label: "痛点解决", category: "ecommerce", description: "痛点场景与解决方案表达", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "ecommerce-function-demo", label: "功能演示", category: "ecommerce", description: "产品功能演示动线", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "local-store-discovery", label: "门店发现", category: "local", description: "门店环境与氛围呈现", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "local-store-visit-record", label: "到店实录", category: "local", description: "探店动线实录", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "local-store-signature-experience", label: "招牌体验", category: "local", description: "招牌与特色体验呈现", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "local-store-group-buy-conversion", label: "同城团购", category: "local", description: "同城团购引流转化", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "advertising-brand-proposition", label: "品牌主张", category: "brand", description: "品牌核心主张陈述", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "advertising-brand-story", label: "品牌故事", category: "brand", description: "品牌历程叙事", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "advertising-lifestyle", label: "生活方式", category: "brand", description: "生活方式态度表达", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "advertising-creative-concept", label: "创意概念", category: "brand", description: "抽象创意概念演绎", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "short-drama-dialogue", label: "对话短剧", category: "drama", description: "人物对白推进剧情", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "short-drama-reversal", label: "反转短剧", category: "drama", description: "结尾反转结构", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "short-drama-suspense", label: "悬念短剧", category: "drama", description: "悬念钩子与反转", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "short-drama-emotional", label: "情绪短片", category: "drama", description: "情绪张力表达", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "short-drama-product-placement", label: "产品植入", category: "drama", description: "剧情自然嵌入产品", refSlots: { images: 30, videos: 10, audios: 10 } },
  { key: "default-director", label: "默认导演", category: "default", description: "通用导演视角编排", refSlots: { images: 30, videos: 10, audios: 10 } },
];

export interface ImageSkill {
  key: string;
  label: string;
  description: string;
  /** 专业提示词模板：{user} 为用户输入；提交时自动拼接（见 docs/prompt-image-v1.md） */
  promptTemplate: string;
}

/**
 * 提示词模板（去 AI 味硬约束版，见 docs/prompt-image-v1.md）
 * 结构：场景/材质 → 主体+缺陷 → 光 → 机位 → 禁令；用户输入替换 {user}
 */
export const IMAGE_SKILLS: ImageSkill[] = [
  { key: "general", label: "通用出图", description: "通用文生图与图生图", promptTemplate: "Photorealistic photograph, {user}, natural imperfections, realistic textures, soft natural light, shot on Canon EOS R5, 50mm f/2.8, balanced exposure, subtle film grain, true-to-life color. No CGI look, no plastic texture, no flat lighting, no watermark, no text." },
  { key: "ecommerce-main", label: "电商主图", description: "白底商品主图", promptTemplate: "Professional e-commerce product photography, {user}, centered on clean light-grey seamless background, soft diffused studio light from upper left + subtle fill, gentle contact shadow, macro detail on material texture, shot on full-frame camera, 85mm f/8, tack sharp, true-to-life color, subtle grain. No floating object, no distorted proportions, no watermark, no extra text." },
  { key: "ecommerce-scene", label: "场景化商品图", description: "商品融入使用场景", promptTemplate: "Ultra-photorealistic lifestyle scene, {user} naturally placed in real living space, morning daylight from side window + global illumination + soft contact shadows, fabric/wood/stone micro textures, lived-in details (slight wrinkles, dust, soft wear), shot on Sony A7IV, 35mm f/4, eye-level, natural white balance. No CGI look, no staged studio polish, no plastic, no watermark, no text." },
  { key: "model-portrait", label: "模特换装", description: "模特试装与换装", promptTemplate: "Photorealistic candid portrait, {user}, natural skin with visible pores and slight under-eye texture, a few flyaway hairs, fabric weave with slight wrinkles, relaxed natural pose, single soft window light from camera left, realistic eye reflections, shot on Sony A7IV with 85mm f/1.8, shallow depth of field, background softly blurred, subtle film grain, true-to-life color. No plastic skin, no beauty filter, no over-smoothing, no extra fingers, no watermark, no text." },
  { key: "product-detail", label: "产品细节", description: "材质与工艺特写", promptTemplate: "Extreme close-up product photography, {user}, micro surface variation, subtle polish inconsistency, realistic reflections and highlight rolloff, grazing daylight to reveal texture, macro lens f/8, tack sharp on detail, shallow falloff at edges, subtle film grain. No repeating pattern, no plastic look, no watermark, no text." },
  { key: "poster", label: "营销海报", description: "版式化海报生成", promptTemplate: "Premium commercial poster photography, {user}, cinematic directional light + rim light, rich material detail, strong composition with clean negative space on one side for copy, shot on full-frame camera, 50mm f/2.8, balanced exposure, subtle grain. Main headline area left empty. No lorem ipsum, no garbled text, no watermark." },
  { key: "stone-effect", label: "石材效果图", description: "石材空间场景", promptTemplate: "Ultra-photorealistic architectural interior photograph, {user}, stone with large organic bookmatched veins wrapping continuously, mineral clouding, polished finish with highlight rolloff, micro surface variation, soft radiused edges, natural daylight from window + global illumination + ambient occlusion + contact shadows, shot on full-frame camera, 35mm f/4, natural white balance, Architectural Digest editorial quality. No CGI look, no repeating veins, no fake marble, no flat lighting, no watermark, no text." },
  { key: "stone-material", label: "石材材质", description: "材质纹理还原", promptTemplate: "Close-up stone material photography, {user}, large organic veins / mineral pits / clouding, micro surface variation, subtle polish inconsistency, neutral daylight with grazing light to reveal depth, macro lens f/8, tack sharp, true-to-life color, subtle grain. No repeating pattern, no texture-mapped look, no plastic, no watermark, no text." },
  { key: "avatar", label: "数字人形象", description: "口播形象生成", promptTemplate: "Photorealistic presenter headshot, {user}, Chinese professional, natural skin with visible pores, realistic eye reflections, neat but not stiff hair with flyaways, business-casual attire with fabric texture, soft studio window light from left, neutral blurred office background, shot on 85mm f/1.8, shallow depth of field, subtle film grain, true-to-life color. No plastic skin, no beauty filter, no over-smoothing, no watermark, no text." },
  { key: "background", label: "背景替换", description: "抠图换背景", promptTemplate: "Photorealistic background replacement, keep subject identity and edges exact, new background: {user}, matched light direction and color temperature, realistic contact shadow and edge falloff, subtle grain matched to subject. No halo, no cutout artifacts, no watermark, no text." },
  { key: "upscale", label: "高清放大", description: "分辨率提升", promptTemplate: "High-fidelity detail enhancement of {user}, preserve composition and identity exactly, restore micro texture (skin/stone/fabric grain), remove compression artifacts, natural sharpness without halos, true-to-life color. No plastic smoothing, no invented details, no watermark, no text." },
];

export interface ModelRoute {
  key: string;
  label: string;
  provider: string;
  capability: CapabilityKey;
  discountRate: number;
  enabled: boolean;
}

export const MODEL_ROUTES: ModelRoute[] = [
  { key: "doubao-seed-2.0-lite", label: "Doubao Seed 2.0 Lite", provider: "中转 → 官方", capability: "text", discountRate: 1.0, enabled: true },
  { key: "glm-5.3-flash", label: "GLM 5.3 Flash", provider: "中转 → 官方", capability: "text", discountRate: 1.0, enabled: true },
  { key: "lc-image-2.5-pro", label: "LC Image 2.5 Pro", provider: "官方直连", capability: "image", discountRate: 1.0, enabled: true },
  { key: "lc-image-2.5-fast", label: "LC Image 2.5 Fast", provider: "官方直连", capability: "image", discountRate: 0.8, enabled: true },
  { key: "seedream-4k", label: "Seedream 4K", provider: "官方直连", capability: "image", discountRate: 1.0, enabled: true },
  { key: "seedance-2.0", label: "Seedance 2.0", provider: "中转 → 官方", capability: "video", discountRate: 1.0, enabled: true },
  { key: "seedance-2.0-fast", label: "Seedance 2.0 Fast", provider: "中转 → 官方", capability: "video", discountRate: 0.75, enabled: true },
  { key: "seedance-2.0-mini", label: "Seedance 2.0 Mini", provider: "中转 → 官方", capability: "video", discountRate: 0.5, enabled: true },
  { key: "wan-3.0-prime", label: "Wan 3.0 Prime", provider: "中转 → 官方", capability: "video", discountRate: 0.9, enabled: true },
  { key: "kling-4.0", label: "Kling 4.0", provider: "中转 → 官方", capability: "video", discountRate: 0.9, enabled: true },
  { key: "volc-mediakit", label: "火山 AI MediaKit", provider: "中转 → 官方", capability: "video-process", discountRate: 1.0, enabled: true },
  { key: "tencent-mps", label: "腾讯云 MPS", provider: "中转 → 官方", capability: "erase", discountRate: 1.0, enabled: true },
  { key: "doubao-tts-2.0", label: "豆包语音合成 2.0", provider: "中转 → 官方", capability: "tts", discountRate: 1.0, enabled: true },
  { key: "wan2.2-s2v", label: "Wan2.2-S2V", provider: "官方直连", capability: "image-speak", discountRate: 1.0, enabled: true },
  { key: "volc-lipsync", label: "火山视觉改口型", provider: "中转 → 官方", capability: "lipsync", discountRate: 1.0, enabled: true },
  { key: "fal-sync-lipsync-3", label: "fal Sync Lipsync 3", provider: "中转 → 官方", capability: "lipsync", discountRate: 1.0, enabled: true },
];

export interface PricingItem {
  capability: string;
  label: string;
  spec: string;
  points: number;
  margin: number;
  model: string;
}

export const PRICING_TABLE: PricingItem[] = [
  { capability: "图片", label: "超写实图片", spec: "2K", points: 4, margin: 0.58, model: "LC Image 2.5 Pro" },
  { capability: "图片", label: "高清图片", spec: "4K", points: 6, margin: 0.55, model: "LC Image 2.5 Pro" },
  { capability: "图片", label: "轻量图片", spec: "1K", points: 2, margin: 0.62, model: "LC Image 2.5 Fast" },
  { capability: "视频", label: "超写实视频（优速）", spec: "720P 5 秒", points: 14, margin: 0.58, model: "Seedance 2.0" },
  { capability: "视频", label: "轻量视频", spec: "720P 5 秒", points: 3, margin: 0.61, model: "Seedance 2.0 Mini" },
  { capability: "视频", label: "分镜批量生成", spec: "5 镜 × 5 秒 480P", points: 30, margin: 0.55, model: "Seedance 2.0" },
  { capability: "视频", label: "参考生", spec: "Kling 4.0 720P 5 秒", points: 18, margin: 0.56, model: "Kling 4.0" },
  { capability: "视频", label: "画质增强", spec: "720P", points: 12, margin: 0.58, model: "火山 AI MediaKit" },
  { capability: "视频", label: "字幕擦除（无痕）", spec: "720P", points: 6, margin: 0.75, model: "腾讯云 MPS" },
  { capability: "视频", label: "水印擦除", spec: "1080P", points: 8, margin: 0.62, model: "腾讯云 MPS" },
  { capability: "数字人", label: "图片口播", spec: "30 秒 720P", points: 80, margin: 0.56, model: "Wan2.2-S2V" },
  { capability: "数字人", label: "图片口播", spec: "60 秒 720P", points: 160, margin: 0.56, model: "Wan2.2-S2V" },
  { capability: "数字人", label: "图片口播（轻量）", spec: "60 秒 480P", points: 90, margin: 0.56, model: "Wan2.2-S2V" },
  { capability: "数字人", label: "视频改口型", spec: "1 分钟（火山通道）", points: 260, margin: 0.55, model: "火山视觉改口型" },
  { capability: "石材", label: "石材空间效果图", spec: "单张 2K", points: 8, margin: 0.82, model: "LC Image 2.5 Pro" },
  { capability: "石材", label: "石材空间效果图", spec: "4K 高精版", points: 12, margin: 0.88, model: "LC Image 2.5 Pro" },
  { capability: "石材", label: "石材批量出图", spec: "6 张套 2K", points: 45, margin: 0.92, model: "LC Image 2.5 Pro" },
  { capability: "石材", label: "厂家介绍视频", spec: "60 秒标准版", points: 320, margin: 0.7, model: "组合链路" },
  { capability: "石材", label: "厂家介绍视频", spec: "60 秒轻量版", points: 165, margin: 0.71, model: "组合链路" },
];

export interface RechargePackage {
  code: string;
  name: string;
  amount: number;
  credits: number;
  bonusRate: number;
  audience: string;
}

export const RECHARGE_PACKAGES: RechargePackage[] = [
  { code: "trial", name: "体验包", amount: 99, credits: 100, bonusRate: 0, audience: "新客试用" },
  { code: "standard", name: "标准包", amount: 500, credits: 520, bonusRate: 0.04, audience: "个人创作者" },
  { code: "advanced", name: "进阶包", amount: 2000, credits: 2120, bonusRate: 0.06, audience: "活跃工作室" },
  { code: "professional", name: "专业包", amount: 5000, credits: 5400, bonusRate: 0.08, audience: "企业客户" },
  { code: "flagship", name: "旗舰包", amount: 20000, credits: 22400, bonusRate: 0.12, audience: "大额采购" },
  { code: "agent", name: "代理包", amount: 50000, credits: 58000, bonusRate: 0.16, audience: "分销商 / 联盟" },
];

export type AssetKind = "image" | "video" | "audio";

export interface AssetItem {
  id: string;
  name: string;
  kind: AssetKind;
  size: number;
  createdAt: string;
  group: string;
  tags: string[];
  thumb: string;
}

export const MOCK_ASSETS: AssetItem[] = Array.from({ length: 24 }, (_, i) => ({
  id: `ast_${String(i + 1).padStart(4, "0")}`,
  name: `素材_${String(i + 1).padStart(3, "0")}.${i % 3 === 0 ? "mp4" : i % 3 === 1 ? "png" : "wav"}`,
  kind: i % 3 === 0 ? "video" : i % 3 === 1 ? "image" : "audio",
  size: (i % 3 === 0 ? 18_400_000 : i % 3 === 1 ? 2_100_000 : 860_000) + i * 1000,
  createdAt: `2026-10-${String((i % 28) + 1).padStart(2, "0")} ${String(9 + (i % 10)).padStart(2, "0")}:2${i % 10}`,
  group: ["产品素材", "成片归档", "参考图", "配音"][i % 4],
  tags: [["服饰", "主图"], ["视频", "分镜"], ["美妆", "种草"], ["人像", "口播"]][i % 4],
  thumb: `/images/toapi/asset-${(i % 6) + 1}.png`,
}));

export type TaskStatus = "pending" | "running" | "succeeded" | "failed";

export interface TaskItem {
  id: string;
  title: string;
  capability: string;
  status: TaskStatus;
  progress: number;
  points: number;
  createdAt: string;
  model: string;
}

export const MOCK_TASKS: TaskItem[] = [
  { id: "tsk_9f21", title: "美妆主图 · 2K", capability: "图片生成", status: "succeeded", progress: 100, points: 4, createdAt: "2026-10-30 09:12", model: "LC Image 2.5 Pro" },
  { id: "tsk_9f20", title: "探店短片 · 60 秒", capability: "到店实录", status: "running", progress: 62, points: 165, createdAt: "2026-10-30 09:04", model: "组合链路" },
  { id: "tsk_9f1f", title: "门店探店视频 · 720P", capability: "到店实录", status: "running", progress: 28, points: 165, createdAt: "2026-10-30 08:51", model: "Seedance 2.0" },
  { id: "tsk_9f1e", title: "产品口播 · 30 秒", capability: "图片口播", status: "pending", progress: 0, points: 80, createdAt: "2026-10-30 08:40", model: "Wan2.2-S2V" },
  { id: "tsk_9f1d", title: "字幕擦除 · 1080P", capability: "字幕擦除", status: "failed", progress: 45, points: 8, createdAt: "2026-10-29 22:17", model: "腾讯云 MPS" },
  { id: "tsk_9f1c", title: "商详套图 · 6 张", capability: "商详套图", status: "succeeded", progress: 100, points: 45, createdAt: "2026-10-29 20:33", model: "LC Image 2.5 Pro" },
];

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" }
> = {
  pending: { label: "排队中", tone: "neutral" },
  running: { label: "生成中", tone: "accent" },
  succeeded: { label: "已完成", tone: "success" },
  failed: { label: "已失败", tone: "danger" },
};

export interface AdminSection {
  key: string;
  label: string;
  group: string;
  description: string;
}

export const ADMIN_SECTIONS: AdminSection[] = [
  { key: "users", label: "用户管理", group: "运营", description: "用户检索、封禁、强制下线" },
  { key: "review", label: "内容审核", group: "运营", description: "生成内容审核队列与处置" },
  { key: "billing", label: "计费与充值", group: "运营", description: "套餐配置、充值卡、积分补发扣减、交易冲正" },
  { key: "ledger", label: "积分流水", group: "运营", description: "冻结/结算/退回三段式流水，不可变" },
  { key: "packages", label: "技能包管理", group: "内容", description: "图片技能包与视频模板的增删改、版本管理" },
  { key: "video-skills", label: "视频技能", group: "内容", description: "19 套视频技能包配置与选项组" },
  { key: "announcements", label: "运营公告", group: "内容", description: "公告发布、置顶、有效期" },
  { key: "public-assets", label: "公共素材", group: "内容", description: "公共素材库与授权范围" },
  { key: "model-access", label: "模型接入", group: "供应链", description: "通道与接入点配置、连通性探测、批量切通道" },
  { key: "endpoints", label: "接入点管理", group: "供应链", description: "模型键映射、上游模型名、超时与降级序" },
  { key: "pricing", label: "售价积分", group: "供应链", description: "售价调整、毛利护栏、改价审计与回滚" },
  { key: "channels", label: "通道余额", group: "供应链", description: "中转站余额巡检与三级告警" },
  { key: "bills", label: "渠道对账", group: "供应链", description: "日终对账、差异告警、余额预警" },
  { key: "invoices", label: "发票管理", group: "财务", description: "发票申请审核与人工开票" },
  { key: "affiliate", label: "分销与结算", group: "财务", description: "联盟伙伴、佣金账期、结算单、提现审核" },
  { key: "settlement", label: "结算单", group: "财务", description: "佣金结算单生成与打款" },
  { key: "reports", label: "任务报表", group: "数据", description: "任务量、成功率、失败归因" },
  { key: "dashboard", label: "数据看板", group: "数据", description: "用户增长、任务量、成本与毛利日报" },
  { key: "audit", label: "审计日志", group: "系统", description: "操作日志、任务审计、trace_id 链路" },
  { key: "invite-codes", label: "邀请码", group: "系统", description: "邀请码生成、归因与使用统计" },
];

export const PUBLIC_ROUTES = [
  { href: "/", label: "首页" },
  { href: "/discover", label: "发现" },
  { href: "/toolbox", label: "工具箱" },
  { href: "/pricing", label: "定价" },
  { href: "/docs", label: "使用指南" },
];

export const STUDIO_ROUTES = [
  { href: "/", label: "首页" },
  { href: "/agent-chat", label: "Agent" },
  { href: "/toolbox/video-generation", label: "AI视频" },
  { href: "/toolbox/image-generation", label: "AI图片" },
  { href: "/canvas", label: "画布" },
  { href: "/assets", label: "资产" },
  { href: "/account", label: "账户" },
  { href: "/workbench", label: "工作台" },
  { href: "/toolbox", label: "工具箱" },
  { href: "/tasks", label: "任务" },
];

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

export function formatPoints(points: number): string {
  return `${points} 积分`;
}

