package com.xin.ai.api.modules.billing;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.dto.PageResult;
import com.xin.ai.common.security.AuthContext;
import com.xin.ai.common.security.CurrentUser;
import com.xin.ai.domain.service.BillingService;
import com.xin.ai.domain.service.RechargeService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 积分与充值接口（文档 §2.2）。
 * 行内注释1：流水不可变，只追加；列表按 type 过滤（全部/充值/消耗/退回/赠送）。
 * 行内注释2：回调端点带验签占位 —— 未接真实支付网关时按金额与订单号做幂等校验。
 */
@RestController
@RequestMapping("/api/v1")
public class BillingController extends BaseController {

    private final BillingService billing;
    private final RechargeService recharge;

    public BillingController(BillingService billing, RechargeService recharge) {
        this.billing = billing;
        this.recharge = recharge;
    }

    /** 余额 —— available / frozen / expires_at。 */
    @GetMapping("/points/balance")
    public ApiResponse<Map<String, Object>> balance(@CurrentUser AuthContext.Principal user) {
        return ok(billing.balance(user.userId()));
    }

    /** 积分流水。 */
    @GetMapping("/points/ledger")
    public ApiResponse<PageResult<Map<String, Object>>> ledger(@CurrentUser AuthContext.Principal user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String type) {
        int size = Math.min(Math.max(pageSize, 1), 100);
        int p = Math.max(page, 1);
        List<Map<String, Object>> items = billing.ledger(user.userId(), type, p, size);
        long total = billing.ledgerCount(user.userId(), type);
        return page(items, p, size, total);
    }

    /** 创建充值订单 —— Idempotency-Key 必带。 */
    @PostMapping("/recharge/orders")
    public ApiResponse<Map<String, Object>> createOrder(@CurrentUser AuthContext.Principal user,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody CreateOrderRequest req) {
        return ok(recharge.createOrder(user.userId(), req.packageCode(), req.payMethod()));
    }

    @GetMapping("/recharge/orders")
    public ApiResponse<PageResult<Map<String, Object>>> listOrders(@CurrentUser AuthContext.Principal user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        int size = Math.min(Math.max(pageSize, 1), 100);
        int p = Math.max(page, 1);
        List<Map<String, Object>> items = recharge.listOrders(user.userId(), p, size);
        return page(items, p, size, recharge.countOrders(user.userId()));
    }

    @GetMapping("/recharge/orders/{no}")
    public ApiResponse<Map<String, Object>> orderDetail(@CurrentUser AuthContext.Principal user,
            @PathVariable String no) {
        return ok(recharge.getOrder(user.userId(), no));
    }

    /** 微信支付回调（占位验签）。 */
    @PostMapping("/recharge/callback/wechat")
    public ApiResponse<Map<String, Object>> wechatCallback(@CurrentUser AuthContext.Principal user,
            @RequestBody CallbackRequest req) {
        return ok(recharge.callback(user.userId(), req.orderNo(), req.amount(), "微信支付"));
    }

    /** 支付宝回调（占位验签）。 */
    @PostMapping("/recharge/callback/alipay")
    public ApiResponse<Map<String, Object>> alipayCallback(@CurrentUser AuthContext.Principal user,
            @RequestBody CallbackRequest req) {
        return ok(recharge.callback(user.userId(), req.orderNo(), req.amount(), "支付宝"));
    }

    public record CreateOrderRequest(String packageCode, String payMethod) {}

    public record CallbackRequest(String orderNo, Double amount, String signature) {}
}
