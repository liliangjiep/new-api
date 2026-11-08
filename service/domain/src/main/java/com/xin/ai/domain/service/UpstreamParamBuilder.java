package com.xin.ai.domain.service;

import com.xin.ai.domain.catalog.Catalog;
import com.xin.ai.domain.repository.DataStore;
import com.xin.ai.domain.repository.Rows;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * 上游参数装配器 —— 把「平台业务参数」翻译成「中转站/上游认识的参数」。
 *
 * <p>行内注释1：为什么需要它 —— 平台侧的任务参数是业务语义（video_asset_id / avatar_id /
 * regions / script），而上游多模态接口要的是可访问的 URL（video_url / reference_images /
 * audio_with_roles）。不做这层翻译，模板里拿到的就是内部 ID，上游必然下载失败。
 *
 * <p>行内注释2：URL 从资产库（assets）与数字人形象（avatars）里取真实地址 —— 与前端
 * AssetPickerModal 选中的素材一一对应，不拼假域名。
 *
 * <p>行内注释3：每个 model_key 只产出它需要的键 —— 接入点级 template_json 里也就只写这些键，
 * 避免把空值透传给上游导致参数校验失败。
 */
@Service
public class UpstreamParamBuilder {

    /**
     * 技能模板标记前缀 —— 已套过技能母版的 prompt 以此开头。
     * 行内注释3.1.4：防重复套模板（任务重试 / 二次提交时 prompt 会带上它）。
     */
    private static final String SKILL_PREFIX = "[skill] ";

    private final DataStore store;

    public UpstreamParamBuilder(DataStore store) {
        this.store = store;
    }

    /**
     * 装配上游参数。
     *
     * @param modelKey 平台 model_key
     * @param params   任务参数（业务语义）
     * @param userId   任务归属用户（资产归属校验）
     */
    public Map<String, Object> build(String modelKey, Map<String, Object> params, String userId) {
        Map<String, Object> p = params == null ? Map.of() : params;
        Map<String, Object> out = new LinkedHashMap<>();
        String key = modelKey == null ? "" : modelKey;

        // 行内注释3.1：通用字段 —— 文生图 / 文生视频等标准链路沿用原有口径。
        putIfPresent(out, "prompt", p.get("prompt"));
        putIfPresent(out, "size", p.get("size"));
        putIfPresent(out, "resolution", p.get("resolution"));
        putIfPresent(out, "aspect_ratio", p.get("aspect_ratio"));
        putIfPresent(out, "duration", p.get("duration"));
        putIfPresent(out, "n", p.get("n"));
        putIfPresent(out, "background", p.get("background"));

        // 行内注释3.1.1.1：参考图（图生图）——
        //   前端槽位里选的参考图此前完全不提交，选了等于没选。
        //   上游 gpt-image-2 支持 reference_images（URL 数组，最多 14 张），
        //   这里把业务侧的 asset_id 列表翻译成真实可访问 URL。
        List<Object> refImages = referenceImages(userId, p);
        if (!refImages.isEmpty()) {
            out.put("reference_images", refImages);
        }

        // 行内注释3.1.1：技能包提示词合流 ——
        //   前端技能导航选的 skill_pack（character-face-turnaround 等）此前从未提交，
        //   技能选择等于死 UI。这里按 skill_pack 找到母版技能，把母版的
        //   prompt_template 套到用户提示词上（{user} 占位替换），
        //   上游收到的就是「专业模板 + 用户描述」的完整提示词。
        //   母版优先取后台 skill_packages 覆写表（运营改价改词即时生效），
        //   没有覆写则回落 Catalog 基线。
        applySkillTemplate(out, p);

        if (key.startsWith("video.process.")) {
            buildEnhance(out, p, userId);
        } else if (key.equals("video.erase.subtitle")) {
            buildSubtitleErase(out, p, userId);
        } else if (key.equals("video.erase.watermark")) {
            buildWatermarkErase(out, p, userId);
        } else if (key.startsWith("image-speak.")) {
            buildImageSpeak(out, p, userId, key);
        } else if (key.startsWith("lipsync.")) {
            buildLipsync(out, p, userId);
        } else if (key.startsWith("factory-video.")) {
            buildFactoryVideo(out, p, userId, key);
        } else if (key.startsWith("doubao-tts")) {
            buildTts(out, p);
        }

        // 行内注释3.1.1.4：通用音频角色 —— 文生视频页选了「添加声音」时，
        //   上游要的是 [{"audio_url":"...","role":"speaker"}]，
        //   此前这条链路只在 image-speak / lipsync 里生效，普通视频生成不带音频。
        if (!out.containsKey("audio_with_roles")) {
            List<Object> roles = audioRoles(userId, p);
            if (!roles.isEmpty()) {
                out.put("audio_with_roles", roles);
            }
        }

        applyDefaults(out, key);
        return out;
    }

    // ---------------- 画质增强 ----------------

    /** 画质增强 —— 输入视频按目标分辨率重绘，保留原内容与音频。 */
    private void buildEnhance(Map<String, Object> out, Map<String, Object> p, String userId) {
        String target = Rows.str(p, "target", "720P");
        out.put("video_url", assetUrl(userId, Rows.str(p, "video_asset_id", "")));
        out.put("prompt", "将输入视频的画质提升到 " + target
                + "，保持原有内容、构图、镜头运动与音频不变，输出清晰锐利、细节自然的画面。");
        out.put("resolution", target.toLowerCase());
        out.put("ratio", "adaptive");
        out.put("duration", -1);
    }

    // ---------------- 字幕擦除 ----------------

    /** 字幕擦除 —— 框选区域换算成自然语言描述（上游是无语言模型的视频编辑模型）。 */
    private void buildSubtitleErase(Map<String, Object> out, Map<String, Object> p, String userId) {
        out.put("video_url", assetUrl(userId, Rows.str(p, "video_asset_id", "")));
        out.put("prompt", "移除画面中的字幕/文字，并按周围画面自然补全，" + describeRegions(p) + "。");
        out.put("resolution", "720p");
        out.put("ratio", "adaptive");
        out.put("duration", -1);
    }

    /** 区域描述 —— 百分比坐标拼成「左上角 x%、y%，宽 w%、高 h%」。 */
    private String describeRegions(Map<String, Object> p) {
        List<Object> regions = Rows.list(p, "regions");
        if (regions.isEmpty()) {
            return "去除范围为整幅画面";
        }
        StringBuilder sb = new StringBuilder("去除范围：");
        for (Object item : regions) {
            if (!(item instanceof Map<?, ?> raw)) {
                continue;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> r = (Map<String, Object>) raw;
            sb.append("左上角 x=").append(Rows.num(r, "x")).append("%, y=").append(Rows.num(r, "y"))
                    .append("%，宽 ").append(Rows.num(r, "w")).append("%，高 ").append(Rows.num(r, "h"))
                    .append("%；");
        }
        return sb.toString();
    }

    // ---------------- 水印擦除 ----------------

    private void buildWatermarkErase(Map<String, Object> out, Map<String, Object> p, String userId) {
        out.put("video_url", assetUrl(userId, Rows.str(p, "video_asset_id", "")));
        out.put("prompt", "移除画面中的水印、台标与平台标识，自然修复被遮挡区域，"
                + "保持画面其余部分与音频不变。");
        out.put("resolution", "1080p");
        out.put("ratio", "adaptive");
        out.put("duration", -1);
    }

    // ---------------- 图片口播 ----------------

    /** 图片口播 —— 形象图作为参考图，音频驱动口型。 */
    private void buildImageSpeak(Map<String, Object> out, Map<String, Object> p, String userId, String key) {
        List<String> refs = new ArrayList<>();
        String avatarUrl = avatarUrl(userId, Rows.str(p, "avatar_id", ""));
        if (!avatarUrl.isBlank()) {
            refs.add(avatarUrl);
        }
        out.put("reference_images", refs);
        out.put("audio_with_roles", audioRoles(userId, p));
        out.put("prompt", speakPrompt(p));
        out.put("resolution", key.endsWith("light") ? "480p" : "720p");
        out.put("ratio", "adaptive");
        out.put("duration", -1);
    }

    // ---------------- 改口型 ----------------

    /** 改口型 —— 已有视频 + 音频，对齐口型。 */
    private void buildLipsync(Map<String, Object> out, Map<String, Object> p, String userId) {
        List<Object> videos = new ArrayList<>();
        String videoUrl = avatarUrl(userId, Rows.str(p, "avatar_id", ""));
        if (!videoUrl.isBlank()) {
            videos.add(Rows.row("video_url", videoUrl));
        }
        out.put("video_list", videos);
        out.put("audio_with_roles", audioRoles(userId, p));
        out.put("prompt", "保持人物身份、服装与场景不变，将人物口型与音频内容精确对齐。");
        out.put("ratio", "adaptive");
        out.put("duration", -1);
    }

    // ---------------- 厂家介绍视频 ----------------

    /** 厂家介绍视频 —— 形象 + 厂区素材作为参考图，脚本文案作为提示词。 */
    private void buildFactoryVideo(Map<String, Object> out, Map<String, Object> p, String userId, String key) {
        List<String> refs = new ArrayList<>();
        String avatarUrl = avatarUrl(userId, Rows.str(p, "avatar_id", ""));
        if (!avatarUrl.isBlank()) {
            refs.add(avatarUrl);
        }
        for (Object item : Rows.list(p, "site_asset_ids")) {
            String url = assetUrl(userId, String.valueOf(item));
            if (!url.isBlank()) {
                refs.add(url);
            }
        }
        out.put("reference_images", refs);
        String script = Rows.str(p, "script", "");
        if (script.isBlank()) {
            script = Rows.str(Rows.map(p, "variables"), "script", "");
        }
        out.put("prompt", "拍摄一段厂家介绍短视频：探厂与展厅实景、石材产品特写、"
                + "口播讲解结合运镜，整体风格专业真实。" + (script.isBlank() ? "" : "内容：" + script));
        out.put("resolution", key.endsWith("light") ? "480p" : "720p");
        out.put("ratio", "adaptive");
        out.put("duration", -1);
    }

    // ---------------- 语音合成 ----------------

    /** 语音合成 —— 文案 + 音色。 */
    private void buildTts(Map<String, Object> out, Map<String, Object> p) {
        out.put("text", Rows.str(p, "text", ""));
        out.put("voice", Rows.str(p, "voice_id", ""));
    }

    // ---------------- 通用辅助 ----------------

    /**
     * 技能包提示词合流 —— 把选中的 skill_pack 母版模板套到用户提示词上。
     *
     * <p>行内注释3.1.2：三层取值优先级 ——
     * 1) 后台 skill_packages 覆写表（运营在「技能包管理」改过的 prompt_template）；
     * 2) Catalog.IMAGE_SKILLS 基线母版；
     * 3) 都没有 → 不动 prompt（纯文生图，用户写什么就是什么）。
     *
     * <p>行内注释3.1.3：已套过模板的不再套 —— prompt 里带标记前缀时直接跳过，
     * 避免「重试任务」把模板套两遍（模板套模板会把用户描述埋进两层括号里）。
     */
    private void applySkillTemplate(Map<String, Object> out, Map<String, Object> p) {
        String skillPack = Rows.str(p, "skill_pack", "").trim();
        if (skillPack.isEmpty()) {
            return;
        }
        String prompt = Rows.str(out, "prompt", "");
        if (prompt.startsWith(SKILL_PREFIX)) {
            return;
        }
        String masterKey = Catalog.IMAGE_SKILL_PACK_MASTER.get(skillPack);
        if (masterKey == null) {
            // 行内注释3.1.5：视频技能 —— 没有提示词母版，但有创作方向描述。
            //   同样地，前端视频页选了技能（ecommerce-spoken-selling 等）此前不提交，
            //   这里把技能描述作为创作方向拼进 prompt，让技能选择真正影响出片。
            String direction = videoSkillDirection(skillPack);
            if (!direction.isBlank() && !prompt.isBlank()) {
                out.put("prompt", SKILL_PREFIX + direction + " " + prompt);
            }
            return;
        }
        String template = skillTemplate(masterKey);
        if (template.isBlank()) {
            return;
        }
        String userText = prompt;
        if (template.contains("{user}")) {
            template = template.replace("{user}", userText);
        } else if (!userText.isBlank()) {
            template = template + " Subject: " + userText;
        }
        out.put("prompt", SKILL_PREFIX + template);
    }

    /**
     * 参考图 URL 列表 —— 从 ref_asset_ids / ref_image_asset_ids 里取资产真实地址。
     *
     * <p>行内注释3.1.1.2：三个来源字段都兼容 ——
     * 图片生成页用 ref_asset_ids，深度克隆/口播链路用 ref_image_asset_ids，
     * 视频创作者用 ref_image_ids（那边已在 VideoToolService 转成 ref_image_asset_ids）。
     * 资产不存在或不属于该用户时直接跳过 —— 不能把别人的素材地址泄露给上游。
     */
    private List<Object> referenceImages(String userId, Map<String, Object> p) {
        List<String> ids = new ArrayList<>();
        ids.addAll(Rows.list(p, "ref_asset_ids").stream().map(String::valueOf).toList());
        ids.addAll(Rows.list(p, "ref_image_asset_ids").stream().map(String::valueOf).toList());
        List<Object> urls = new ArrayList<>();
        for (String id : ids) {
            if (id.isBlank() || "null".equals(id)) {
                continue;
            }
            String url = assetUrl(userId, id);
            if (!url.isBlank()) {
                urls.add(url);
            }
            // 行内注释3.1.1.3：上游最多收 14 张参考图，超出会 400。
            if (urls.size() >= 14) {
                break;
            }
        }
        return urls;
    }

    /** 技能模板取值 —— 后台覆写优先，基线回落。 */
    private String skillTemplate(String masterKey) {
        List<Map<String, Object>> overrides = store.listWhere("skill_packages", r -> true);
        for (Map<String, Object> o : overrides) {
            if (Rows.strEq(o, "id", masterKey)) {
                return Rows.str(o, "prompt_template", "");
            }
        }
        for (Map<String, Object> s : Catalog.IMAGE_SKILLS) {
            if (Rows.strEq(s, "key", masterKey)) {
                return Rows.str(s, "prompt_template", "");
            }
        }
        return "";
    }

    /**
     * 视频技能创作方向 —— 取 Catalog.VIDEO_SKILLS 的 description。
     * 行内注释3.1.6：视频技能没有 prompt 母版（上游是无语言模型的视频模型，
     *   提示词只做方向约束），用技能的描述文本作为方向前缀是够用且诚实的做法。
     */
    private String videoSkillDirection(String skillPack) {
        for (Map<String, Object> s : Catalog.VIDEO_SKILLS) {
            if (Rows.strEq(s, "key", skillPack)) {
                return Rows.str(s, "description", "");
            }
        }
        return "";
    }

    /** 口播文案 —— 优先 script，其次 tts_text。 */
    private String speakPrompt(Map<String, Object> p) {
        String script = Rows.str(p, "script", "");
        if (script.isBlank()) {
            script = Rows.str(p, "tts_text", "");
        }
        return script.isBlank()
                ? "人物正对镜头，自然口播，吐字清晰，肢体与表情自然。"
                : "人物正对镜头自然口播，口播内容：" + script;
    }

    /** 音频角色列表 —— 上游要 [{"audio_url":"...","role":"speaker"}] 这种结构。 */
    private List<Object> audioRoles(String userId, Map<String, Object> p) {
        List<Object> out = new ArrayList<>();
        String url = assetUrl(userId, Rows.str(p, "audio_asset_id", ""));
        if (!url.isBlank()) {
            out.add(Rows.row("audio_url", url, "role", "speaker"));
        }
        return out;
    }

    /** 资产真实地址 —— 找不到返回空串（调用方据此判断是否带参考素材）。 */
    public String assetUrl(String userId, String assetId) {
        if (assetId == null || assetId.isBlank()) {
            return "";
        }
        Map<String, Object> a = store.find(AssetService.T_ASSETS, assetId).orElse(null);
        if (a == null) {
            return "";
        }
        if (userId != null && !userId.isBlank() && !userId.equals(Rows.str(a, "user_id", userId))) {
            return "";
        }
        return Rows.str(a, "url", "");
    }

    /** 形象地址 —— 形象记录里已存真实素材 URL。 */
    public String avatarUrl(String userId, String avatarId) {
        if (avatarId == null || avatarId.isBlank()) {
            return "";
        }
        Map<String, Object> a = store.find(DigitalHumanService.T_AVATARS, avatarId).orElse(null);
        if (a == null) {
            return "";
        }
        if (userId != null && !userId.isBlank() && !userId.equals(Rows.str(a, "user_id", userId))) {
            return "";
        }
        return Rows.str(a, "url", "");
    }

    /** 有值才放。 */
    private void putIfPresent(Map<String, Object> out, String key, Object value) {
        if (value == null) {
            return;
        }
        if (value instanceof String s && s.isBlank()) {
            return;
        }
        out.put(key, value);
    }

    /**
     * 默认值兜底 —— 与原 TaskExecutor.mapParams 口径一致。
     * 行内注释4：分辨率/时长/比例由 model_key 推断，前端不传也能跑。
     */
    private void applyDefaults(Map<String, Object> out, String modelKey) {
        if (!out.containsKey("resolution")) {
            if (modelKey.endsWith("4k")) {
                out.put("resolution", "4k");
            } else if (modelKey.endsWith("2k")) {
                out.put("resolution", "2k");
            } else if (modelKey.contains("video")) {
                out.put("resolution", "720p");
                out.putIfAbsent("duration", 5);
                out.putIfAbsent("aspect_ratio", "16:9");
            } else {
                out.put("resolution", "1k");
            }
        }
        out.putIfAbsent("size", "1:1");
        out.putIfAbsent("n", 1);
    }
}
