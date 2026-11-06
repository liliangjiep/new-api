package com.xin.ai.domain.service;

import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.domain.repository.DataStore;
import com.xin.ai.domain.repository.Rows;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * 发票与分销服务。
 * 行内注释1：发票 —— 企业抬头需 15~20 位税号（正则校验），提交后进入待审核，人工开票。
 * 行内注释2：分销 —— 伙伴/佣金/结算单/提现四类记录，结算单由后台生成打款。
 */
@Service
public class CommerceService {

    public static final String T_INVOICES = "invoices";
    public static final String T_PARTNERS = "affiliate_partners";
    public static final String T_COMMISSIONS = "affiliate_commissions";
    public static final String T_SETTLEMENTS = "affiliate_settlements";
    public static final String T_WITHDRAWALS = "affiliate_withdrawals";

    private final DataStore store;

    public CommerceService(DataStore store) {
        this.store = store;
    }

    // 行内注释3：发票申请 —— 校验抬头类型与税号，写入待审核。
    public Map<String, Object> createInvoice(String userId, String titleType, String title,
            String taxNo, double amount, List<String> orderNos) {
        boolean isCompany = "企业".equals(titleType);
        if (isCompany) {
            if (taxNo == null || !taxNo.matches("^[0-9A-Z]{15,20}$")) {
                throw new BizException(ErrorCode.INVOICE_TAX_INVALID,
                        Map.of("message", "税号须为 15~20 位数字或大写字母"));
            }
        }
        if (title == null || title.isBlank()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "抬头不能为空"));
        }
        if (amount <= 0) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "金额必须大于 0"));
        }
        String id = "inv_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        store.put(T_INVOICES, id, Rows.row(
                "id", id, "user_id", userId,
                "title_type", isCompany ? "企业" : "个人",
                "title", title.trim(),
                "tax_no", taxNo == null ? "" : taxNo,
                "amount", amount,
                "order_nos", orderNos == null ? List.of() : orderNos,
                "status", "pending",
                "invoice_no", "",
                "created_at", Times.full(Times.now())));
        return Rows.row("id", id, "title", title.trim(), "amount", amount, "status", "pending");
    }

    public List<Map<String, Object>> listInvoices(String userId, int page, int pageSize) {
        List<Map<String, Object>> all = store.listWhere(T_INVOICES, r -> Rows.str(r, "user_id").equals(userId)).stream()
                .sorted((a, b) -> Rows.str(b, "created_at").compareTo(Rows.str(a, "created_at")))
                .toList();
        int from = Math.min((page - 1) * pageSize, all.size());
        int to = Math.min(from + pageSize, all.size());
        return all.subList(from, to).stream().map(this::viewInvoice).toList();
    }

    public long countInvoices(String userId) {
        return listInvoices(userId, 1, Integer.MAX_VALUE).size();
    }

    // 行内注释4：分销概览 —— 伙伴信息 + 佣金余额 + 结算记录。
    public Map<String, Object> affiliateOverview(String userId) {
        Map<String, Object> partner = store.listWhere(T_PARTNERS, r -> Rows.str(r, "user_id").equals(userId))
                .stream().findFirst().orElse(null);
        int commission = store.listWhere(T_COMMISSIONS, r -> Rows.str(r, "user_id").equals(userId))
                .stream().mapToInt(r -> Rows.num(r, "amount")).sum();
        List<Map<String, Object>> settlements = store.listWhere(T_SETTLEMENTS, r -> Rows.str(r, "user_id").equals(userId))
                .stream().map(s -> Rows.row(
                        "id", Rows.str(s, "id"),
                        "period", Rows.str(s, "period", ""),
                        "amount", Rows.num(s, "amount"),
                        "status", Rows.str(s, "status", "pending"),
                        "created_at", Rows.str(s, "created_at")))
                .toList();
        return Rows.row(
                "partner", partner == null ? Rows.row("name", "个人推广者", "rate", 10) : Rows.row(
                        "name", Rows.str(partner, "name"),
                        "rate", Rows.num(partner, "rate")),
                "commission_balance", commission,
                "settlements", settlements);
    }

    public List<Map<String, Object>> affiliateSettlements(String userId) {
        return store.listWhere(T_SETTLEMENTS, r -> Rows.str(r, "user_id").equals(userId)).stream()
                .map(s -> Rows.row(
                        "id", Rows.str(s, "id"),
                        "period", Rows.str(s, "period", ""),
                        "amount", Rows.num(s, "amount"),
                        "status", Rows.str(s, "status", "pending"),
                        "created_at", Rows.str(s, "created_at")))
                .toList();
    }

    // 行内注释5：提现申请 —— 金额不得超过佣金余额。
    public Map<String, Object> withdraw(String userId, int amount) {
        if (amount <= 0) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "提现金额必须大于 0"));
        }
        int balance = store.listWhere(T_COMMISSIONS, r -> Rows.str(r, "user_id").equals(userId))
                .stream().mapToInt(r -> Rows.num(r, "amount")).sum();
        if (amount > balance) {
            throw new BizException(ErrorCode.CREDIT_INSUFFICIENT,
                    Map.of("message", "提现金额超过佣金余额", "balance", balance));
        }
        String id = "wd_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        store.put(T_WITHDRAWALS, id, Rows.row(
                "id", id, "user_id", userId, "amount", amount, "status", "pending",
                "created_at", Times.full(Times.now())));
        return Rows.row("id", id, "amount", amount, "status", "pending");
    }

    private Map<String, Object> viewInvoice(Map<String, Object> i) {
        return Rows.row(
                "id", Rows.str(i, "id"),
                "title_type", Rows.str(i, "title_type", "个人"),
                "title", Rows.str(i, "title", ""),
                "tax_no", Rows.str(i, "tax_no", ""),
                "amount", Rows.num(i, "amount"),
                "order_nos", Rows.list(i, "order_nos"),
                "status", invoiceStatusLabel(Rows.str(i, "status")),
                "status_code", Rows.str(i, "status"),
                "invoice_no", Rows.str(i, "invoice_no", ""),
                "created_at", Rows.str(i, "created_at"));
    }

    private String invoiceStatusLabel(String code) {
        return switch (code == null ? "" : code) {
            case "pending" -> "待审核";
            case "approved" -> "待开票";
            case "done" -> "已开票";
            case "rejected" -> "已驳回";
            default -> code;
        };
    }
}
