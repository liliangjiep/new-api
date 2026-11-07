package com.xin.ai.domain.service;

import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.domain.repository.DataStore;
import com.xin.ai.domain.repository.Rows;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * 充值卡兑换服务（文档 §2.2 R13「充值卡兑换」P0）。
 *
 * 行内注释1：为什么单独一个服务 ——
 *   充值卡（后台制卡 → 用户兑换入账）此前完全没有后端实现：
 *   后台 /admin/invite-codes 只能生成「无面额邀请码」，用户侧没有任何兑换端点，
 *   前端「兑换充值卡」按钮只能弹 toast —— 这是一条断掉的业务链路。
 *
 * 行内注释2：与订单充值的区别 ——
 *   订单充值要经过支付网关（A 类凭据）；充值卡是线下/运营发放的预付凭证，
 *   兑换不依赖任何外部服务，所以属于必须 100% 真实闭环的部分。
 *
 * 行内注释3：幂等与防重 ——
 *   一张卡只能兑换一次（used 标记）。重复兑换返回「已被使用」，
 *   绝不二次加积分 —— 这是账务安全红线。
 */
@Service
public class RechargeCardService {

    /** 充值卡表 —— 与后台制卡共用 invite_codes。 */
    public static final String T_CARDS = AdminService.T_INVITE_CODES;

    private final DataStore store;
    private final BillingService billing;

    public RechargeCardService(DataStore store, BillingService billing) {
        this.store = store;
        this.billing = billing;
    }

    /**
     * 兑换充值卡 —— 校验存在性/未使用/有面额，加积分并记流水。
     *
     * @param userId 兑换人
     * @param code   卡号（大小写不敏感）
     * @return 兑换结果视图：卡号、到账积分、当前余额
     */
    public Map<String, Object> redeem(String userId, String code) {
        String normalized = code == null ? "" : code.trim().toUpperCase();
        if (normalized.isEmpty()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "请输入充值卡号"));
        }

        // 行内注释3.1：卡号大小写不敏感 —— 后台导出/手输容易大小写不一致。
        Map<String, Object> card = store.listWhere(T_CARDS, r -> Rows.strEq(r, "code", normalized))
                .stream().findFirst().orElse(null);
        if (card == null) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND, Map.of("message", "充值卡不存在"));
        }
        if (Rows.bool(card, "used")) {
            // 行内注释3.2：已使用 —— 明确告知，不加积分（防重复兑换造分）。
            throw new BizException(ErrorCode.COMMON_CONFLICT,
                    Map.of("message", "该充值卡已被使用", "code", normalized));
        }

        int points = Rows.num(card, "points", 0);
        if (points <= 0) {
            // 行内注释3.3：无面额卡（纯邀请码）不支持兑换积分 —— 给出可执行的提示。
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST,
                    Map.of("message", "该卡号不包含可兑换积分，请联系运营核实"));
        }

        // 行内注释4：先置为已使用再入账 —— 避免并发重复兑换。
        //   即使后续入账抛错，卡也已被占用（宁可少加也不能多加）。
        store.update(T_CARDS, normalized, Rows.row(
                "used", true,
                "used_by", userId,
                "used_at", Times.full(Times.now())));

        // 行内注释5：走 billing.recharge —— 与订单充值同一套记账路径
        //   （余额 + 积分批次 + recharge 流水），到期日规则一致。
        billing.recharge(userId, points, 0, "充值卡兑换 · " + normalized, normalized);

        return Rows.row(
                "code", normalized,
                "points", points,
                "balance", Rows.num(billing.balance(userId), "available", 0),
                "message", "兑换成功，" + points + " 积分已到账");
    }
}
