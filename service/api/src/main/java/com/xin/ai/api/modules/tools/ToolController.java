package com.xin.ai.api.modules.tools;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.dto.PageResult;
import com.xin.ai.common.security.AuthContext;
import com.xin.ai.common.security.CurrentUser;
import com.xin.ai.domain.service.VideoToolService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 视频工具链与石材接口（文档 §2.9、§2.10）。
 * 行内注释1：所有提交都先报价再进入统一任务链，保证计费一致。
 * 行内注释2：业务语义校验保留 —— erase 必带 regions，creator 必带 skill_pack，effect 必带材质锚定。
 */
@RestController
@RequestMapping("/api/v1")
public class ToolController extends BaseController {

    private final VideoToolService tools;

    public ToolController(VideoToolService tools) {
        this.tools = tools;
    }

    // ---------------- 视频工具链 ----------------

    /** 深度克隆。 */
    @PostMapping("/depth-clone/jobs")
    public ApiResponse<Map<String, Object>> depthClone(@CurrentUser AuthContext.Principal user,
            @RequestBody DepthCloneRequest req) {
        return ok(tools.depthClone(user.userId(), req.mode(), req.refVideoAssetId(),
                req.refImageAssetIds(), req.prompt(), req.model(), req.spec()));
    }

    /** 商详套图 —— 一次生成 6 张。 */
    @PostMapping("/ecommerce-set/jobs")
    public ApiResponse<Map<String, Object>> ecommerceSet(@CurrentUser AuthContext.Principal user,
            @RequestBody EcommerceSetRequest req) {
        return ok(tools.ecommerceSet(user.userId(), req.productAssetIds(), req.lang(), req.ratio(),
                req.model(), req.resolution(), req.format()));
    }

    /** 单张重生成。 */
    @PostMapping("/ecommerce-set/items/{taskId}/regenerate")
    public ApiResponse<Map<String, Object>> regenerate(@CurrentUser AuthContext.Principal user,
            @PathVariable String taskId, @RequestParam String batchId) {
        return ok(tools.regenerateEcommerceItem(user.userId(), batchId, taskId));
    }

    /** 视频混剪。 */
    @PostMapping("/video-remix/jobs")
    public ApiResponse<Map<String, Object>> remix(@CurrentUser AuthContext.Principal user,
            @RequestBody RemixRequest req) {
        return ok(tools.videoRemix(user.userId(), req.sourceVideoAssetId(), req.strategy(), false));
    }

    /** 爆款混剪。 */
    @PostMapping("/video-remix-viral/jobs")
    public ApiResponse<Map<String, Object>> viralRemix(@CurrentUser AuthContext.Principal user,
            @RequestBody RemixRequest req) {
        return ok(tools.videoRemix(user.userId(), req.sourceVideoAssetId(), req.strategy(), true));
    }

    /** 画质增强。 */
    @PostMapping("/video-quality-enhance/jobs")
    public ApiResponse<Map<String, Object>> qualityEnhance(@CurrentUser AuthContext.Principal user,
            @RequestBody EnhanceRequest req) {
        return ok(tools.qualityEnhance(user.userId(), req.videoAssetId(), req.target()));
    }

    /** 字幕擦除 —— regions 必填。 */
    @PostMapping("/video-subtitle-erase/jobs")
    public ApiResponse<Map<String, Object>> subtitleErase(@CurrentUser AuthContext.Principal user,
            @RequestBody EraseRequest req) {
        return ok(tools.subtitleErase(user.userId(), req.videoAssetId(), req.regions()));
    }

    /** 水印擦除。 */
    @PostMapping("/video-watermark-remove/jobs")
    public ApiResponse<Map<String, Object>> watermarkRemove(@CurrentUser AuthContext.Principal user,
            @RequestBody SimpleVideoRequest req) {
        return ok(tools.watermarkRemove(user.userId(), req.videoAssetId()));
    }

    /** 视频创作者 —— skill_pack 与 ref 槽位校验。 */
    @PostMapping("/video-creator/jobs")
    public ApiResponse<Map<String, Object>> videoCreator(@CurrentUser AuthContext.Principal user,
            @RequestBody CreatorRequest req) {
        return ok(tools.videoCreator(user.userId(), req.skillPack(), req.refImageIds(),
                req.refVideoIds(), req.refAudioIds(), req.prompt(), req.model(), req.spec()));
    }

    // ---------------- 石材 ----------------

    /** 石材场景模板（14 类）。 */
    @GetMapping("/stone/scene-templates")
    public ApiResponse<List<Map<String, Object>>> sceneTemplates() {
        return list(tools.sceneTemplates());
    }

    /** 石材效果图任务。 */
    @PostMapping("/stone/effect-jobs")
    public ApiResponse<Map<String, Object>> stoneEffect(@CurrentUser AuthContext.Principal user,
            @RequestBody StoneEffectRequest req) {
        return ok(tools.stoneEffect(user.userId(), req.materialAssetId(), req.mainColor(),
                req.textureDesc(), req.sceneKey(), req.lighting(), req.resolution(), req.views()));
    }

    /** 精修队列。 */
    @PostMapping("/stone/refine-queue")
    public ApiResponse<Map<String, Object>> refine(@CurrentUser AuthContext.Principal user,
            @RequestBody RefineRequest req) {
        return ok(tools.refineStone(user.userId(), req.jobId(), req.note()));
    }

    /** 材质库列表。 */
    @GetMapping("/stone/materials")
    public ApiResponse<PageResult<Map<String, Object>>> materials(@CurrentUser AuthContext.Principal user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String tags,
            @RequestParam(required = false) String query) {
        int size = Math.min(Math.max(pageSize, 1), 100);
        int p = Math.max(page, 1);
        List<Map<String, Object>> items = tools.listMaterials(user.userId(), tags, query, p, size);
        return page(items, p, size, items.size());
    }

    @PostMapping("/stone/materials")
    public ApiResponse<Map<String, Object>> createMaterial(@CurrentUser AuthContext.Principal user,
            @RequestBody MaterialRequest req) {
        return ok(tools.createMaterial(user.userId(), req.assetId(), req.name(), req.tags(), req.attrs()));
    }

    @PatchMapping("/stone/materials/{id}")
    public ApiResponse<Map<String, Object>> updateMaterial(@CurrentUser AuthContext.Principal user,
            @PathVariable String id, @RequestBody MaterialRequest req) {
        return ok(tools.updateMaterial(user.userId(), id, req.name(), req.tags(), req.attrs()));
    }

    @DeleteMapping("/stone/materials/{id}")
    public ApiResponse<Void> deleteMaterial(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        tools.deleteMaterial(user.userId(), id);
        return ok();
    }

    /** 材质导出打包。 */
    @PostMapping("/stone/materials/export")
    public ApiResponse<Map<String, Object>> exportMaterials(@RequestBody ExportRequest req) {
        return ok(tools.exportMaterials(req.ids()));
    }

    /** 脚本模板。 */
    @GetMapping("/stone/script-templates")
    public ApiResponse<List<Map<String, Object>>> scriptTemplates() {
        return list(List.of(
                Map.of("id", "tpl_factory_std", "label", "标准厂家介绍",
                        "body", "欢迎来到我们的石材展厅，这里可以看到花岗岩、大理石等多个系列的天然石材产品……"),
                Map.of("id", "tpl_factory_light", "label", "轻量厂家介绍",
                        "body", "一分钟带您看完我们的石材加工厂，从选料到开料，全程自有产线……"),
                Map.of("id", "tpl_factory_tech", "label", "工艺讲解版",
                        "body", "这块板材经过五道打磨工序，表面呈现自然的哑光质感，同时具备优异的耐刮性能……")));
    }

    /** 厂家介绍视频任务。 */
    @PostMapping("/stone/factory-video-jobs")
    public ApiResponse<Map<String, Object>> factoryVideo(@CurrentUser AuthContext.Principal user,
            @RequestBody FactoryVideoRequest req) {
        return ok(tools.factoryVideo(user.userId(), req.avatarId(), req.siteAssetIds(),
                req.templateId(), req.variables(), req.spec()));
    }

    // ---------------- 请求体 ----------------

    public record DepthCloneRequest(String mode, String refVideoAssetId, List<String> refImageAssetIds,
            String prompt, String model, String spec) {}

    public record EcommerceSetRequest(List<String> productAssetIds, String lang, String ratio,
            String model, String resolution, String format) {}

    public record RemixRequest(String sourceVideoAssetId, String strategy) {}

    public record EnhanceRequest(String videoAssetId, String target) {}

    public record EraseRequest(String videoAssetId, List<Map<String, Object>> regions) {}

    public record SimpleVideoRequest(String videoAssetId) {}

    public record CreatorRequest(String skillPack, List<String> refImageIds, List<String> refVideoIds,
            List<String> refAudioIds, String prompt, String model, String spec) {}

    public record StoneEffectRequest(String materialAssetId, String mainColor, String textureDesc,
            String sceneKey, String lighting, String resolution, List<String> views) {}

    public record RefineRequest(String jobId, String note) {}

    public record MaterialRequest(String assetId, String name, List<String> tags, Map<String, Object> attrs) {}

    public record ExportRequest(List<String> ids) {}

    public record FactoryVideoRequest(String avatarId, List<String> siteAssetIds, String templateId,
            Map<String, Object> variables, String spec) {}
}
