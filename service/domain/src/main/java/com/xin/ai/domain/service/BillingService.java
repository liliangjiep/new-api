package com.xin.ai.domain.service;

import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.domain.catalog.Catalog;
import com.xin.ai.domain.repository.MemStore;
import com.xin.ai.domain.repository.Rows;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

/**
 * 计费服务：报价引擎 + 冻结/结算/退回三段式积分流水。
 * 行内注释1：报价指纹 = HMAC(model_key+spec+count+params+user_id+expires_at)，15 分钟有效，submit 时服务端重算比对防篡改。
 * 行内注释2：三段式流水 —— submit 记 freeze，worker 成功记 settle，失败记 refund；流水不可变，只追加不修改。
 * 行内注释3：余额 = available - frozen，冻结在结算时扣减，失败时释放。
 */
@Service
public class BillingService {

    public static final String T_LEDGER = "point_ledger";
    public static final String T_QUOTES = "quotes";
    public static final String T_ORDERS = "recharge_orders";

    private static final int QUOTE_TTL_MINUTES = 15;
    private static final String FINGERPRINT_SECRET = "xin-ai-quote-fingerprint";

    private final MemStore store;

    public BillingService(MemStore store) {
        this.store = store;
    }

    // 行内注释1：报价 —— 按 model_key + spec 命中定价条目，count 为数量，总价 = 单价 × count。
    public Map<String, Object> quote(String userId, String modelKey, String spec, int count, Map<String, Object> params) {
        Map<String, Object> item = findPricing(modelKey, spec);
        if (item == null) {
            // 行内注释2：用 Rows.row 而非 Map.of —— Map.of 不接受 null value（spec 可能为空）。
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST,
                    Rows.row("message", "未找到定价条目", "model_key", modelKey, "spec", spec));
        }
        int n = Math.max(1, count);
        int unitPoints = Rows.num(item, "points");
        int total = unitPoints * n;
        String model = Rows.str(item, "model", modelKey);
        // 行内注释3：过期时间截断到秒 —— 指纹计算与落库必须用同一个精度值，
        // 否则校验时重算指纹会与库里的不一致，误判为 credit.price_changed。
        LocalDateTime expiresAt = Times.now().plusMinutes(QUOTE_TTL_MINUTES).withNano(0);

        List<Map<String, Object>> lines = new ArrayList<>();
        lines.add(Rows.row(
                "label", Rows.str(item, "label"),
                "spec", Rows.str(item, "spec"),
                "points", unitPoints,
                "discount", discountText(Rows.num(item, "points") - unitPoints)));
        if (n > 1) {
            lines.add(Rows.row("label", "数量", "spec", "× " + n, "points", 0, "discount", null));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("estimated_credits", total);
        result.put("lines", lines);
        result.put("model_key", modelKey);
        result.put("model", model);
        result.put("expires_at", Times.iso(expiresAt));

        String fingerprint = fingerprint(userId, modelKey, spec, n, params, expiresAt);
        result.put("fingerprint", fingerprint);
        store.put(T_QUOTES, fingerprint, Rows.row(
                "id", fingerprint, "user_id", userId, "model_key", modelKey, "model", model,
                "spec", Rows.str(item, "spec"),
                "count", n, "points", total, "params", params == null ? Map.of() : params,
                "expire_at", Times.full(expiresAt), "created_at", Times.full(Times.now())));
        return result;
    }

    // 行内注释2：校验报价 —— 指纹必须存在、属于该用户、未过期，且服务端重算一致。
    public Map<String, Object> validateQuote(String userId, String fingerprint) {
        Map<String, Object> row = store.find(T_QUOTES, fingerprint == null ? "" : fingerprint).orElse(null);
        if (row == null) {
            throw new BizException(ErrorCode.TASK_QUOTE_EXPIRED);
        }
        if (!Rows.str(row, "user_id").equals(userId)) {
            throw new BizException(ErrorCode.TASK_QUOTE_EXPIRED);
        }
        if (Times.parse(Rows.str(row, "expire_at")).isBefore(Times.now())) {
            throw new BizException(ErrorCode.TASK_QUOTE_EXPIRED);
        }
        String expect = fingerprint(userId, Rows.str(row, "model_key"), Rows.str(row, "spec"),
                Rows.num(row, "count"), Rows.map(row, "params"),
                Times.parse(Rows.str(row, "expire_at")));
        if (!expect.equals(fingerprint)) {
            throw new BizException(ErrorCode.CREDIT_PRICE_CHANGED);
        }
        return row;
    }

    // 行内注释3：冻结 —— 校验余额充足后从可用余额扣除并转入冻结，写 freeze 流水。
    // 行内注释3.1：冻结即从 available 扣除（frozen 是"已扣但未结算"的部分），
    // 否则退款时再补一次会导致余额虚增 —— 结算只释放 frozen，退款才把 points 加回 available。
    public void freeze(String userId, int points, String note, String taskId) {
        if (points <= 0) {
            return;
        }
        Map<String, Object> account = requireAccount(userId);
        int available = Rows.num(account, "balance");
        if (available < points) {
            throw new BizException(ErrorCode.CREDIT_INSUFFICIENT,
                    Map.of("required", points, "available", available, "shortfall", points - available));
        }
        store.update(AuthService.T_USERS, userId, Rows.row(
                "balance", available - points,
                "frozen", Rows.num(account, "frozen") + points));
        appendLedger(userId, "freeze", -points, note, taskId, null);
    }

    // 行内注释4：结算 —— 冻结额转为已消费，可用余额已在冻结时扣除，此处只释放 frozen。
    public void settle(String userId, int points, String note, String taskId) {
        if (points <= 0) {
            return;
        }
        Map<String, Object> account = requireAccount(userId);
        int frozen = Rows.num(account, "frozen");
        int release = Math.min(frozen, points);
        store.update(AuthService.T_USERS, userId, Rows.row(
                "frozen", frozen - release));
        appendLedger(userId, "settle", -points, note, taskId, null);
    }

    // 行内注释5：退回 —— 释放冻结并回补可用余额，写 refund 流水。
    public void refund(String userId, int points, String note, String taskId) {
        if (points <= 0) {
            return;
        }
        Map<String, Object> account = requireAccount(userId);
        int frozen = Rows.num(account, "frozen");
        int release = Math.min(frozen, points);
        store.update(AuthService.T_USERS, userId, Rows.row(
                "frozen", frozen - release,
                "balance", Rows.num(account, "balance") + points));
        appendLedger(userId, "refund", points, note, taskId, null);
    }

    // 行内注释6：充值 —— 记 recharge 流水并加余额；赠送部分单独记 adjust。
    public void recharge(String userId, int credits, int bonus, String note, String orderNo) {
        Map<String, Object> account = requireAccount(userId);
        store.update(AuthService.T_USERS, userId, Rows.row(
                "balance", Rows.num(account, "balance") + credits + bonus));
        appendLedger(userId, "recharge", credits, note, null, orderNo);
        if (bonus > 0) {
            appendLedger(userId, "adjust", bonus, note + "（赠送）", null, orderNo);
        }
    }

    // 行内注释7：管理员调整积分（补发/扣减）。
    public void adjust(String userId, int amount, String reason) {
        Map<String, Object> account = requireAccount(userId);
        int balance = Rows.num(account, "balance") + amount;
        if (balance < 0) {
            throw new BizException(ErrorCode.CREDIT_INSUFFICIENT, Map.of("message", "扣减后余额为负"));
        }
        store.update(AuthService.T_USERS, userId, Rows.row("balance", balance));
        appendLedger(userId, "adjust", amount, reason, null, null);
    }

    // 行内注释8：余额视图 —— available / frozen / 有效期。
    public Map<String, Object> balance(String userId) {
        Map<String, Object> account = requireAccount(userId);
        return Rows.row(
                "available", Rows.num(account, "balance"),
                "frozen", Rows.num(account, "frozen"),
                "expires_at", "2028-10-28");
    }

    // 行内注释9：流水查询 —— 只读、倒序、分页；type 支持 recharge/consume/refund/bonus/all。
    public List<Map<String, Object>> ledger(String userId, String type, int page, int pageSize) {
        List<Map<String, Object>> all = store.listWhere(T_LEDGER + "_" + userId, r -> true).stream()
                .sorted((a, b) -> Rows.str(b, "created_at").compareTo(Rows.str(a, "created_at")))
                .toList();
        List<Map<String, Object>> filtered = switch (type == null ? "all" : type) {
            case "recharge" -> all.stream().filter(r -> "recharge".equals(Rows.str(r, "type"))).toList();
            case "consume" -> all.stream().filter(r -> "settle".equals(Rows.str(r, "type"))).toList();
            case "refund" -> all.stream().filter(r -> "refund".equals(Rows.str(r, "type"))).toList();
            case "bonus" -> all.stream().filter(r -> "adjust".equals(Rows.str(r, "type"))).toList();
            default -> all;
        };
        int from = Math.min((page - 1) * pageSize, filtered.size());
        int to = Math.min(from + pageSize, filtered.size());
        return filtered.subList(from, to);
    }

    public long ledgerCount(String userId, String type) {
        return ledger(userId, type, 1, Integer.MAX_VALUE).size();
    }

    // 行内注释10：定价查询 —— 后台改价后写 DB，公开表优先取 DB，回落基线常量。
    public List<Map<String, Object>> pricingTable() {
        List<Map<String, Object>> overrides = store.listWhere("ability_pricing", r -> true);
        if (overrides.isEmpty()) {
            return Catalog.PRICING;
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> base : Catalog.PRICING) {
            Map<String, Object> ov = overrides.stream()
                    .filter(r -> Rows.str(r, "model_key").equals(Rows.str(base, "model_key"))
                            && Rows.str(r, "spec").equals(Rows.str(base, "spec")))
                    .findFirst().orElse(null);
            Map<String, Object> merged = new LinkedHashMap<>(base);
            if (ov != null) {
                merged.put("points", Rows.num(ov, "points"));
            }
            out.add(merged);
        }
        return out;
    }

    public Map<String, Object> findPricing(String modelKey, String spec) {
        List<Map<String, Object>> table = pricingTable();
        Map<String, Object> byKey = table.stream()
                .filter(r -> Rows.str(r, "model_key").equals(modelKey))
                .findFirst().orElse(null);
        if (byKey == null) {
            return null;
        }
        if (spec == null || spec.isBlank()) {
            return byKey;
        }
        return table.stream()
                .filter(r -> Rows.str(r, "model_key").equals(modelKey) && Rows.str(r, "spec").equals(spec))
                .findFirst().orElse(byKey);
    }

    // 行内注释11：写流水 —— 只追加，永不修改历史行。
    private void appendLedger(String userId, String type, int amount, String note, String taskId, String orderNo) {
        Map<String, Object> account = requireAccount(userId);
        String id = "led_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        store.put(T_LEDGER + "_" + userId, id, Rows.row(
                "id", id, "user_id", userId, "type", type, "amount", amount,
                "balance", Rows.num(account, "balance"),
                "note", note == null ? "" : note,
                "task_id", taskId, "order_no", orderNo,
                "created_at", Times.full(Times.now())));
    }

    private Map<String, Object> requireAccount(String userId) {
        Map<String, Object> user = store.find(AuthService.T_USERS, userId).orElse(null);
        if (user == null) {
            throw new BizException(ErrorCode.AUTH_UNAUTHORIZED);
        }
        return user;
    }

    private static String discountText(int diff) {
        return diff > 0 ? "-" + diff : null;
    }

    // 行内注释12：指纹算法 —— 内容包含用户、模型、规格、数量、参数与过期时间，防跨用户复用与篡改。
    // 行内注释13：params 必须按 key 排序后再序列化 —— HashMap 的 toString() 顺序不保证，
    // 两次相同的 params 可能产生不同字符串，导致校验阶段误判价格变更。
    public String fingerprint(String userId, String modelKey, String spec, int count,
            Map<String, Object> params, LocalDateTime expiresAt) {
        String content = userId + "|" + modelKey + "|" + (spec == null ? "" : spec) + "|"
                + count + "|" + canonicalParams(params) + "|" + expiresAt;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(FINGERPRINT_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(content.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("fingerprint failed", e);
        }
    }

    // 行内注释14：参数规范化 —— 按 key 字典序拼接，保证同一组参数每次得到完全一致的字符串。
    private static String canonicalParams(Map<String, Object> params) {
        if (params == null || params.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        new java.util.TreeMap<>(params).forEach((k, v) -> {
            if (sb.length() > 0) {
                sb.append(';');
            }
            sb.append(k).append('=').append(v == null ? "" : String.valueOf(v));
        });
        return sb.toString();
    }
}
