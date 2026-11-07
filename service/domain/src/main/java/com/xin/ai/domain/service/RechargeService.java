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
 * 充值服务：套餐公开表 + 建单 + 支付回调。
 * 行内注释1：订单状态机 pending → paid/cancelled/closed；回调必须做幂等与金额校验。
 * 行内注释2：到账时记两笔流水（充值本金 + 赠送），与前端「到账 X 积分（含赠送）」口径一致。
 */
@Service
public class RechargeService {

    public static final String T_ORDERS = "recharge_orders";
    /** 行内注释2：充值套餐覆盖表 —— 后台运营改价后建单按覆盖价走。 */
    public static final String T_PACKAGES = "recharge_packages";

    private final DataStore store;
    private final BillingService billing;

    public RechargeService(DataStore store, BillingService billing) {
        this.store = store;
        this.billing = billing;
    }

    // 行内注释3：公开套餐表 —— 与前端 RECHARGE_PACKAGES 一致。
    // 行内注释3.1：套餐以「后台可覆盖」为准 —— 后台运营在 /admin/packages 改了金额/积分后，
    //             这里必须同步返回覆盖后的值，否则会出现「后台改了价、用户按原价充值」。
    public List<Map<String, Object>> packages() {
        List<Map<String, Object>> overrides = store.listWhere(T_PACKAGES, r -> true);
        if (overrides.isEmpty()) {
            return Catalog.RECHARGE_PACKAGES;
        }
        Map<String, Map<String, Object>> byCode = new LinkedHashMap<>();
        overrides.forEach(o -> byCode.put(Rows.str(o, "code"), o));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> base : Catalog.RECHARGE_PACKAGES) {
            Map<String, Object> merged = new LinkedHashMap<>(base);
            Map<String, Object> ov = byCode.get(Rows.str(base, "code"));
            if (ov != null) {
                merged.put("amount", Rows.num(ov, "amount"));
                merged.put("credits", Rows.num(ov, "credits"));
                merged.put("enabled", Rows.bool(ov, "enabled"));
            }
            out.add(merged);
        }
        return out;
    }

    // 行内注释4：建单 —— Idempotency-Key 必带，重复返回原单。
    public Map<String, Object> createOrder(String userId, String packageCode, String payMethod) {
        // 行内注释4.0：取价走 packages()（含后台覆盖）—— 不能用静态 Catalog，
        //             否则后台调价后用户仍按旧价建单，钱和积分对不上。
        Map<String, Object> pkg = packages().stream()
                .filter(p -> Rows.strEq(p, "code", packageCode))
                .findFirst().orElse(null);
        if (pkg == null) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "套餐不存在", "package_code", packageCode));
        }
        // 行内注释4.0.1：被后台停用的套餐不允许下单。
        if (pkg.containsKey("enabled") && !Rows.bool(pkg, "enabled")) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "该套餐已下架", "package_code", packageCode));
        }
        String orderNo = "ord_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        Map<String, Object> order = Rows.row(
                "id", orderNo, "no", orderNo, "user_id", userId,
                "package_code", packageCode,
                "package_name", Rows.str(pkg, "name"),
                "amount", Rows.num(pkg, "amount"),
                "credits", Rows.num(pkg, "credits"),
                "bonus", bonusOf(Rows.num(pkg, "credits"), Rows.num(pkg, "amount")),
                "pay_method", payMethod == null || payMethod.isBlank() ? "微信支付" : payMethod,
                "status", "pending",
                "created_at", Times.full(Times.now()));
        store.put(T_ORDERS, orderNo, order);
        return Rows.row(
                "order_no", orderNo,
                "pay_url", "https://pay.local.invalid/order/" + orderNo,
                "amount", Rows.num(pkg, "amount"),
                "credits", Rows.num(pkg, "credits"),
                "package_name", Rows.str(pkg, "name"),
                "status", "pending");
    }

    // 行内注释5：订单列表 —— 按用户隔离，倒序分页。
    public List<Map<String, Object>> listOrders(String userId, int page, int pageSize) {
        List<Map<String, Object>> all = store.listWhere(T_ORDERS, r -> Rows.strEq(r, "user_id", userId)).stream()
                .sorted((a, b) -> Rows.str(b, "created_at").compareTo(Rows.str(a, "created_at")))
                .toList();
        int from = Math.min((page - 1) * pageSize, all.size());
        int to = Math.min(from + pageSize, all.size());
        return all.subList(from, to).stream().map(this::view).toList();
    }

    public long countOrders(String userId) {
        return listOrders(userId, 1, Integer.MAX_VALUE).size();
    }

    public Map<String, Object> getOrder(String userId, String orderNo) {
        Map<String, Object> order = store.find(T_ORDERS, orderNo).orElse(null);
        if (order == null || !Rows.strEq(order, "user_id", userId)) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        return view(order);
    }

    // 行内注释6：支付回调 —— 幂等（已支付直接返回）+ 金额校验 + 到账记账。
    public Map<String, Object> callback(String userId, String orderNo, double paidAmount, String channel) {
        Map<String, Object> order = store.find(T_ORDERS, orderNo).orElse(null);
        if (order == null) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        if (!Rows.strEq(order, "user_id", userId)) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        if ("paid".equals(Rows.str(order, "status"))) {
            // 幂等：重复回调直接返回成功
            return view(order);
        }
        if (Math.abs(paidAmount - Rows.num(order, "amount")) > 0.01) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "支付金额不匹配"));
        }
        int credits = Rows.num(order, "credits");
        int bonus = Rows.num(order, "bonus");
        store.update(T_ORDERS, orderNo, Rows.row(
                "status", "paid", "paid_at", Times.full(Times.now()),
                "paid_channel", channel == null ? "" : channel));
        billing.recharge(Rows.str(order, "user_id"), credits, bonus,
                Rows.str(order, "package_name", "充值") + " · " + orderNo, orderNo);
        return view(store.find(T_ORDERS, orderNo).orElse(order));
    }

    // 行内注释7：关闭订单 —— 未支付可关闭。
    public void closeOrder(String userId, String orderNo) {
        Map<String, Object> order = store.find(T_ORDERS, orderNo).orElse(null);
        if (order == null || !Rows.strEq(order, "user_id", userId)) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        if ("pending".equals(Rows.str(order, "status"))) {
            store.update(T_ORDERS, orderNo, Rows.row("status", "closed"));
        }
    }

    // 行内注释8：赠送积分 = 到账积分 - 基础积分（实付金额 × 1），即套餐的赠送部分。
    private int bonusOf(int credits, int amount) {
        return Math.max(0, credits - amount);
    }

    /**
     * 订单视图 —— 字段与前端 RechargeOrder 接口一一对应。
     * 行内注释8.1：status 必须是原始码（pending/paid/closed/refunded），
     *              中文标签放 status_label —— 前端契约里 status 是用来做状态判断的，
     *              若这里塞中文，前端的 `status === "paid"` 永远不成立。
     * 行内注释8.2：order_no 与 no 同时给出 —— 前端历史代码用 no，新代码用 order_no。
     */
    private Map<String, Object> view(Map<String, Object> o) {
        String no = Rows.str(o, "no", Rows.str(o, "id", ""));
        String code = Rows.str(o, "status", "");
        return Rows.row(
                "id", Rows.str(o, "id", no),
                "order_no", no,
                "no", no,
                "package_code", Rows.str(o, "package_code", ""),
                "package_name", Rows.str(o, "package_name", ""),
                "amount", Rows.num(o, "amount"),
                "credits", Rows.num(o, "credits"),
                "bonus", Rows.num(o, "bonus"),
                "pay_method", Rows.str(o, "pay_method", ""),
                "status", code,
                "status_code", code,
                "status_label", statusLabel(code),
                "created_at", Rows.str(o, "created_at"));
    }

    private String statusLabel(String code) {
        return switch (code == null ? "" : code) {
            case "pending" -> "待支付";
            case "paid" -> "已支付";
            case "closed" -> "已关闭";
            case "refunded" -> "已退款";
            default -> code;
        };
    }
}
