package com.xin.ai.domain.service;

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
