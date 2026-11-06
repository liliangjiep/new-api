package com.xin.ai.domain.service;

import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.domain.catalog.Catalog;
import com.xin.ai.domain.repository.DataStore;
import com.xin.ai.domain.repository.Rows;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * 后台管理服务：20 组运营/内容/供应链/财务/数据/系统能力。
 * 行内注释1：所有写操作落 audit_logs（含操作人、前后值、理由），大额积分调整 ≥1000 需二次确认标记。
 * 行内注释2：改价带毛利护栏 —— 售价 < 成本 直接拒绝；毛利率 <30% 黄警，<10% 红禁。
 * 行内注释3：通道余额三级告警 —— 30/14/7 天用量预估换算成余额阈值。
 */
@Service
public class AdminService {

    public static final String T_AUDIT = "audit_logs";
    public static final String T_CHANNELS = "model_channels";
    public static final String T_ENDPOINTS = "model_endpoints";
    public static final String T_PRICING = "ability_pricing";
    public static final String T_REVIEW = "review_queue";
    public static final String T_ANNOUNCEMENTS = "announcements";
    public static final String T_INVITE_CODES = "invite_codes";
    public static final String T_PUBLIC_ASSETS = "public_materials";
    public static final String T_VIDEO_SKILLS = "video_skills";
    public static final String T_PACKAGES = "skill_packages";
    public static final String T_PARTNERS = "affiliate_partners";
    public static final String T_SETTLEMENTS = "affiliate_settlements";
    public static final String T_INVOICES = "invoices";
    public static final String T_LEDGER = "point_ledger_all";

    private static final int LARGE_ADJUST_THRESHOLD = 1000;

    private final DataStore store;
    private final BillingService billing;
    private final AuthService auth;
    /** 中转站配置 —— 通道与接入点走 MySQL 强类型表。 */
    private final RelayConfigService relayConfig;

    public AdminService(DataStore store, BillingService billing, AuthService auth,
            RelayConfigService relayConfig) {
        this.store = store;
        this.billing = billing;
        this.auth = auth;
        this.relayConfig = relayConfig;
    }

    // ---------------- 用户管理 ----------------

    public List<Map<String, Object>> listUsers(String q, String status, int page, int pageSize) {
        List<Map<String, Object>> all = store.listWhere(AuthService.T_USERS, r -> true).stream()
                .filter(r -> status == null || status.isBlank() || "全部".equals(status)
                        || (("正常".equals(status) && "active".equals(Rows.str(r, "status")))
                            || ("封禁".equals(status) && "banned".equals(Rows.str(r, "status")))))
                .filter(r -> q == null || q.isBlank()
                        || Rows.str(r, "nickname", "").contains(q)
                        || Rows.str(r, "id").contains(q)
                        || Rows.str(r, "phone", "").contains(q))
                .sorted((a, b) -> Rows.str(b, "created_at").compareTo(Rows.str(a, "created_at")))
                .toList();
        int from = Math.min((page - 1) * pageSize, all.size());
        int to = Math.min(from + pageSize, all.size());
        return all.subList(from, to).stream().map(u -> Rows.row(
                "id", Rows.str(u, "id"),
                "nickname", Rows.str(u, "nickname", ""),
                "phone", maskPhone(Rows.str(u, "phone", "")),
                "role", roleLabel(Rows.str(u, "role", "USER")),
                "balance", Rows.num(u, "balance"),
                "status", "active".equals(Rows.str(u, "status")) ? "正常" : "封禁",
                "created_at", Rows.str(u, "created_at"))).toList();
    }

    public long countUsers(String q, String status) {
        return listUsers(q, status, 1, Integer.MAX_VALUE).size();
    }

    public Map<String, Object> userDetail(String userId) {
        Map<String, Object> u = store.find(AuthService.T_USERS, userId).orElse(null);
        if (u == null) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        return Rows.row(
                "id", Rows.str(u, "id"),
                "nickname", Rows.str(u, "nickname", ""),
                "phone", maskPhone(Rows.str(u, "phone", "")),
                "role", roleLabel(Rows.str(u, "role", "USER")),
                "balance", Rows.num(u, "balance"),
                "frozen", Rows.num(u, "frozen"),
                "status", "active".equals(Rows.str(u, "status")) ? "正常" : "封禁",
                "created_at", Rows.str(u, "created_at"),
                "login_version", Rows.num(u, "login_version"));
    }

    // 行内注释1：封禁 / 解封 —— 封禁同时强制下线。
    public void banUser(String operator, String userId, boolean banned) {
        Map<String, Object> u = store.find(AuthService.T_USERS, userId).orElse(null);
        if (u == null) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        String before = Rows.str(u, "status");
        store.update(AuthService.T_USERS, userId, Rows.row("status", banned ? "banned" : "active"));
        if (banned) {
            auth.forceLogout(userId);
        }
        audit(operator, banned ? "封禁用户" : "解封用户", userId,
                Rows.row("status_before", before, "status_after", banned ? "banned" : "active"), "");
    }

    public void forceLogoutUser(String operator, String userId) {
        auth.forceLogout(userId);
        audit(operator, "强制下线", userId, Rows.row("action", "force_logout"), "");
    }

    // ---------------- 内容审核 ----------------

    public List<Map<String, Object>> listReview(String status) {
        return store.listWhere(T_REVIEW, r -> true).stream()
                .filter(r -> status == null || status.isBlank() || status.equals(Rows.str(r, "status")))
                .map(r -> Rows.row(
                        "id", Rows.str(r, "id"),
                        "title", Rows.str(r, "title", ""),
                        "user", Rows.str(r, "user", ""),
                        "thumb", Rows.str(r, "thumb", ""),
                        "status", Rows.str(r, "status")))
                .toList();
    }

    public void review(String operator, String itemId, boolean approve, String reason) {
        Map<String, Object> item = store.find(T_REVIEW, itemId).orElse(null);
        if (item == null) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        String status = approve ? "approved" : "rejected";
        store.update(T_REVIEW, itemId, Rows.row("status", status, "reason", reason == null ? "" : reason));
        audit(operator, approve ? "审核通过" : "审核驳回", itemId,
                Rows.row("status_before", Rows.str(item, "status"), "status_after", status), reason);
    }

    // ---------------- 计费与充值 ----------------

    public List<Map<String, Object>> listPackages() {
        List<Map<String, Object>> overrides = store.listWhere("recharge_packages", r -> true);
        if (overrides.isEmpty()) {
            return Catalog.RECHARGE_PACKAGES;
        }
        Map<String, Map<String, Object>> byCode = new LinkedHashMap<>();
        overrides.forEach(o -> byCode.put(Rows.str(o, "code"), o));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> base : Catalog.RECHARGE_PACKAGES) {
            Map<String, Object> ov = byCode.get(Rows.str(base, "code"));
            Map<String, Object> m = new LinkedHashMap<>(base);
            if (ov != null) {
                m.put("amount", Rows.num(ov, "amount"));
                m.put("credits", Rows.num(ov, "credits"));
                m.put("enabled", Rows.bool(ov, "enabled"));
            }
            out.add(m);
        }
        return out;
    }

    public Map<String, Object> upsertPackage(String operator, String code, String name,
            int amount, int credits, boolean enabled) {
        String id = code == null || code.isBlank()
                ? "pkg_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8) : code;
        Map<String, Object> before = store.find("recharge_packages", id).orElse(null);
        store.put("recharge_packages", id, Rows.row(
                "id", id, "code", id, "name", name, "amount", amount,
                "credits", credits, "enabled", enabled,
                "updated_at", Times.full(Times.now())));
        audit(operator, "套餐配置", id,
                Rows.row("before", before == null ? Map.of() : before,
                        "after", Rows.row("name", name, "amount", amount, "credits", credits, "enabled", enabled)),
                "");
        return Rows.row("code", id, "name", name, "amount", amount, "credits", credits, "enabled", enabled);
    }

    public void deletePackage(String operator, String code) {
        store.delete("recharge_packages", code);
        audit(operator, "删除套餐", code, Rows.row("code", code), "");
    }

    // 行内注释2：积分调整 —— 大额（≥1000）需二次确认标记 confirmed=true。
    public Map<String, Object> adjustCredits(String operator, String userId, int amount,
            String reason, boolean confirmed) {
        if (reason == null || reason.isBlank()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "调整必须填写理由"));
        }
        int abs = Math.abs(amount);
        if (abs >= LARGE_ADJUST_THRESHOLD && !confirmed) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST,
                    Map.of("message", "大额调整（≥1000）需二次确认", "need_confirm", true, "threshold", LARGE_ADJUST_THRESHOLD));
        }
        billing.adjust(userId, amount, reason);
        audit(operator, amount >= 0 ? "积分补发" : "积分扣减", userId,
                Rows.row("amount", amount, "balance_after", billing.balance(userId)), reason);
        return billing.balance(userId);
    }

    // 行内注释3：全站积分流水（运营视角）。
    public List<Map<String, Object>> adminLedger(String type, int page, int pageSize) {
        List<Map<String, Object>> all = store.listWhere(T_LEDGER, r -> true).stream()
                .filter(r -> type == null || type.isBlank() || "全部".equals(type) || type.equals(Rows.str(r, "type")))
                .sorted((a, b) -> Rows.str(b, "created_at").compareTo(Rows.str(a, "created_at")))
                .toList();
        int from = Math.min((page - 1) * pageSize, all.size());
        int to = Math.min(from + pageSize, all.size());
        return all.subList(from, to).stream().map(l -> Rows.row(
                "id", Rows.str(l, "id"),
                "user_id", Rows.str(l, "user_id", ""),
                "type", Rows.str(l, "type", ""),
                "amount", Rows.num(l, "amount"),
                "balance", Rows.num(l, "balance"),
                "note", Rows.str(l, "note", ""),
                "created_at", Rows.str(l, "created_at"))).toList();
    }

    // ---------------- 技能包与视频技能 ----------------

    public List<Map<String, Object>> listSkillPackages(String q) {
        List<Map<String, Object>> all = store.listWhere(T_PACKAGES, r -> true);
        if (all.isEmpty()) {
            all = Catalog.IMAGE_SKILLS.stream().map(s -> Rows.row(
                    "id", Rows.str(s, "key"),
                    "label", Rows.str(s, "label"),
                    "description", Rows.str(s, "description", ""),
                    "prompt_template", Rows.str(s, "prompt_template", ""),
                    "version", "v1.0",
                    "enabled", true)).toList();
        }
        return all.stream()
                .filter(p -> q == null || q.isBlank() || Rows.str(p, "label", "").contains(q))
                .toList();
    }

    public Map<String, Object> upsertSkillPackage(String operator, String id, String label,
            String description, String promptTemplate, String version, boolean enabled) {
        String key = id == null || id.isBlank()
                ? "custom_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8) : id;
        store.put(T_PACKAGES, key, Rows.row(
                "id", key, "label", label, "description", description,
                "prompt_template", promptTemplate, "version", version,
                "enabled", enabled, "updated_at", Times.full(Times.now())));
        audit(operator, "技能包保存", key, Rows.row("label", label, "version", version), "");
        return Rows.row("id", key, "label", label, "version", version, "enabled", enabled);
    }

    public void deleteSkillPackage(String operator, String id) {
        store.delete(T_PACKAGES, id);
        audit(operator, "删除技能包", id, Rows.row("id", id), "");
    }

    // 行内注释4：视频技能 —— 含 option_groups（选项组）JSON，默认空对象。
    public List<Map<String, Object>> listVideoSkills() {
        List<Map<String, Object>> overrides = store.listWhere(T_VIDEO_SKILLS, r -> true);
        Map<String, Map<String, Object>> byKey = new LinkedHashMap<>();
        overrides.forEach(o -> byKey.put(Rows.str(o, "key"), o));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> base : Catalog.VIDEO_SKILLS) {
            Map<String, Object> ov = byKey.get(Rows.str(base, "key"));
            Map<String, Object> m = new LinkedHashMap<>(base);
            m.put("enabled", ov == null ? true : Rows.bool(ov, "enabled"));
            m.put("option_groups", ov == null ? Map.of() : Rows.map(ov, "option_groups"));
            out.add(m);
        }
        return out;
    }

    public void saveVideoSkills(String operator, List<Map<String, Object>> items) {
        for (Map<String, Object> item : items) {
            String key = Rows.str(item, "key");
            store.put(T_VIDEO_SKILLS, key, Rows.row(
                    "id", key, "key", key,
                    "enabled", Rows.bool(item, "enabled"),
                    "option_groups", Rows.map(item, "option_groups"),
                    "updated_at", Times.full(Times.now())));
        }
        audit(operator, "视频技能保存", "batch", Rows.row("count", items.size()), "");
    }

    // ---------------- 公告 ----------------

    public List<Map<String, Object>> listAnnouncements() {
        return store.listWhere(T_ANNOUNCEMENTS, r -> true).stream()
                .sorted((a, b) -> Rows.num(b, "pinned") - Rows.num(a, "pinned"))
                .map(a -> Rows.row(
                        "id", Rows.str(a, "id"),
                        "title", Rows.str(a, "title", ""),
                        "body", Rows.str(a, "body", ""),
                        "pinned", Rows.bool(a, "pinned"),
                        "range", Rows.str(a, "range", "长期"),
                        "status", Rows.str(a, "status", "published"),
                        "created_at", Rows.str(a, "created_at")))
                .toList();
    }

    public Map<String, Object> createAnnouncement(String operator, String title, String body, String range) {
        if (title == null || title.isBlank()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "标题不能为空"));
        }
        String id = "ann_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        store.put(T_ANNOUNCEMENTS, id, Rows.row(
                "id", id, "title", title.trim(), "body", body == null ? "" : body,
                "pinned", false, "range", range == null ? "长期" : range,
                "status", "published", "created_at", Times.full(Times.now())));
        audit(operator, "新建公告", id, Rows.row("title", title), "");
        return Rows.row("id", id, "title", title.trim(), "status", "published");
    }

    public void toggleAnnouncement(String operator, String id, boolean pinned, String status) {
        Map<String, Object> patch = new LinkedHashMap<>();
        if (pinned) {
            patch.put("pinned", pinned);
        }
        if (status != null) {
            patch.put("status", status);
        }
        store.update(T_ANNOUNCEMENTS, id, patch);
        audit(operator, "公告操作", id, patch, "");
    }

    public void deleteAnnouncement(String operator, String id) {
        store.delete(T_ANNOUNCEMENTS, id);
        audit(operator, "删除公告", id, Rows.row("id", id), "");
    }

    // ---------------- 公共素材 ----------------

    public List<Map<String, Object>> listPublicAssets(String scope) {
        return store.listWhere(T_PUBLIC_ASSETS, r -> true).stream()
                .filter(r -> scope == null || scope.isBlank() || "全部".equals(scope) || scope.equals(Rows.str(r, "scope")))
                .map(a -> Rows.row(
                        "id", Rows.str(a, "id"),
                        "name", Rows.str(a, "name", ""),
                        "scope", Rows.str(a, "scope", "全员"),
                        "thumb", Rows.str(a, "thumb", "")))
                .toList();
    }

    public void setPublicAssetScope(String operator, List<String> ids, String scope) {
        ids.forEach(id -> store.update(T_PUBLIC_ASSETS, id, Rows.row("scope", scope)));
        audit(operator, "公共素材授权", String.join(",", ids), Rows.row("scope", scope), "");
    }

    // ---------------- 模型接入 ----------------

    /**
     * 列出中转站 —— 数据源是 MySQL 的 model_channels 强类型表。
     * 行内注释1：通道配置不走通用 entity_rows，因为这是你要手工调表的对象，字段要清晰可读。
     */
    public List<Map<String, Object>> listChannels() {
        return relayConfig.listChannels();
    }

    /**
     * 保存中转站 —— 密钥加密落库。
     * 行内注释2：apiKey 传空串表示不改动原密钥。
     */
    public Map<String, Object> upsertChannel(String operator, String id, String name, String provider,
            String baseUrl, String apiKey, String protocol, String templateJson, String capabilities,
            Integer priority, Integer rpmLimit, Double costRatio, String status, String remark) {
        Map<String, Object> saved = relayConfig.upsertChannel(operator, id, name, provider, baseUrl,
                apiKey, protocol, templateJson, capabilities, priority, rpmLimit, costRatio, status, remark);
        audit(operator, "中转站保存", Rows.str(saved, "id", ""),
                Rows.row("name", name, "base_url", baseUrl, "protocol", protocol), "");
        return saved;
    }

    public void toggleChannel(String operator, String id, String status) {
        Map<String, Object> before = relayConfig.findChannel(id);
        relayConfig.toggleChannel(operator, id, status);
        audit(operator, "中转站状态变更", id,
                Rows.row("before", before == null ? Map.of() : Rows.str(before, "status"), "after", status), "");
    }

    /** 列出接入点 —— MySQL model_endpoints。 */
    public List<Map<String, Object>> listEndpoints() {
        return relayConfig.listEndpoints();
    }


    public Map<String, Object> upsertEndpoint(String operator, String id, String modelKey, String displayName,
            String channelId, String baseUrl, String upstreamModel, Integer timeoutMs,
            Integer maxRetries,             Integer sortOrder, Boolean enabled, String paramMapJson, String templateJson) {
        Map<String, Object> saved = relayConfig.upsertEndpoint(operator, id, modelKey, displayName,
                channelId, baseUrl, upstreamModel, timeoutMs, maxRetries, sortOrder, enabled,
                paramMapJson, templateJson);
        audit(operator, "接入点保存", Rows.str(saved, "id", ""), saved, "");
        return saved;
    }

    public void toggleEndpoint(String operator, String id, boolean enabled) {
        Map<String, Object> before = relayConfig.listEndpoints().stream()
                .filter(e -> id.equals(Rows.str(e, "id"))).findFirst().orElse(null);
        relayConfig.toggleEndpoint(operator, id, enabled);
        audit(operator, enabled ? "启用接入点" : "停用接入点", id,
                Rows.row("before", before == null ? Map.of() : Rows.bool(before, "enabled"), "after", enabled), "");
    }

    // 行内注释5：批量切通道 —— 同一 model_key 全部指向新通道。
    public int bulkSwitchChannel(String operator, String modelKey, String channelId) {
        int count = relayConfig.bulkSwitchChannel(operator, modelKey, channelId);
        audit(operator, "批量切通道", modelKey,
                Rows.row("channel_id", channelId, "count", count), "");
        return count;
    }

    // 行内注释6：接入点变更留痕 —— 单独表，供后台「变更留痕」面板展示。
    public List<Map<String, Object>> endpointChanges() {
        return store.listWhere("endpoint_changes", r -> true).stream()
                .sorted((a, b) -> Rows.str(b, "created_at").compareTo(Rows.str(a, "created_at")))
                .map(c -> Rows.row(
                        "id", Rows.str(c, "id"),
                        "model_key", Rows.str(c, "model_key", ""),
                        "from_channel", Rows.str(c, "from_channel", ""),
                        "to_channel", Rows.str(c, "to_channel", ""),
                        "operator", Rows.str(c, "operator", ""),
                        "created_at", Rows.str(c, "created_at")))
                .toList();
    }

    // ---------------- 售价积分 ----------------

    // 行内注释7：改价 —— 毛利护栏：售价 < 成本 拒绝；毛利率 <10% 拒绝，<30% 放行但打黄警。
    public Map<String, Object> updatePricing(String operator, String modelKey, String spec, int points, String reason) {
        Map<String, Object> base = billing.findPricing(modelKey, spec);
        if (base == null) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        double cost = base.get("cost") == null ? 0 : ((Number) base.get("cost")).doubleValue();
        int pointsBefore = Rows.num(base, "points");
        if (cost > 0 && points < cost) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST,
                    Map.of("message", "售价低于成本，禁止保存", "cost", cost, "points", points));
        }
        double margin = cost <= 0 ? 1 : (points - cost) / points;
        if (margin < 0.10) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST,
                    Map.of("message", "毛利率低于 10%，禁止保存", "margin", margin));
        }
        String key = modelKey + "|" + Rows.str(base, "spec");
        store.put(T_PRICING, key, Rows.row(
                "id", key, "model_key", modelKey, "spec", Rows.str(base, "spec"),
                "points", points, "cost", cost,
                "updated_by", operator, "updated_at", Times.full(Times.now())));
        audit(operator, "改价", key,
                Rows.row("points_before", pointsBefore, "points_after", points, "margin", margin), reason);
        return Rows.row("model_key", modelKey, "spec", Rows.str(base, "spec"),
                "points", points, "margin", margin,
                "warning", margin < 0.30 ? "毛利率低于 30%" : null);
    }

    public List<Map<String, Object>> pricingChanges() {
        return store.listWhere("pricing_change_log", r -> true).stream()
                .sorted((a, b) -> Rows.str(b, "created_at").compareTo(Rows.str(a, "created_at")))
                .map(l -> Rows.row(
                        "id", Rows.str(l, "id"),
                        "model_key", Rows.str(l, "model_key", ""),
                        "spec", Rows.str(l, "spec", ""),
                        "points_before", Rows.num(l, "points_before"),
                        "points_after", Rows.num(l, "points_after"),
                        "reason", Rows.str(l, "reason", ""),
                        "operator", Rows.str(l, "operator", ""),
                        "created_at", Rows.str(l, "created_at")))
                .toList();
    }

    // ---------------- 通道余额与对账 ----------------

    // 行内注释8：余额巡检 —— 30/14/7 天用量换算预警阈值，低于 7 天为紧急。
    public List<Map<String, Object>> channelBalances() {
        return listChannels().stream().map(c -> {
            double balance = c.get("balance") == null ? 0 : ((Number) c.get("balance")).doubleValue();
            double daily = 2000; // 日均成本估算基线
            int days = daily <= 0 ? 0 : (int) Math.floor(balance / daily);
            String level = days >= 30 ? "normal" : days >= 14 ? "warning" : days >= 7 ? "critical" : "urgent";
            return Rows.row(
                    "name", Rows.str(c, "name"),
                    "balance", balance,
                    "days_left", days,
                    "level", level,
                    "level_label", switch (level) {
                        case "normal" -> "正常";
                        case "warning" -> "预警";
                        case "critical" -> "紧急";
                        default -> "停用";
                    });
        }).toList();
    }

    public List<Map<String, Object>> bills(String day) {
        return listChannels().stream().map(c -> Rows.row(
                "channel", Rows.str(c, "name"),
                "upstream_count", 0,
                "platform_count", 0,
                "diff", 0,
                "cost", 0.0,
                "day", day == null ? "" : day)).toList();
    }

    public Map<String, Object> reconcile(String day) {
        List<Map<String, Object>> rows = bills(day);
        long diffCount = rows.stream().filter(r -> Math.abs(Rows.num(r, "diff")) > 0).count();
        return Rows.row("day", day == null ? "" : day, "channels", rows.size(),
                "diff_channels", diffCount, "status", diffCount == 0 ? "matched" : "diff");
    }

    // ---------------- 发票（运营） ----------------

    public List<Map<String, Object>> adminInvoices(String status) {
        return store.listWhere(T_INVOICES, r -> true).stream()
                .filter(r -> status == null || status.isBlank() || status.equals(Rows.str(r, "status")))
                .map(i -> Rows.row(
                        "id", Rows.str(i, "id"),
                        "title", Rows.str(i, "title", ""),
                        "amount", Rows.num(i, "amount"),
                        "status", Rows.str(i, "status"),
                        "invoice_no", Rows.str(i, "invoice_no", ""),
                        "created_at", Rows.str(i, "created_at")))
                .toList();
    }

    public void approveInvoice(String operator, String id, boolean approve, String reason) {
        Map<String, Object> before = store.find(T_INVOICES, id).orElse(null);
        if (before == null) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        String status = approve ? "done" : "rejected";
        String invoiceNo = approve
                ? "NO." + System.currentTimeMillis()
                : Rows.str(before, "invoice_no", "");
        store.update(T_INVOICES, id, Rows.row("status", status, "invoice_no", invoiceNo,
                "reason", reason == null ? "" : reason));
        audit(operator, approve ? "开票" : "驳回发票", id,
                Rows.row("status_before", Rows.str(before, "status"), "status_after", status), reason);
    }

    // ---------------- 分销与结算 ----------------

    public List<Map<String, Object>> listPartners() {
        return store.listWhere(T_PARTNERS, r -> true).stream()
                .map(p -> Rows.row(
                        "id", Rows.str(p, "id"),
                        "name", Rows.str(p, "name", ""),
                        "rate", Rows.num(p, "rate"),
                        "status", Rows.str(p, "status", "合作中"),
                        "pending_amount", Rows.num(p, "pending_amount")))
                .toList();
    }

    public Map<String, Object> createPartner(String operator, String name, int rate) {
        String id = "af_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        store.put(T_PARTNERS, id, Rows.row(
                "id", id, "name", name, "rate", rate, "status", "合作中",
                "pending_amount", 0, "created_at", Times.full(Times.now())));
        audit(operator, "新增分销伙伴", id, Rows.row("name", name, "rate", rate), "");
        return Rows.row("id", id, "name", name, "rate", rate, "status", "合作中");
    }

    public void pausePartner(String operator, String id) {
        store.update(T_PARTNERS, id, Rows.row("status", "已暂停"));
        audit(operator, "暂停合作", id, Rows.row("status", "已暂停"), "");
    }

    public List<Map<String, Object>> listSettlements(String period) {
        return store.listWhere(T_SETTLEMENTS, r -> true).stream()
                .filter(s -> period == null || period.isBlank() || period.equals(Rows.str(s, "period")))
                .map(s -> Rows.row(
                        "id", Rows.str(s, "id"),
                        "period", Rows.str(s, "period", ""),
                        "amount", Rows.num(s, "amount"),
                        "status", Rows.str(s, "status", "待打款"),
                        "created_at", Rows.str(s, "created_at")))
                .toList();
    }

    public Map<String, Object> generateSettlement(String operator, String period) {
        String id = "set_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        int amount = store.listWhere(T_PARTNERS, r -> true).stream()
                .mapToInt(r -> Rows.num(r, "pending_amount")).sum();
        store.put(T_SETTLEMENTS, id, Rows.row(
                "id", id, "period", period, "amount", amount, "status", "待打款",
                "created_at", Times.full(Times.now())));
        audit(operator, "生成结算单", id, Rows.row("period", period, "amount", amount), "");
        return Rows.row("id", id, "period", period, "amount", amount, "status", "待打款");
    }

    public void confirmSettlement(String operator, String id) {
        store.update(T_SETTLEMENTS, id, Rows.row("status", "已打款"));
        audit(operator, "结算打款", id, Rows.row("status", "已打款"), "");
    }

    // ---------------- 报表 / 看板 / 审计 ----------------

    public Map<String, Object> reports(String capability) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (String cap : List.of("图片生成", "视频生成", "图片口播", "字幕擦除")) {
            if (capability != null && !capability.isBlank() && !"全部".equals(capability) && !cap.equals(capability)) {
                continue;
            }
            long total = store.countWhere(TaskOrchestrator.T_TASKS,
                    r -> cap.equals(capabilityOf(Rows.str(r, "model_key"))));
            long ok = store.countWhere(TaskOrchestrator.T_TASKS,
                    r -> cap.equals(capabilityOf(Rows.str(r, "model_key"))) && "succeeded".equals(Rows.str(r, "status")));
            rows.add(Rows.row(
                    "capability", cap,
                    "total", total,
                    "success_rate", total == 0 ? 0 : Math.round(ok * 10000.0 / total) / 100.0,
                    "points", store.listWhere(TaskOrchestrator.T_TASKS,
                            r -> cap.equals(capabilityOf(Rows.str(r, "model_key"))))
                            .stream().mapToInt(r -> Rows.num(r, "points_charged")).sum()));
        }
        return Rows.row("rows", rows);
    }

    public Map<String, Object> dashboard() {
        long tasks = store.countWhere(TaskOrchestrator.T_TASKS, r -> true);
        long ok = store.countWhere(TaskOrchestrator.T_TASKS, r -> "succeeded".equals(Rows.str(r, "status")));
        int revenue = store.listWhere(TaskOrchestrator.T_TASKS, r -> true)
                .stream().mapToInt(r -> Rows.num(r, "points_charged")).sum();
        return Rows.row(
                "task_total", tasks,
                "task_success_rate", tasks == 0 ? 0 : Math.round(ok * 10000.0 / tasks) / 100.0,
                "points_revenue", revenue,
                "user_total", store.countWhere(AuthService.T_USERS, r -> true),
                "asset_total", store.countWhere(AssetService.T_ASSETS, r -> true));
    }

    public List<Map<String, Object>> auditLogs(String q, int page, int pageSize) {
        List<Map<String, Object>> all = store.listWhere(T_AUDIT, r -> true).stream()
                .filter(r -> q == null || q.isBlank()
                        || Rows.str(r, "target", "").contains(q)
                        || Rows.str(r, "trace_id", "").contains(q))
                .sorted((a, b) -> Rows.str(b, "created_at").compareTo(Rows.str(a, "created_at")))
                .toList();
        int from = Math.min((page - 1) * pageSize, all.size());
        int to = Math.min(from + pageSize, all.size());
        return all.subList(from, to);
    }

    // ---------------- 邀请码 ----------------

    public List<Map<String, Object>> listInviteCodes() {
        return store.listWhere(T_INVITE_CODES, r -> true).stream()
                .map(c -> Rows.row(
                        "code", Rows.str(c, "code"),
                        "status", Rows.bool(c, "used") ? "已使用" : "未使用",
                        "used_by", Rows.str(c, "used_by", "—"),
                        "created_at", Rows.str(c, "created_at")))
                .toList();
    }

    public List<Map<String, Object>> generateInviteCodes(String operator, int count) {
        int n = Math.max(1, Math.min(count, 100));
        List<Map<String, Object>> out = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            String code = "XIN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 4).toUpperCase()
                    + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 2).toUpperCase();
            store.put(T_INVITE_CODES, code, Rows.row(
                    "code", code, "used", false, "used_by", "",
                    "created_at", Times.full(Times.now()), "created_by", operator));
            out.add(Rows.row("code", code, "status", "未使用"));
        }
        audit(operator, "生成邀请码", "batch", Rows.row("count", n), "");
        return out;
    }

    public void revokeInviteCode(String operator, String code) {
        store.delete(T_INVITE_CODES, code);
        audit(operator, "作废邀请码", code, Rows.row("code", code), "");
    }

    // ---------------- 审计写入 ----------------

    // 行内注释9：审计写入 —— 记录操作人、动作、对象、前后值、理由、trace。
    public void audit(String operator, String action, String target, Map<String, Object> diff, String reason) {
        String id = "aud_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        store.put(T_AUDIT, id, Rows.row(
                "id", id, "operator", operator == null ? "system" : operator,
                "action", action, "target", target == null ? "" : target,
                "diff", diff == null ? Map.of() : diff,
                "reason", reason == null ? "" : reason,
                "trace_id", org.slf4j.MDC.get("traceId"),
                "created_at", Times.full(Times.now())));
    }

    // ---------------- 辅助 ----------------

    private static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return "***";
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    private static String roleLabel(String role) {
        return switch (role == null ? "USER" : role) {
            case "ADMIN" -> "管理员";
            case "OPERATOR" -> "运营";
            case "ENTERPRISE" -> "企业";
            case "STUDIO" -> "工作室";
            case "PERSONAL" -> "个人";
            default -> "个人";
        };
    }

    private static String capabilityOf(String modelKey) {
        if (modelKey == null || modelKey.isBlank()) {
            return "其他";
        }
        String head = modelKey.split("\\.")[0];
        return switch (head) {
            case "image-speak" -> "图片口播";
            case "stone" -> "石材效果图";
            case "factory" -> "厂家介绍视频";
            case "lipsync" -> "视频改口型";
            case "video" -> modelKey.contains("erase") ? "字幕擦除"
                    : modelKey.contains("process") ? "画质增强" : "视频生成";
            case "image" -> "图片生成";
            default -> head;
        };
    }
}
