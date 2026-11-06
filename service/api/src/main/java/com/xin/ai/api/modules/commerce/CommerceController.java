package com.xin.ai.api.modules.commerce;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.dto.PageResult;
import com.xin.ai.common.security.AuthContext;
import com.xin.ai.common.security.CurrentUser;
import com.xin.ai.domain.service.CommerceService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 发票与分销接口（文档 §2.11）。
 * 行内注释1：发票税号 15~20 位，企业抬头必填。
 */
@RestController
@RequestMapping("/api/v1")
public class CommerceController extends BaseController {

    private final CommerceService commerce;

    public CommerceController(CommerceService commerce) {
        this.commerce = commerce;
    }

    @GetMapping("/invoices")
    public ApiResponse<PageResult<Map<String, Object>>> invoices(@CurrentUser AuthContext.Principal user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        int size = Math.min(Math.max(pageSize, 1), 100);
        int p = Math.max(page, 1);
        List<Map<String, Object>> items = commerce.listInvoices(user.userId(), p, size);
        return page(items, p, size, commerce.countInvoices(user.userId()));
    }

    @PostMapping("/invoices")
    public ApiResponse<Map<String, Object>> createInvoice(@CurrentUser AuthContext.Principal user,
            @RequestBody InvoiceRequest req) {
        return ok(commerce.createInvoice(user.userId(), req.titleType(), req.title(),
                req.taxNo(), req.amount(), req.orderNos()));
    }

    @GetMapping("/affiliate/overview")
    public ApiResponse<Map<String, Object>> overview(@CurrentUser AuthContext.Principal user) {
        return ok(commerce.affiliateOverview(user.userId()));
    }

    @GetMapping("/affiliate/settlements")
    public ApiResponse<List<Map<String, Object>>> settlements(@CurrentUser AuthContext.Principal user) {
        return list(commerce.affiliateSettlements(user.userId()));
    }

    @PostMapping("/affiliate/withdrawals")
    public ApiResponse<Map<String, Object>> withdraw(@CurrentUser AuthContext.Principal user,
            @RequestBody WithdrawRequest req) {
        return ok(commerce.withdraw(user.userId(), req.amount()));
    }

    public record InvoiceRequest(String titleType, String title, String taxNo, Double amount,
            List<String> orderNos) {}

    public record WithdrawRequest(int amount) {}
}
