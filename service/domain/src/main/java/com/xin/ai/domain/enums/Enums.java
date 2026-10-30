package com.xin.ai.domain.enums;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * M2-11 状态枚举合集。
 * 行内注释1：每个枚举自带 code + 描述，DB 存 code，前端展示 desc。
 * 行内注释2：fromCode 用 stream 查找，未命中抛业务异常，避免 null 扩散。
 */
public final class Enums {

    private Enums() {}

    public enum TaskStatus {
        PENDING("pending", "排队中"),
        RUNNING("running", "生成中"),
        SUCCEEDED("succeeded", "已完成"),
        FAILED("failed", "已失败");

        private final String code;
        private final String desc;

        TaskStatus(String code, String desc) { this.code = code; this.desc = desc; }
        public String code() { return code; }
        public String desc() { return desc; }
    }

    public enum ChannelStatus {
        ACTIVE("active", "启用"),
        PAUSED("paused", "暂停"),
        DEGRADED("degraded", "降级");

        private final String code;
        private final String desc;
        ChannelStatus(String code, String desc) { this.code = code; this.desc = desc; }
        public String code() { return code; }
    }

    public enum CircuitState {
        CLOSED("closed", "闭合"),
        OPEN("open", "断开"),
        HALF_OPEN("half_open", "半开");

        private final String code;
        private final String desc;
        CircuitState(String code, String desc) { this.code = code; this.desc = desc; }
        public String code() { return code; }
    }

    public enum Capability {
        TEXT("text"), IMAGE("image"), VIDEO("video"), VIDEO_EDIT("video-edit"),
        VIDEO_PROCESS("video-process"), ERASE("erase"), TTS("tts"),
        VOICE_CLONE("voice-clone"), IMAGE_SPEAK("image-speak"), LIPSYNC("lipsync"),
        STONE_EFFECT("stone-effect"), STONE_VIDEO("stone-video"), AGENT("agent");

        private final String code;
        Capability(String code) { this.code = code; }
        public String code() { return code; }

        // 行内注释3：code→枚举映射缓存，避免每次遍历。
        private static final Map<String, Capability> BY_CODE = Arrays.stream(values())
                .collect(Collectors.toMap(Capability::code, Function.identity()));

        public static Capability fromCode(String code) {
            Capability c = BY_CODE.get(code);
            if (c == null) {
                throw new com.xin.ai.common.exception.BizException(
                        com.xin.ai.common.exception.ErrorCode.COMMON_BAD_REQUEST);
            }
            return c;
        }
    }

    public enum LedgerType {
        FREEZE("freeze", "冻结"), SETTLE("settle", "结算"), REFUND("refund", "退回"),
        RECHARGE("recharge", "充值"), ADJUST("adjust", "补发/扣减");

        private final String code;
        private final String desc;
        LedgerType(String code, String desc) { this.code = code; this.desc = desc; }
        public String code() { return code; }
    }

    public enum OrderStatus {
        PENDING("pending", "待支付"), PAID("paid", "已支付"),
        CANCELLED("cancelled", "已取消"), REFUNDED("refunded", "已退款");

        private final String code;
        private final String desc;
        OrderStatus(String code, String desc) { this.code = code; this.desc = desc; }
        public String code() { return code; }
    }
}
