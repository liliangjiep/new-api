package com.xin.ai.domain.service;

import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.domain.catalog.Catalog;
import com.xin.ai.domain.repository.MemStore;
import com.xin.ai.domain.repository.Rows;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * 视频工具链服务：深度克隆 / 商详套图 / 混剪 / 画质增强 / 字幕擦除 / 水印去除 / 视频创作者。
 * 行内注释1：这些工具最终都收敛到统一任务链（tasks.submit），本服务负责「业务语义校验 + 参数组装」。
 * 行内注释2：校验规则来自接口文档 §2.10 —— erase 必须带 regions，creator 必须带 skill_pack 且 ref 计数不超过 refSlots。
 * 行内注释3：石材效果任务带 material_desc 指纹（材质锚定），保证多视角一致性。
 */
@Service
public class VideoToolService {

    public static final String T_STONE_MATERIALS = "stone_materials";
    public static final String T_STONE_REFINES = "stone_refine_queue";
    public static final String T_EC_ITEMS = "ecommerce_set_items";

    private final MemStore store;
    private final TaskOrchestrator tasks;
    private final BillingService billing;

    public VideoToolService(MemStore store, TaskOrchestrator tasks, BillingService billing) {
        this.store = store;
        this.tasks = tasks;
        this.billing = billing;
    }

    // ---------------- 深度克隆 ----------------

    // 行内注释4：深度克隆 —— 三种模式：depth（景深）/ storyboard（分镜）/ element-replace（元素替换）。
    public Map<String, Object> depthClone(String userId, String mode, String refVideoAssetId,
            List<String> refImageAssetIds, String prompt, String model, String spec) {
        String m = mode == null || mode.isBlank() ? "depth" : mode;
        if (!List.of("depth", "storyboard", "element-replace").contains(m)) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "mode 不支持", "mode", m));
        }
        if (refVideoAssetId == null || refVideoAssetId.isBlank()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "必须提供参考视频"));
        }
        String modelKey = switch (m) {
            case "depth" -> "video.t2v.720p";
            case "storyboard" -> "video.batch.480p";
            default -> "video.t2v.720p";
        };
        Map<String, Object> params = Rows.row(
                "mode", m, "ref_video_asset_id", refVideoAssetId,
                "ref_image_asset_ids", refImageAssetIds == null ? List.of() : refImageAssetIds,
                "prompt", prompt == null ? "" : prompt,
                "model", model == null ? "" : model);
        return submitTool(userId, modelKey, spec, params, "深度克隆");
    }

    // ---------------- 商详套图 ----------------

    // 行内注释5：商详套图 —— 一次提交生成 6 张套图，单张可重生成。
    public Map<String, Object> ecommerceSet(String userId, List<String> productAssetIds, String lang,
            String ratio, String model, String resolution, String format) {
        if (productAssetIds == null || productAssetIds.isEmpty()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "至少需要一个商品图"));
        }
        List<Map<String, Object>> items = new java.util.ArrayList<>();
        String modelKey = "image.t2i.2k";
        Map<String, Object> quote = billing.quote(userId, modelKey, "2K", 6, Rows.row(
                "lang", lang, "ratio", ratio, "model", model, "resolution", resolution, "format", format));
        for (int i = 0; i < 6; i++) {
            Map<String, Object> params = Rows.row(
                    "product_asset_ids", productAssetIds, "lang", lang, "ratio", ratio,
                    "model", model, "resolution", resolution, "format", format,
                    "index", i + 1, "title", "商详套图 " + (i + 1) + "/6");
            items.add(Rows.row(
                    "model_key", modelKey, "spec", "2K", "count", 1, "params", params,
                    "quote_fingerprint", Rows.str(quote, "fingerprint"),
                    "idempotency_key", "ecs_" + UUID.randomUUID().toString().replace("-", "")));
        }
        Map<String, Object> batch = tasks.submitBatch(userId, items);
        store.put(T_EC_ITEMS, Rows.str(batch, "id"), Rows.row(
                "id", Rows.str(batch, "id"), "user_id", userId,
                "product_asset_ids", productAssetIds,
                "lang", lang, "ratio", ratio, "model", model,
                "resolution", resolution, "format", format,
                "created_at", Times.full(Times.now())));
        return batch;
    }

    // 行内注释6：单张重生成 —— 只重跑批次内一个 item，报价按 1 张计。
    public Map<String, Object> regenerateEcommerceItem(String userId, String batchId, String taskId) {
        Map<String, Object> batch = store.find(T_EC_ITEMS, batchId).orElse(null);
        if (batch == null || !Rows.str(batch, "user_id").equals(userId)) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        Map<String, Object> quote = billing.quote(userId, "image.t2i.2k", "2K", 1, Rows.row("batch_id", batchId));
        Map<String, Object> params = Rows.row(
                "batch_id", batchId, "lang", Rows.str(batch, "lang", ""),
                "ratio", Rows.str(batch, "ratio", ""), "model", Rows.str(batch, "model", ""),
                "resolution", Rows.str(batch, "resolution", ""), "format", Rows.str(batch, "format", ""),
                "title", "商详套图重生成");
        return tasks.submit(userId, "image.t2i.2k", "2K", 1, params,
                Rows.str(quote, "fingerprint"), "ecr_" + UUID.randomUUID().toString().replace("-", ""));
    }

    // ---------------- 混剪 ----------------

    public Map<String, Object> videoRemix(String userId, String sourceVideoAssetId, String strategy, boolean viral) {
        if (sourceVideoAssetId == null || sourceVideoAssetId.isBlank()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "必须提供源视频"));
        }
        String modelKey = viral ? "video.i2v.kling" : "video.t2v.720p";
        Map<String, Object> params = Rows.row(
                "source_video_asset_id", sourceVideoAssetId,
                "strategy", strategy == null ? "" : strategy,
                "viral", viral,
                "title", viral ? "爆款混剪" : "视频混剪");
        return submitTool(userId, modelKey, null, params, viral ? "爆款混剪" : "视频混剪");
    }

    // ---------------- 画质增强 / 字幕擦除 / 水印去除 ----------------

    public Map<String, Object> qualityEnhance(String userId, String videoAssetId, String target) {
        if (videoAssetId == null || videoAssetId.isBlank()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "必须提供视频"));
        }
        Map<String, Object> params = Rows.row(
                "video_asset_id", videoAssetId, "target", target == null ? "720P" : target,
                "title", "画质增强");
        return submitTool(userId, "video.process.enhance", null, params, "画质增强");
    }

    // 行内注释7：字幕擦除 —— regions 必填（框选区域），每个区域含 x/y/w/h。
    public Map<String, Object> subtitleErase(String userId, String videoAssetId, List<Map<String, Object>> regions) {
        if (videoAssetId == null || videoAssetId.isBlank()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "必须提供视频"));
        }
        if (regions == null || regions.isEmpty()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "必须框选要擦除的区域"));
        }
        for (Map<String, Object> r : regions) {
            if (Rows.num(r, "w") <= 0 || Rows.num(r, "h") <= 0) {
                throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "区域宽高必须大于 0"));
            }
        }
        Map<String, Object> params = Rows.row(
                "video_asset_id", videoAssetId, "regions", regions, "title", "字幕擦除");
        return submitTool(userId, "video.erase.subtitle", null, params, "字幕擦除");
    }

    public Map<String, Object> watermarkRemove(String userId, String videoAssetId) {
        if (videoAssetId == null || videoAssetId.isBlank()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "必须提供视频"));
        }
        Map<String, Object> params = Rows.row("video_asset_id", videoAssetId, "title", "水印擦除");
        return submitTool(userId, "video.erase.watermark", null, params, "水印擦除");
    }

    // ---------------- 视频创作者 ----------------

    // 行内注释8：视频创作者 —— skill_pack 必填，且各类 ref 数量不得超过技能定义的 refSlots。
    public Map<String, Object> videoCreator(String userId, String skillPack, List<String> refImageIds,
            List<String> refVideoIds, List<String> refAudioIds, String prompt, String model, String spec) {
        if (skillPack == null || skillPack.isBlank()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "必须选择技能包"));
        }
        Map<String, Object> skill = Catalog.VIDEO_SKILLS.stream()
                .filter(s -> Rows.str(s, "key").equals(skillPack)).findFirst().orElse(null);
        if (skill == null) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "技能包不存在", "skill_pack", skillPack));
        }
        Map<String, Object> slots = Rows.map(skill, "ref_slots");
        int maxImages = Rows.num(slots, "images");
        int maxVideos = Rows.num(slots, "videos");
        int maxAudios = Rows.num(slots, "audios");
        int imageCount = refImageIds == null ? 0 : refImageIds.size();
        int videoCount = refVideoIds == null ? 0 : refVideoIds.size();
        int audioCount = refAudioIds == null ? 0 : refAudioIds.size();
        if (imageCount > maxImages || videoCount > maxVideos || audioCount > maxAudios) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Rows.row(
                    "message", "参考素材数量超出技能包上限",
                    "max_images", maxImages, "max_videos", maxVideos, "max_audios", maxAudios));
        }
        Map<String, Object> params = Rows.row(
                "skill_pack", skillPack,
                "ref_image_ids", refImageIds == null ? List.of() : refImageIds,
                "ref_video_ids", refVideoIds == null ? List.of() : refVideoIds,
                "ref_audio_ids", refAudioIds == null ? List.of() : refAudioIds,
                "prompt", prompt == null ? "" : prompt,
                "model", model == null ? "" : model,
                "title", Rows.str(skill, "label"));
        return submitTool(userId, "video.t2v.720p", spec, params, "视频创作");
    }

    // ---------------- 石材 ----------------

    // 行内注释9：石材场景模板 —— 14 类，含 lighting 与 prompt 模板。
    public List<Map<String, Object>> sceneTemplates() {
        return Catalog.STONE_SCENE_TEMPLATES;
    }

    // 行内注释10：石材效果图 —— 生成 material_desc 指纹，保证多视角一致。
    public Map<String, Object> stoneEffect(String userId, String materialAssetId, String mainColor,
            String textureDesc, String sceneKey, String lighting, String resolution, List<String> views) {
        if (materialAssetId == null || materialAssetId.isBlank()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "必须提供材质图"));
        }
        if (sceneKey == null || sceneKey.isBlank()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "必须选择场景模板"));
        }
        Map<String, Object> template = Catalog.STONE_SCENE_TEMPLATES.stream()
                .filter(t -> Rows.str(t, "key").equals(sceneKey)).findFirst().orElse(null);
        if (template == null) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "场景模板不存在", "scene_key", sceneKey));
        }
        List<String> viewList = views == null || views.isEmpty() ? List.of("正面") : views;
        String materialDesc = buildMaterialDesc(mainColor, textureDesc);
        String prompt = Rows.str(template, "prompt").replace("{material_desc}", materialDesc);
        String modelKey = "4K".equalsIgnoreCase(resolution) ? "stone.effect.4k" : "stone.effect.2k";
        Map<String, Object> params = Rows.row(
                "material_asset_id", materialAssetId,
                "main_color", mainColor == null ? "" : mainColor,
                "texture_desc", textureDesc == null ? "" : textureDesc,
                "material_desc", materialDesc,
                "scene_key", sceneKey, "lighting", lighting == null ? "" : lighting,
                "resolution", resolution == null ? "2k" : resolution,
                "views", viewList, "prompt", prompt,
                "title", "石材效果图 · " + Rows.str(template, "label"));
        return submitTool(userId, modelKey, null, params, "石材效果图");
    }

    // 行内注释11：材质描述拼接 —— 主色 + 纹理 + 连续纹路描述，形成锚定指纹。
    private String buildMaterialDesc(String mainColor, String textureDesc) {
        StringBuilder sb = new StringBuilder();
        sb.append(mainColor == null || mainColor.isBlank() ? "neutral grey" : mainColor.trim());
        sb.append(" stone with continuous large organic bookmatched veins");
        if (textureDesc != null && !textureDesc.isBlank()) {
            sb.append(", ").append(textureDesc.trim());
        }
        sb.append(", mineral clouding, polished finish, micro surface variation");
        return sb.toString();
    }

    // 行内注释12：精修队列 —— 色差超阈值需重生，重试失败转人工。
    public Map<String, Object> refineStone(String userId, String jobId, String note) {
        Map<String, Object> job = store.find(TaskOrchestrator.T_TASKS, jobId).orElse(null);
        if (job == null || !Rows.str(job, "user_id").equals(userId)) {
            throw new BizException(ErrorCode.TASK_NOT_FOUND);
        }
        String id = "ref_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        store.put(T_STONE_REFINES, id, Rows.row(
                "id", id, "user_id", userId, "job_id", jobId,
                "note", note == null ? "" : note, "status", "pending",
                "created_at", Times.full(Times.now())));
        return Rows.row("id", id, "job_id", jobId, "status", "pending");
    }

    // 行内注释13：材质库 —— 增删改查 + 标签检索 + 导出打包。
    public List<Map<String, Object>> listMaterials(String userId, String tags, String query, int page, int pageSize) {
        List<Map<String, Object>> all = store.listWhere(T_STONE_MATERIALS, r -> true).stream()
                .filter(r -> tags == null || tags.isBlank() || Rows.list(r, "tags").stream().anyMatch(t -> tags.contains(String.valueOf(t))))
                .filter(r -> query == null || query.isBlank() || Rows.str(r, "name", "").contains(query))
                .toList();
        int from = Math.min((page - 1) * pageSize, all.size());
        int to = Math.min(from + pageSize, all.size());
        return all.subList(from, to).stream().map(m -> Rows.row(
                "id", Rows.str(m, "id"),
                "name", Rows.str(m, "name", ""),
                "asset_id", Rows.str(m, "asset_id", ""),
                "tags", Rows.list(m, "tags"),
                "attrs", Rows.map(m, "attrs"),
                "created_at", Rows.str(m, "created_at"))).toList();
    }

    public Map<String, Object> createMaterial(String userId, String assetId, String name,
            List<String> tags, Map<String, Object> attrs) {
        String id = "stm_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        store.put(T_STONE_MATERIALS, id, Rows.row(
                "id", id, "user_id", userId, "asset_id", assetId,
                "name", name == null || name.isBlank() ? "未命名材质" : name.trim(),
                "tags", tags == null ? List.of() : tags,
                "attrs", attrs == null ? Map.of() : attrs,
                "created_at", Times.full(Times.now())));
        return Rows.row("id", id, "name", name, "tags", tags, "attrs", attrs);
    }

    public Map<String, Object> updateMaterial(String userId, String id, String name,
            List<String> tags, Map<String, Object> attrs) {
        Map<String, Object> patch = Rows.row();
        if (name != null && !name.isBlank()) {
            patch.put("name", name.trim());
        }
        if (tags != null) {
            patch.put("tags", tags);
        }
        if (attrs != null) {
            patch.put("attrs", attrs);
        }
        Map<String, Object> updated = store.update(T_STONE_MATERIALS, id, patch).orElse(null);
        if (updated == null) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        return updated;
    }

    public void deleteMaterial(String userId, String id) {
        Map<String, Object> m = store.find(T_STONE_MATERIALS, id).orElse(null);
        if (m == null || !Rows.str(m, "user_id").equals(userId)) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        store.delete(T_STONE_MATERIALS, id);
    }

    // 行内注释14：导出打包 —— 返回临时下载地址（实际由对象存储生成预签名）。
    public Map<String, Object> exportMaterials(List<String> ids) {
        return Rows.row("download_url", "https://cdn.local.invalid/exports/materials-"
                + System.currentTimeMillis() + ".zip", "count", ids == null ? 0 : ids.size());
    }

    // 行内注释15：厂家介绍视频 —— 口播秒数按 script.length/4 估算（中文约 4 字/秒）。
    public Map<String, Object> factoryVideo(String userId, String avatarId, List<String> siteAssetIds,
            String templateId, Map<String, Object> variables, String spec) {
        Map<String, Object> avatar = store.find(DigitalHumanService.T_AVATARS, avatarId).orElse(null);
        if (avatar == null || !Rows.str(avatar, "user_id").equals(userId)) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND, Map.of("message", "数字人形象不存在"));
        }
        if (!Rows.bool(avatar, "standardized")) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "形象未标准化，无法提交"));
        }
        if (siteAssetIds == null || siteAssetIds.isEmpty()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "至少需要一个厂区素材"));
        }
        if (templateId == null || templateId.isBlank()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "必须选择脚本模板"));
        }
        String script = variables == null ? "" : Rows.str(variables, "script", "");
        int seconds = Math.max(1, script.length() / 4);
        String modelKey = "轻量版".equals(spec) ? "factory-video.60s.light" : "factory-video.60s";
        Map<String, Object> params = Rows.row(
                "avatar_id", avatarId, "site_asset_ids", siteAssetIds,
                "template_id", templateId, "variables", variables == null ? Map.of() : variables,
                "script_length", script.length(), "estimated_seconds", seconds,
                "title", "厂家介绍视频");
        return submitTool(userId, modelKey, null, params, "厂家介绍视频");
    }

    // ---------------- 通用工具提交 ----------------

    // 行内注释16：工具提交统一走「先报价再提交」，避免绕开计费。
    private Map<String, Object> submitTool(String userId, String modelKey, String spec,
            Map<String, Object> params, String title) {
        Map<String, Object> quote = billing.quote(userId, modelKey, spec, 1, params);
        return tasks.submit(userId, modelKey, spec, 1, params,
                Rows.str(quote, "fingerprint"), UUID.randomUUID().toString());
    }
}
