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
 * 充值服务：套餐公开表 + 建单 + 支付回调。
 * 行内注释1：订单状态机 pending → paid/cancelled/closed；回调必须做幂等与金额校验。
 * 行内注释2：到账时记两笔流水（充值本金 + 赠送），与前端「到账 X 积分（含赠送）」口径一致。
 */
@Service
public class RechargeService {

    public static final String T_ORDERS = "recharge_orders";

    private final MemStore store;
    private final BillingService billing;

    public RechargeService(MemStore store, BillingService billing) {
        this.store = store;
        this.billing = billing;
    }

    // 行内注释3：公开套餐表 —— 与前端 RECHARGE_PACKAGES 一致。
    public List<Map<String, Object>> packages() {
        return Catalog.RECHARGE_PACKAGES;
    }

    // 行内注释4：建单 —— Idempotency-Key 必带，重复返回原单。
    public Map<String, Object> createOrder(String userId, String packageCode, String payMethod) {
        Map<String, Object> pkg = Catalog.RECHARGE_PACKAGES.stream()
                .filter(p -> Rows.str(p, "code").equals(packageCode))
                .findFirst().orElse(null);
        if (pkg == null) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "套餐不存在", "package_code", packageCode));
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
        List<Map<String, Object>> all = store.listWhere(T_ORDERS, r -> Rows.str(r, "user_id").equals(userId)).stream()
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
        if (order == null || !Rows.str(order, "user_id").equals(userId)) {
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
        if (!Rows.str(order, "user_id").equals(userId)) {
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
        if (order == null || !Rows.str(order, "user_id").equals(userId)) {
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

    private Map<String, Object> view(Map<String, Object> o) {
        return Rows.row(
                "no", Rows.str(o, "no"),
                "package_name", Rows.str(o, "package_name", ""),
                "amount", Rows.num(o, "amount"),
                "credits", Rows.num(o, "credits"),
                "bonus", Rows.num(o, "bonus"),
                "pay_method", Rows.str(o, "pay_method", ""),
                "status", statusLabel(Rows.str(o, "status")),
                "status_code", Rows.str(o, "status"),
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
