package com.xin.ai.api.modules.publicapi;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.domain.catalog.Catalog;
import com.xin.ai.domain.service.BillingService;
import com.xin.ai.domain.service.RechargeService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 公开静态接口（文档 §2.5）：模型路由 / 定价表 / 图片技能 / 视频技能 / 充值套餐。
 * 行内注释1：全部走 SecurityConfig 的 PUBLIC_PATHS 白名单，无需登录。
 * 行内注释2：内容与前端 domain.ts 常量一一对应，字段名 snake_case。
 */
@RestController
@RequestMapping("/api/v1")
public class PublicApiController extends BaseController {

    private final BillingService billing;
    private final RechargeService recharge;

    public PublicApiController(BillingService billing, RechargeService recharge) {
        this.billing = billing;
        this.recharge = recharge;
    }

    /** 模型路由公开表 —— 前端 /model-routes/public。 */
    @GetMapping("/model-routes/public")
    public ApiResponse<List<Map<String, Object>>> modelRoutes() {
        return list(Catalog.MODEL_ROUTES);
    }

    /** 能力域公开表 —— 前端工具箱的分组渲染。 */
    @GetMapping("/capabilities/public")
    public ApiResponse<List<Map<String, Object>>> capabilities() {
        return list(Catalog.CAPABILITIES);
    }

    /** 售价积分表 —— 前端 /pricing/table（19 项）。 */
    @GetMapping("/pricing/table")
    public ApiResponse<List<Map<String, Object>>> pricing() {
        return list(billing.pricingTable());
    }

    /** 图片技能包 —— 前端 /skills/image（11 项，含提示词模板）。 */
    @GetMapping("/skills/image")
    public ApiResponse<List<Map<String, Object>>> imageSkills() {
        return list(Catalog.IMAGE_SKILLS.stream().map(s -> Map.of(
                "key", s.get("key"),
                "label", s.get("label"),
                "description", s.get("description"),
                "prompt_template", s.get("prompt_template"))).toList());
    }

    /** 视频技能包 —— 前端 /skills/video（19 项，含参考素材槽位）。 */
    @GetMapping("/skills/video")
    public ApiResponse<List<Map<String, Object>>> videoSkills() {
        return list(Catalog.VIDEO_SKILLS.stream().map(s -> Map.of(
                "key", s.get("key"),
                "label", s.get("label"),
                "category", s.get("category"),
                "description", s.get("description"),
                "ref_slots", s.get("ref_slots"))).toList());
    }

    /** 视频技能分类 —— 前端 VIDEO_SKILL_CATEGORIES。 */
    @GetMapping("/skills/video/categories")
    public ApiResponse<List<Map<String, Object>>> videoSkillCategories() {
        return list(Catalog.VIDEO_SKILL_CATEGORIES);
    }

    /** 充值套餐公开表 —— 前端 /recharge/packages（6 档）。 */
    @GetMapping("/recharge/packages")
    public ApiResponse<List<Map<String, Object>>> rechargePackages() {
        return list(recharge.packages());
    }
}
