package com.xin.ai.api.modules.admin;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.dto.PageResult;
import com.xin.ai.common.security.AuthContext;
import com.xin.ai.common.security.CurrentUser;
import com.xin.ai.domain.service.AdminService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台接口（文档 §2.12，20 组）。
 * 行内注释1：所有写操作经 AdminService 落审计日志；操作人取当前登录用户。
 * 行内注释2：改价有毛利护栏，大额积分调整需二次确认。
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminController extends BaseController {

    private final AdminService admin;

    public AdminController(AdminService admin) {
        this.admin = admin;
    }

    // ---------------- 用户管理 ----------------

    @GetMapping("/users")
    public ApiResponse<PageResult<Map<String, Object>>> users(@RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status) {
        int size = Math.min(Math.max(pageSize, 1), 100);
        int p = Math.max(page, 1);
        List<Map<String, Object>> items = admin.listUsers(q, status, p, size);
        return page(items, p, size, admin.countUsers(q, status));
    }

    @GetMapping("/users/{id}")
    public ApiResponse<Map<String, Object>> userDetail(@PathVariable String id) {
        return ok(admin.userDetail(id));
    }

    @PostMapping("/users/{id}/ban")
    public ApiResponse<Void> ban(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        admin.banUser(user.userId(), id, true);
        return ok();
    }

    @PostMapping("/users/{id}/unban")
    public ApiResponse<Void> unban(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        admin.banUser(user.userId(), id, false);
        return ok();
    }

    @PostMapping("/users/{id}/force-logout")
    public ApiResponse<Void> forceLogout(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        admin.forceLogoutUser(user.userId(), id);
        return ok();
    }

    // ---------------- 内容审核 ----------------

    @GetMapping("/review")
    public ApiResponse<List<Map<String, Object>>> review(@RequestParam(required = false) String status) {
        return list(admin.listReview(status));
    }

    @PostMapping("/review/{id}/approve")
    public ApiResponse<Void> approve(@CurrentUser AuthContext.Principal user, @PathVariable String id,
            @RequestBody(required = false) ReasonRequest req) {
        admin.review(user.userId(), id, true, req == null ? null : req.reason());
        return ok();
    }

    @PostMapping("/review/{id}/reject")
    public ApiResponse<Void> reject(@CurrentUser AuthContext.Principal user, @PathVariable String id,
            @RequestBody(required = false) ReasonRequest req) {
        admin.review(user.userId(), id, false, req == null ? null : req.reason());
        return ok();
    }

    // ---------------- 计费与充值 ----------------

    @GetMapping("/packages")
    public ApiResponse<List<Map<String, Object>>> packages() {
        return list(admin.listPackages());
    }

    @PostMapping("/packages")
    public ApiResponse<Map<String, Object>> upsertPackage(@CurrentUser AuthContext.Principal user,
            @RequestBody PackageRequest req) {
        return ok(admin.upsertPackage(user.userId(), req.code(), req.name(),
                req.amount(), req.credits(), req.enabled()));
    }

    @DeleteMapping("/packages/{code}")
    public ApiResponse<Void> deletePackage(@CurrentUser AuthContext.Principal user, @PathVariable String code) {
        admin.deletePackage(user.userId(), code);
        return ok();
    }

    /** 积分补发/扣减 —— 大额（≥1000）需二次确认。 */
    @PostMapping("/credits/adjust")
    public ApiResponse<Map<String, Object>> adjustCredits(@CurrentUser AuthContext.Principal user,
            @RequestBody AdjustRequest req) {
        return ok(admin.adjustCredits(user.userId(), req.userId(), req.amount(), req.reason(), req.confirmed()));
    }

    @GetMapping("/ledger")
    public ApiResponse<PageResult<Map<String, Object>>> ledger(@RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String type) {
        int size = Math.min(Math.max(pageSize, 1), 100);
        int p = Math.max(page, 1);
        List<Map<String, Object>> items = admin.adminLedger(type, p, size);
        return page(items, p, size, items.size());
    }

    // ---------------- 技能包与视频技能 ----------------

    @GetMapping("/skill-packages")
    public ApiResponse<List<Map<String, Object>>> skillPackages(@RequestParam(required = false) String q) {
        return list(admin.listSkillPackages(q));
    }

    @PostMapping("/skill-packages")
    public ApiResponse<Map<String, Object>> upsertSkillPackage(@CurrentUser AuthContext.Principal user,
            @RequestBody SkillPackageRequest req) {
        return ok(admin.upsertSkillPackage(user.userId(), req.id(), req.label(), req.description(),
                req.promptTemplate(), req.version(), req.enabled()));
    }

    @DeleteMapping("/skill-packages/{id}")
    public ApiResponse<Void> deleteSkillPackage(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        admin.deleteSkillPackage(user.userId(), id);
        return ok();
    }

    @GetMapping("/video-skills")
    public ApiResponse<List<Map<String, Object>>> videoSkills() {
        return list(admin.listVideoSkills());
    }

    @PutMapping("/video-skills")
    public ApiResponse<Void> saveVideoSkills(@CurrentUser AuthContext.Principal user,
            @RequestBody List<Map<String, Object>> body) {
        admin.saveVideoSkills(user.userId(), body);
        return ok();
    }

    // ---------------- 公告 ----------------

    @GetMapping("/announcements")
    public ApiResponse<List<Map<String, Object>>> announcements() {
        return list(admin.listAnnouncements());
    }

    @PostMapping("/announcements")
    public ApiResponse<Map<String, Object>> createAnnouncement(@CurrentUser AuthContext.Principal user,
            @RequestBody AnnouncementRequest req) {
        return ok(admin.createAnnouncement(user.userId(), req.title(), req.body(), req.range()));
    }

    @PatchMapping("/announcements/{id}")
    public ApiResponse<Void> updateAnnouncement(@CurrentUser AuthContext.Principal user, @PathVariable String id,
            @RequestBody AnnouncementRequest req) {
        admin.toggleAnnouncement(user.userId(), id, req.pinned(), req.status());
        return ok();
    }

    @DeleteMapping("/announcements/{id}")
    public ApiResponse<Void> deleteAnnouncement(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        admin.deleteAnnouncement(user.userId(), id);
        return ok();
    }

    // ---------------- 公共素材 ----------------

    @GetMapping("/public-assets")
    public ApiResponse<List<Map<String, Object>>> publicAssets(@RequestParam(required = false) String scope) {
        return list(admin.listPublicAssets(scope));
    }

    @PostMapping("/public-assets/scope")
    public ApiResponse<Void> setPublicAssetScope(@CurrentUser AuthContext.Principal user,
            @RequestBody ScopeRequest req) {
        admin.setPublicAssetScope(user.userId(), req.ids(), req.scope());
        return ok();
    }

    // ---------------- 模型接入 ----------------

    @GetMapping("/channels")
    public ApiResponse<List<Map<String, Object>>> channels() {
        return list(admin.listChannels());
    }

    @PostMapping("/channels")
    public ApiResponse<Map<String, Object>> upsertChannel(@CurrentUser AuthContext.Principal user,
            @RequestBody ChannelRequest req) {
        // 行内注释1：apiKey 传空串表示保留原密钥；templateJson 传空表示用内置协议模板。
        return ok(admin.upsertChannel(user.userId(), req.id(), req.name(), req.provider(),
                req.baseUrl(), req.apiKey(), req.protocol(), req.templateJson(), req.capabilities(),
                req.priority(), req.rpmLimit(), req.costRatio(), req.status(), req.remark()));
    }

    @PatchMapping("/channels/{id}")
    public ApiResponse<Void> toggleChannel(@CurrentUser AuthContext.Principal user, @PathVariable String id,
            @RequestBody ChannelStatusRequest req) {
        admin.toggleChannel(user.userId(), id, req.status());
        return ok();
    }

    /** 通道余额巡检 —— 30/14/7 天三级告警。 */
    @GetMapping("/channels/balances")
    public ApiResponse<List<Map<String, Object>>> channelBalances() {
        return list(admin.channelBalances());
    }

    @GetMapping("/endpoints")
    public ApiResponse<List<Map<String, Object>>> endpoints() {
        return list(admin.listEndpoints());
    }

    @PostMapping("/endpoints")
    public ApiResponse<Map<String, Object>> upsertEndpoint(@CurrentUser AuthContext.Principal user,
            @RequestBody EndpointRequest req) {
        return ok(admin.upsertEndpoint(user.userId(), req.id(), req.modelKey(), req.displayName(),
                req.channelId(), req.baseUrl(), req.upstreamModel(), req.timeoutMs(),
                req.maxRetries(), req.sortOrder(), req.enabled(), req.paramMapJson(), req.templateJson()));
    }

    @PatchMapping("/endpoints/{id}")
    public ApiResponse<Void> toggleEndpoint(@CurrentUser AuthContext.Principal user, @PathVariable String id,
            @RequestBody EndpointToggleRequest req) {
        admin.toggleEndpoint(user.userId(), id, req.enabled());
        return ok();
    }

    /** 批量切通道。 */
    @PostMapping("/endpoints/switch-channel")
    public ApiResponse<Map<String, Object>> switchChannel(@CurrentUser AuthContext.Principal user,
            @RequestBody SwitchChannelRequest req) {
        int n = admin.bulkSwitchChannel(user.userId(), req.modelKey(), req.channelId());
        return ok(Map.of("updated", n));
    }

    /** 接入点变更留痕。 */
    @GetMapping("/endpoint-changes")
    public ApiResponse<List<Map<String, Object>>> endpointChanges() {
        return list(admin.endpointChanges());
    }

    // ---------------- 售价积分 ----------------

    /** 售价积分表 —— 后台改价页读取（公开表优先取 DB，回落基线常量）。 */
    @GetMapping("/pricing")
    public ApiResponse<List<Map<String, Object>>> pricing() {
        return list(admin.pricingTable());
    }

    @PostMapping("/pricing")
    public ApiResponse<Map<String, Object>> updatePricing(@CurrentUser AuthContext.Principal user,
            @RequestBody PricingRequest req) {
        return ok(admin.updatePricing(user.userId(), req.modelKey(), req.spec(), req.points(), req.reason()));
    }

    @GetMapping("/pricing/changes")
    public ApiResponse<List<Map<String, Object>>> pricingChanges() {
        return list(admin.pricingChanges());
    }

    // ---------------- 渠道对账 ----------------

    @GetMapping("/bills")
    public ApiResponse<List<Map<String, Object>>> bills(@RequestParam(required = false) String day) {
        return list(admin.bills(day));
    }

    @PostMapping("/bills/reconcile")
    public ApiResponse<Map<String, Object>> reconcile(@RequestBody(required = false) ReconcileRequest req) {
        return ok(admin.reconcile(req == null ? null : req.day()));
    }

    // ---------------- 发票 ----------------

    @GetMapping("/invoices")
    public ApiResponse<List<Map<String, Object>>> invoices(@RequestParam(required = false) String status) {
        return list(admin.adminInvoices(status));
    }

    @PostMapping("/invoices/{id}/approve")
    public ApiResponse<Void> approveInvoice(@CurrentUser AuthContext.Principal user, @PathVariable String id,
            @RequestBody(required = false) ReasonRequest req) {
        admin.approveInvoice(user.userId(), id, true, req == null ? null : req.reason());
        return ok();
    }

    @PostMapping("/invoices/{id}/reject")
    public ApiResponse<Void> rejectInvoice(@CurrentUser AuthContext.Principal user, @PathVariable String id,
            @RequestBody(required = false) ReasonRequest req) {
        admin.approveInvoice(user.userId(), id, false, req == null ? null : req.reason());
        return ok();
    }

    // ---------------- 分销与结算 ----------------

    @GetMapping("/partners")
    public ApiResponse<List<Map<String, Object>>> partners() {
        return list(admin.listPartners());
    }

    @PostMapping("/partners")
    public ApiResponse<Map<String, Object>> createPartner(@CurrentUser AuthContext.Principal user,
            @RequestBody PartnerRequest req) {
        return ok(admin.createPartner(user.userId(), req.name(), req.rate()));
    }

    @PostMapping("/partners/{id}/pause")
    public ApiResponse<Void> pausePartner(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        admin.pausePartner(user.userId(), id);
        return ok();
    }

    @GetMapping("/settlements")
    public ApiResponse<List<Map<String, Object>>> settlements(@RequestParam(required = false) String period) {
        return list(admin.listSettlements(period));
    }

    @PostMapping("/settlements/generate")
    public ApiResponse<Map<String, Object>> generateSettlement(@CurrentUser AuthContext.Principal user,
            @RequestBody SettlementRequest req) {
        return ok(admin.generateSettlement(user.userId(), req.period()));
    }

    @PostMapping("/settlements/{id}/confirm")
    public ApiResponse<Void> confirmSettlement(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        admin.confirmSettlement(user.userId(), id);
        return ok();
    }

    // ---------------- 报表 / 看板 / 审计 ----------------

    @GetMapping("/reports/tasks")
    public ApiResponse<Map<String, Object>> reports(@RequestParam(required = false) String capability) {
        return ok(admin.reports(capability));
    }

    @GetMapping("/dashboard")
    public ApiResponse<Map<String, Object>> dashboard() {
        return ok(admin.dashboard());
    }

    @GetMapping("/audit")
    public ApiResponse<PageResult<Map<String, Object>>> audit(@RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String q) {
        int size = Math.min(Math.max(pageSize, 1), 100);
        int p = Math.max(page, 1);
        List<Map<String, Object>> items = admin.auditLogs(q, p, size);
        return page(items, p, size, items.size());
    }

    // ---------------- 邀请码 ----------------

    @GetMapping("/invite-codes")
    public ApiResponse<List<Map<String, Object>>> inviteCodes() {
        return list(admin.listInviteCodes());
    }

    @PostMapping("/invite-codes/generate")
    public ApiResponse<List<Map<String, Object>>> generateInviteCodes(@CurrentUser AuthContext.Principal user,
            @RequestBody(required = false) GenerateRequest req) {
        return list(admin.generateInviteCodes(user.userId(), req == null ? 10 : req.count()));
    }

    @DeleteMapping("/invite-codes/{code}")
    public ApiResponse<Void> revokeInviteCode(@CurrentUser AuthContext.Principal user, @PathVariable String code) {
        admin.revokeInviteCode(user.userId(), code);
        return ok();
    }

    // ---------------- 请求体 ----------------

    public record ReasonRequest(String reason) {}

    public record PackageRequest(String code, String name, int amount, int credits, Boolean enabled) {}

    public record AdjustRequest(String userId, int amount, String reason, Boolean confirmed) {}

    public record SkillPackageRequest(String id, String label, String description, String promptTemplate,
            String version, Boolean enabled) {}

    public record AnnouncementRequest(String title, String body, String range, Boolean pinned, String status) {}

    public record ScopeRequest(List<String> ids, String scope) {}

    /**
     * 中转站请求体 —— apiKey 落库前加密；templateJson 描述该站的协议差异。
     * 行内注释2：新增一个中转站只需填 name / baseUrl / apiKey / protocol（及可选 templateJson）。
     */
    public record ChannelRequest(String id, String name, String provider, String baseUrl,
            String apiKey, String protocol, String templateJson, String capabilities,
            Integer priority, Integer rpmLimit, Double costRatio, String status, String remark) {}

    public record ChannelStatusRequest(String status) {}

    public record EndpointRequest(String id, String modelKey, String displayName, String channelId,
            String baseUrl, String upstreamModel, Integer timeoutMs, Integer maxRetries,
            Integer sortOrder, Boolean enabled, String paramMapJson, String templateJson) {}

    public record EndpointToggleRequest(Boolean enabled) {}

    public record SwitchChannelRequest(String modelKey, String channelId) {}

    public record PricingRequest(String modelKey, String spec, int points, String reason) {}

    public record ReconcileRequest(String day) {}

    public record PartnerRequest(String name, int rate) {}

    public record SettlementRequest(String period) {}

    public record GenerateRequest(int count) {}
}
