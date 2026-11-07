package com.xin.ai.domain.catalog;

import java.util.List;
import java.util.Map;

/**
 * 领域目录：能力域 / 模型路由 / 售价积分 / 充值套餐 / 技能包 / 石材模板 / Agent 技能。
 * 行内注释1：本文件内容全部来自前端 apps/web/src/lib/domain.ts 与 lib/skills.ts 的既有常量，逐字搬过来，后台改价走 DB 不改这里。
 * 行内注释2：这是「写死」的基线数据 —— 前端当前就是按这套常量渲染的，后端下发后两端一致。
 * 行内注释3：定价条目额外带 model_key 与 cost（成本），供报价引擎与毛利护栏使用。
 */
public final class Catalog {

    private Catalog() {}

    /** 能力域（前端 CAPABILITIES，15 项）。 */
    public static final List<Map<String, Object>> CAPABILITIES = List.of(
            cap("text", "文本对话", "创作", "多模型文本生成与长文续写", "/agent-chat"),
            cap("image", "图片生成", "创作", "文生图、图生图、1K/2K/4K", "/toolbox/image-generation"),
            cap("video", "视频生成", "创作", "文生视频、图生视频、参考生", "/toolbox/video-generation"),
            cap("video-edit", "视频编辑", "处理", "按输入视频参数化重生成", "/toolbox/video-generation"),
            cap("video-process", "视频处理", "处理", "画质增强、剪辑台合成", "/toolbox/video-quality-enhance"),
            cap("erase", "字幕擦除", "处理", "框选区域无痕擦除", "/toolbox/video-subtitle-erase"),
            cap("tts", "语音合成", "数字人", "多音色语音生成", "/toolbox/digital-human"),
            cap("voice-clone", "音色克隆", "数字人", "声音复刻与槽位管理", "/toolbox/digital-human"),
            cap("image-speak", "图片口播", "数字人", "静态形象生成口播视频", "/toolbox/digital-human"),
            cap("lipsync", "视频改口型", "数字人", "已有视频对齐口型", "/toolbox/digital-human"),
            cap("stone-effect", "石材效果图", "行业", "石材空间场景生成", "/toolbox/stone-effect"),
            cap("stone-video", "厂家介绍视频", "行业", "探厂探展厅风格视频", "/toolbox/factory-video"),
            cap("stone-materials", "石材材质库", "行业", "多维标签检索与材质卡", "/toolbox/stone-materials"),
            cap("ecommerce-set", "商详套图", "行业", "卖点分析后批量出图", "/toolbox/ecommerce-image-set"),
            cap("agent", "Agent 对话", "创作", "技能挂载与流式会话", "/agent-chat"));

    /** 模型路由（前端 MODEL_ROUTES，16 项）。 */
    public static final List<Map<String, Object>> MODEL_ROUTES = List.of(
            route("doubao-seed-2.0-lite", "Doubao Seed 2.0 Lite", "中转 → 官方", "text", 1.0),
            route("glm-5.3-flash", "GLM 5.3 Flash", "中转 → 官方", "text", 1.0),
            route("lc-image-2.5-pro", "LC Image 2.5 Pro", "官方直连", "image", 1.0),
            route("lc-image-2.5-fast", "LC Image 2.5 Fast", "官方直连", "image", 0.8),
            route("seedream-4k", "Seedream 4K", "官方直连", "image", 1.0),
            route("seedance-2.0", "Seedance 2.0", "中转 → 官方", "video", 1.0),
            route("seedance-2.0-fast", "Seedance 2.0 Fast", "中转 → 官方", "video", 0.75),
            route("seedance-2.0-mini", "Seedance 2.0 Mini", "中转 → 官方", "video", 0.5),
            route("wan-3.0-prime", "Wan 3.0 Prime", "中转 → 官方", "video", 0.9),
            route("kling-4.0", "Kling 4.0", "中转 → 官方", "video", 0.9),
            route("volc-mediakit", "火山 AI MediaKit", "中转 → 官方", "video-process", 1.0),
            route("tencent-mps", "腾讯云 MPS", "中转 → 官方", "erase", 1.0),
            route("doubao-tts-2.0", "豆包语音合成 2.0", "中转 → 官方", "tts", 1.0),
            route("wan2.2-s2v", "Wan2.2-S2V", "官方直连", "image-speak", 1.0),
            route("volc-lipsync", "火山视觉改口型", "中转 → 官方", "lipsync", 1.0),
            route("fal-sync-lipsync-3", "fal Sync Lipsync 3", "中转 → 官方", "lipsync", 1.0));

    /**
     * 售价积分（前端 PRICING_TABLE 19 项 + model_key + 成本）。
     * 行内注释1：cost 为上游拿货成本（后台定价页 mock 的口径），毛利护栏据此校验。
     * 行内注释2：points 即前端展示的售价积分，与 PRICING_TABLE 逐项一致。
     */
    public static final List<Map<String, Object>> PRICING = List.of(
            price("image.t2i.2k", "image", "超写实图片", "2K", 4, 0.58, 1.70, "LC Image 2.5 Pro"),
            price("image.t2i.4k", "image", "高清图片", "4K", 6, 0.55, 2.70, "LC Image 2.5 Pro"),
            price("image.t2i.1k", "image", "轻量图片", "1K", 2, 0.62, 0.76, "LC Image 2.5 Fast"),
            price("video.t2v.720p", "video", "超写实视频（优速）", "720P 5 秒", 14, 0.58, 5.88, "Seedance 2.0"),
            price("video.t2v.mini", "video", "轻量视频", "720P 5 秒", 3, 0.61, 1.17, "Seedance 2.0 Mini"),
            price("video.batch.480p", "video", "分镜批量生成", "5 镜 × 5 秒 480P", 30, 0.55, 13.50, "Seedance 2.0"),
            price("video.i2v.kling", "video", "参考生", "Kling 4.0 720P 5 秒", 18, 0.56, 7.92, "Kling 4.0"),
            price("video.process.enhance", "video-process", "画质增强", "720P", 12, 0.58, 5.04, "火山 AI MediaKit"),
            price("video.erase.subtitle", "erase", "字幕擦除（无痕）", "720P", 6, 0.75, 1.50, "腾讯云 MPS"),
            price("video.erase.watermark", "erase", "水印擦除", "1080P", 8, 0.62, 3.04, "腾讯云 MPS"),
            price("image-speak.30s", "image-speak", "图片口播", "30 秒 720P", 80, 0.56, 35.20, "Wan2.2-S2V"),
            price("image-speak.60s", "image-speak", "图片口播", "60 秒 720P", 160, 0.56, 70.40, "Wan2.2-S2V"),
            price("image-speak.60s.light", "image-speak", "图片口播（轻量）", "60 秒 480P", 90, 0.56, 39.60, "Wan2.2-S2V"),
            price("lipsync.volc.1min", "lipsync", "视频改口型", "1 分钟（火山通道）", 260, 0.55, 117.00, "火山视觉改口型"),
            price("stone.effect.2k", "stone-effect", "石材空间效果图", "单张 2K", 8, 0.82, 1.44, "LC Image 2.5 Pro"),
            price("stone.effect.4k", "stone-effect", "石材空间效果图", "4K 高精版", 12, 0.88, 1.44, "LC Image 2.5 Pro"),
            price("stone.effect.set6", "stone-effect", "石材批量出图", "6 张套 2K", 45, 0.92, 3.60, "LC Image 2.5 Pro"),
            price("factory-video.60s", "stone-video", "厂家介绍视频", "60 秒标准版", 320, 0.70, 96.00, "组合链路"),
            price("factory-video.60s.light", "stone-video", "厂家介绍视频", "60 秒轻量版", 165, 0.71, 47.85, "组合链路"),
            price("doubao-tts-2.0", "tts", "语音合成", "默认音色", 2, 0.60, 0.80, "豆包语音合成 2.0"));

    /** 充值套餐（前端 RECHARGE_PACKAGES，6 档）。 */
    public static final List<Map<String, Object>> RECHARGE_PACKAGES = List.of(
            pkg("trial", "体验包", 99, 100, 0.0, "新客试用"),
            pkg("standard", "标准包", 500, 520, 0.04, "个人创作者"),
            pkg("advanced", "进阶包", 2000, 2120, 0.06, "活跃工作室"),
            pkg("professional", "专业包", 5000, 5400, 0.08, "企业客户"),
            pkg("flagship", "旗舰包", 20000, 22400, 0.12, "大额采购"),
            pkg("agent", "代理包", 50000, 58000, 0.16, "分销商 / 联盟"));

    /** 图片技能包（前端 IMAGE_SKILLS，11 项，含提示词模板）。 */
    public static final List<Map<String, Object>> IMAGE_SKILLS = List.of(
            imageSkill("general", "通用出图", "通用文生图与图生图",
                    "Photorealistic photograph, {user}, natural imperfections, realistic textures, soft natural light, shot on Canon EOS R5, 50mm f/2.8, balanced exposure, subtle film grain, true-to-life color. No CGI look, no plastic texture, no flat lighting, no watermark, no text."),
            imageSkill("ecommerce-main", "电商主图", "白底商品主图",
                    "Professional e-commerce product photography, {user}, centered on clean light-grey seamless background, soft diffused studio light from upper left + subtle fill, gentle contact shadow, macro detail on material texture, shot on full-frame camera, 85mm f/8, tack sharp, true-to-life color, subtle grain. No floating object, no distorted proportions, no watermark, no extra text."),
            imageSkill("ecommerce-scene", "场景化商品图", "商品融入使用场景",
                    "Ultra-photorealistic lifestyle scene, {user} naturally placed in real living space, morning daylight from side window + global illumination + soft contact shadows, fabric/wood/stone micro textures, lived-in details (slight wrinkles, dust, soft wear), shot on Sony A7IV, 35mm f/4, eye-level, natural white balance. No CGI look, no staged studio polish, no plastic, no watermark, no text."),
            imageSkill("model-portrait", "模特换装", "模特试装与换装",
                    "Photorealistic candid portrait, {user}, natural skin with visible pores and slight under-eye texture, a few flyaway hairs, fabric weave with slight wrinkles, relaxed natural pose, single soft window light from camera left, realistic eye reflections, shot on Sony A7IV with 85mm f/1.8, shallow depth of field, background softly blurred, subtle film grain, true-to-life color. No plastic skin, no beauty filter, no over-smoothing, no extra fingers, no watermark, no text."),
            imageSkill("product-detail", "产品细节", "材质与工艺特写",
                    "Extreme close-up product photography, {user}, micro surface variation, subtle polish inconsistency, realistic reflections and highlight rolloff, grazing daylight to reveal texture, macro lens f/8, tack sharp on detail, shallow falloff at edges, subtle film grain. No repeating pattern, no plastic look, no watermark, no text."),
            imageSkill("poster", "营销海报", "版式化海报生成",
                    "Premium commercial poster photography, {user}, cinematic directional light + rim light, rich material detail, strong composition with clean negative space on one side for copy, shot on full-frame camera, 50mm f/2.8, balanced exposure, subtle grain. Main headline area left empty. No lorem ipsum, no garbled text, no watermark."),
            imageSkill("stone-effect", "石材效果图", "石材空间场景",
                    "Ultra-photorealistic architectural interior photograph, {user}, stone with large organic bookmatched veins wrapping continuously, mineral clouding, polished finish with highlight rolloff, micro surface variation, soft radiused edges, natural daylight from window + global illumination + ambient occlusion + contact shadows, shot on full-frame camera, 35mm f/4, natural white balance, Architectural Digest editorial quality. No CGI look, no repeating veins, no fake marble, no flat lighting, no watermark, no text."),
            imageSkill("stone-material", "石材材质", "材质纹理还原",
                    "Close-up stone material photography, {user}, large organic veins / mineral pits / clouding, micro surface variation, subtle polish inconsistency, neutral daylight with grazing light to reveal depth, macro lens f/8, tack sharp, true-to-life color, subtle grain. No repeating pattern, no texture-mapped look, no plastic, no watermark, no text."),
            imageSkill("avatar", "数字人形象", "口播形象生成",
                    "Photorealistic presenter headshot, {user}, Chinese professional, natural skin with visible pores, realistic eye reflections, neat but not stiff hair with flyaways, business-casual attire with fabric texture, soft studio window light from left, neutral blurred office background, shot on 85mm f/1.8, shallow depth of field, subtle film grain, true-to-life color. No plastic skin, no beauty filter, no over-smoothing, no watermark, no text."),
            imageSkill("background", "背景替换", "抠图换背景",
                    "Photorealistic background replacement, keep subject identity and edges exact, new background: {user}, matched light direction and color temperature, realistic contact shadow and edge falloff, subtle grain matched to subject. No halo, no cutout artifacts, no watermark, no text."),
            imageSkill("upscale", "高清放大", "分辨率提升",
                    "High-fidelity detail enhancement of {user}, preserve composition and identity exactly, restore micro texture (skin/stone/fabric grain), remove compression artifacts, natural sharpness without halos, true-to-life color. No plastic smoothing, no invented details, no watermark, no text."));

    /** 视频技能分类（前端 VIDEO_SKILL_CATEGORIES）。 */
    public static final List<Map<String, Object>> VIDEO_SKILL_CATEGORIES = List.of(
            Map.of("key", "ecommerce", "label", "电商类", "note", "5 套"),
            Map.of("key", "local", "label", "本地门店类", "note", "4 套"),
            Map.of("key", "brand", "label", "品牌 TVC 类", "note", "4 套"),
            Map.of("key", "drama", "label", "短剧类", "note", "5 套"),
            Map.of("key", "default", "label", "默认", "note", "1 套"));

    /** 视频技能包（前端 VIDEO_SKILLS，19 项；refSlots 统一 30/10/10）。 */
    public static final List<Map<String, Object>> VIDEO_SKILLS = List.of(
            videoSkill("ecommerce-spoken-selling", "口播带货", "ecommerce", "商品口播讲解与卖点强化"),
            videoSkill("ecommerce-promotion-conversion", "促销转化", "ecommerce", "促销节点与转化引导"),
            videoSkill("ecommerce-scene-seeding", "场景种草", "ecommerce", "使用场景化种草内容"),
            videoSkill("ecommerce-pain-point-solution", "痛点解决", "ecommerce", "痛点场景与解决方案表达"),
            videoSkill("ecommerce-function-demo", "功能演示", "ecommerce", "产品功能演示动线"),
            videoSkill("local-store-discovery", "门店发现", "local", "门店环境与氛围呈现"),
            videoSkill("local-store-visit-record", "到店实录", "local", "探店动线实录"),
            videoSkill("local-store-signature-experience", "招牌体验", "local", "招牌与特色体验呈现"),
            videoSkill("local-store-group-buy-conversion", "同城团购", "local", "同城团购引流转化"),
            videoSkill("advertising-brand-proposition", "品牌主张", "brand", "品牌核心主张陈述"),
            videoSkill("advertising-brand-story", "品牌故事", "brand", "品牌历程叙事"),
            videoSkill("advertising-lifestyle", "生活方式", "brand", "生活方式态度表达"),
            videoSkill("advertising-creative-concept", "创意概念", "brand", "创意表达，强化品牌记忆"),
            videoSkill("short-drama-dialogue", "对话短剧", "drama", "人物对白推进剧情"),
            videoSkill("short-drama-reversal", "反转短剧", "drama", "结尾反转结构"),
            videoSkill("short-drama-suspense", "悬念短剧", "drama", "悬念钩子与反转"),
            videoSkill("short-drama-emotional", "情绪短片", "drama", "情绪张力表达"),
            videoSkill("short-drama-product-placement", "产品植入", "drama", "剧情自然嵌入产品价值"),
            videoSkill("default-director", "默认导演", "default", "通用导演视角编排"));

    /** Agent 可挂载技能（文档 §2.6，6 项）。 */
    public static final List<Map<String, Object>> AGENT_SKILLS = List.of(
            agentSkill("smart-director", "智能编导", "把一句话想法扩写成可执行的分镜脚本"),
            agentSkill("video-generation", "视频生成", "调用视频生成能力产出成片"),
            agentSkill("image-generation", "图片生成", "调用图片生成能力产出图片"),
            agentSkill("subtitle-erase", "字幕擦除", "对成片做字幕无痕擦除"),
            agentSkill("quality-enhance", "画质增强", "对成片做分辨率与画质提升"),
            agentSkill("factory-video", "厂家介绍视频", "生成探厂探展厅风格介绍视频"));

    /** 石材场景模板（文档 §2.9，14 类）。 */
    public static final List<Map<String, Object>> STONE_SCENE_TEMPLATES = List.of(
            stoneTemplate("living-room", "客厅", "室内", "自然光从大窗进入，柔和全局照明，石材墙面连续纹路，接触阴影清晰",
                    "Modern luxury living room, {material_desc} as floor and feature wall, large windows with soft daylight, global illumination, realistic contact shadows, ultra-photorealistic architectural interior photography, 35mm f/4, Architectural Digest quality. No CGI look, no watermark."),
            stoneTemplate("bedroom", "卧室", "室内", "床头背光，暖调氛围光，织物与石材对比",
                    "Luxury hotel bedroom, {material_desc} on headboard wall and bedside table, warm ambient light with soft window fill, fabric and stone material contrast, ultra-photorealistic, 35mm f/4. No CGI look, no watermark."),
            stoneTemplate("kitchen", "厨房", "室内", "台面重点照明，高光滚降清晰",
                    "Designer kitchen with {material_desc} countertop and island, focused task lighting with smooth highlight rolloff on stone surface, realistic reflections, ultra-photorealistic, 24mm f/5.6. No CGI look, no watermark."),
            stoneTemplate("bathroom", "卫浴间", "室内", "镜面反射 + 湿面质感",
                    "Spa bathroom with {material_desc} wall panels and vanity top, mirror reflections, wet-look surface quality, soft indirect lighting, ultra-photorealistic, 35mm f/4. No CGI look, no watermark."),
            stoneTemplate("dining-room", "餐厅", "室内", "餐吊灯暖光，桌面反光",
                    "Formal dining room, {material_desc} dining table and feature wall, warm pendant lighting, controlled reflections on polished stone, ultra-photorealistic, 35mm f/4. No CGI look, no watermark."),
            stoneTemplate("hallway", "玄关", "室内", "低角度柔光，纵深",
                    "Entrance hallway, {material_desc} wall cladding, low-angle soft lighting, strong perspective depth, realistic floor reflections, ultra-photorealistic, 24mm f/5.6. No CGI look, no watermark."),
            stoneTemplate("stairs", "楼梯", "室内", "侧逆光突出纹理起伏",
                    "Sculptural staircase with {material_desc} treads and risers, side backlight emphasizing texture relief, deep shadow falloff, ultra-photorealistic, 24mm f/5.6. No CGI look, no watermark."),
            stoneTemplate("reception", "前台接待", "室内", "均匀环境光 + 品牌色点缀",
                    "Corporate reception desk built from {material_desc}, even ambient lighting with subtle accent light, ultra-photorealistic architectural photography, 35mm f/4. No CGI look, no watermark."),
            stoneTemplate("facade", "建筑外立面", "外立面", "黄昏天光，石材拼缝几何",
                    "Contemporary building facade clad in {material_desc}, precise geometric joints, dusk sky light, realistic weathered stone texture, ultra-photorealistic, 24mm f/5.6. No CGI look, no watermark."),
            stoneTemplate("landscape", "景观围墙", "外立面", "户外漫射光，苔藓与石材对比",
                    "Landscape feature wall using {material_desc}, diffuse overcast daylight, moss and stone contrast, natural weathering, ultra-photorealistic, 35mm f/4. No CGI look, no watermark."),
            stoneTemplate("column", "罗马柱", "部件", "侧光强调柱身弧面",
                    "Classical column carved from {material_desc}, side lighting emphasizing curvature and vein continuity, ultra-photorealistic product photography, 85mm f/8. No CGI look, no watermark."),
            stoneTemplate("countertop", "台面", "部件", "俯视微距，纹理与倒角",
                    "Close-up countertop slab of {material_desc}, top-down macro view showing vein continuity and radiused edge, grazing light, ultra-photorealistic, 85mm f/8 macro. No CGI look, no watermark."),
            stoneTemplate("furniture", "家具构件", "部件", "柔光棚拍，微表面变化",
                    "Designer furniture piece in {material_desc}, soft studio light, visible micro surface variation, ultra-photorealistic product photography, 85mm f/8. No CGI look, no watermark."),
            stoneTemplate("display-stand", "展台", "部件", "顶部聚光 + 环境反射",
                    "Retail display plinth in {material_desc}, top spotlight with ambient floor reflection, ultra-photorealistic, 85mm f/8. No CGI look, no watermark."));

    // ---------------- 构造辅助 ----------------

    private static Map<String, Object> cap(String key, String label, String group, String summary, String href) {
        return Map.of("key", key, "label", label, "group", group, "summary", summary, "href", href);
    }

    private static Map<String, Object> route(String key, String label, String provider, String capability, double discountRate) {
        return Map.of("key", key, "label", label, "provider", provider,
                "capability", capability, "discount_rate", discountRate, "enabled", true);
    }

    private static Map<String, Object> price(String modelKey, String capability, String label, String spec,
            int points, double margin, double cost, String model) {
        return Map.of("model_key", modelKey, "capability", capability, "label", label, "spec", spec,
                "points", points, "margin", margin, "cost", cost, "model", model);
    }

    private static Map<String, Object> pkg(String code, String name, int amount, int credits, double bonusRate, String audience) {
        return Map.of("code", code, "name", name, "amount", amount, "credits", credits,
                "bonus_rate", bonusRate, "audience", audience);
    }

    private static Map<String, Object> imageSkill(String key, String label, String description, String promptTemplate) {
        return Map.of("key", key, "label", label, "description", description, "prompt_template", promptTemplate);
    }

    private static Map<String, Object> videoSkill(String key, String label, String category, String description) {
        return Map.of("key", key, "label", label, "category", category, "description", description,
                "ref_slots", Map.of("images", 30, "videos", 10, "audios", 10));
    }

    private static Map<String, Object> agentSkill(String key, String label, String description) {
        return Map.of("key", key, "label", label, "description", description);
    }

    private static Map<String, Object> stoneTemplate(String key, String label, String group, String lighting, String prompt) {
        return Map.of("key", key, "label", label, "group", group, "lighting", lighting, "prompt", prompt);
    }
}
