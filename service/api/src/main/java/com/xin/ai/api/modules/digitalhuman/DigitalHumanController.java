package com.xin.ai.api.modules.digitalhuman;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.security.AuthContext;
import com.xin.ai.common.security.CurrentUser;
import com.xin.ai.domain.service.BillingService;
import com.xin.ai.domain.service.DigitalHumanService;
import com.xin.ai.domain.service.TaskOrchestrator;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 数字人接口（文档 §2.8）。
 * 行内注释1：形象未标准化不可提交生成任务 —— 与 factory-video 校验一致。
 * 行内注释2：口播任务 ready 条件 = 形象 + 音频（TTS 生成或上传）。
 */
@RestController
@RequestMapping("/api/v1")
public class DigitalHumanController extends BaseController {

    private final DigitalHumanService digitalHuman;
    private final BillingService billing;
    private final TaskOrchestrator tasks;

    public DigitalHumanController(DigitalHumanService digitalHuman, BillingService billing, TaskOrchestrator tasks) {
        this.digitalHuman = digitalHuman;
        this.billing = billing;
        this.tasks = tasks;
    }

    @GetMapping("/avatars")
    public ApiResponse<List<Map<String, Object>>> avatars(@CurrentUser AuthContext.Principal user,
            @RequestParam(defaultValue = "false") boolean standardizedOnly) {
        return list(digitalHuman.listAvatars(user.userId(), standardizedOnly));
    }

    @PostMapping("/avatars")
    public ApiResponse<Map<String, Object>> createAvatar(@CurrentUser AuthContext.Principal user,
            @RequestBody CreateAvatarRequest req) {
        return ok(digitalHuman.createAvatar(user.userId(), req.assetId(), req.name()));
    }

    @PostMapping("/avatars/{id}/standardize")
    public ApiResponse<Map<String, Object>> standardize(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        return ok(digitalHuman.standardize(user.userId(), id));
    }

    @DeleteMapping("/avatars/{id}")
    public ApiResponse<Void> deleteAvatar(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        digitalHuman.deleteAvatar(user.userId(), id);
        return ok();
    }

    @GetMapping("/voices")
    public ApiResponse<List<Map<String, Object>>> voices(@CurrentUser AuthContext.Principal user) {
        return list(digitalHuman.listVoices(user.userId()));
    }

    @PostMapping("/voices")
    public ApiResponse<Map<String, Object>> cloneVoice(@CurrentUser AuthContext.Principal user,
            @RequestBody CloneVoiceRequest req) {
        return ok(digitalHuman.cloneVoice(user.userId(), req.name(), req.audioAssetIds()));
    }

    @GetMapping("/voice-slots")
    public ApiResponse<List<Map<String, Object>>> slots(@CurrentUser AuthContext.Principal user) {
        return list(digitalHuman.listSlots(user.userId()));
    }

    @PostMapping("/voice-slots")
    public ApiResponse<Map<String, Object>> createSlot(@CurrentUser AuthContext.Principal user,
            @RequestBody CreateSlotRequest req) {
        return ok(digitalHuman.createSlot(user.userId(), req.voiceId(), req.name(), req.index()));
    }

    /** 语音合成任务。 */
    @PostMapping("/tts/jobs")
    public ApiResponse<Map<String, Object>> ttsJob(@CurrentUser AuthContext.Principal user,
            @RequestBody TtsRequest req) {
        Map<String, Object> params = Map.of(
                "text", req.text() == null ? "" : req.text(),
                "voice_id", req.voiceId() == null ? "" : req.voiceId(),
                "title", "语音合成");
        Map<String, Object> quote = billing.quote(user.userId(), "doubao-tts-2.0", null, 1, params);
        return ok(tasks.submit(user.userId(), "doubao-tts-2.0", null, 1, params,
                String.valueOf(quote.get("fingerprint")), null));
    }

    /** 数字人口播 / 改口型任务。 */
    @PostMapping("/digital-human/jobs")
    public ApiResponse<Map<String, Object>> job(@CurrentUser AuthContext.Principal user,
            @RequestBody JobRequest req) {
        if (req.avatarId() == null || req.avatarId().isBlank()) {
            throw new com.xin.ai.common.exception.BizException(
                    com.xin.ai.common.exception.ErrorCode.COMMON_BAD_REQUEST,
                    Map.of("message", "必须选择数字人形象"));
        }
        boolean hasAudio = (req.audioAssetId() != null && !req.audioAssetId().isBlank())
                || (req.ttsText() != null && !req.ttsText().isBlank());
        if (!hasAudio) {
            throw new com.xin.ai.common.exception.BizException(
                    com.xin.ai.common.exception.ErrorCode.COMMON_BAD_REQUEST,
                    Map.of("message", "必须提供音频素材或口播文案"));
        }
        boolean lipsync = "改口型".equals(req.mode()) || "lipsync".equals(req.mode());
        String modelKey = lipsync ? "lipsync.volc.1min" : "image-speak.60s";
        Map<String, Object> params = Map.of(
                "avatar_id", req.avatarId(),
                "audio_asset_id", req.audioAssetId() == null ? "" : req.audioAssetId(),
                "tts_text", req.ttsText() == null ? "" : req.ttsText(),
                "script", req.script() == null ? "" : req.script(),
                "mode", req.mode() == null ? "口播" : req.mode(),
                "title", lipsync ? "视频改口型" : "图片口播");
        Map<String, Object> quote = billing.quote(user.userId(), modelKey, null, 1, params);
        return ok(tasks.submit(user.userId(), modelKey, null, 1, params,
                String.valueOf(quote.get("fingerprint")), null));
    }

    /** 授权文件。 */
    @GetMapping("/authorizations")
    public ApiResponse<List<Map<String, Object>>> authorizations(@CurrentUser AuthContext.Principal user) {
        return list(digitalHuman.listAuthorizations(user.userId()));
    }

    @PostMapping("/authorizations")
    public ApiResponse<Map<String, Object>> createAuthorization(@CurrentUser AuthContext.Principal user,
            @RequestBody AuthorizationRequest req) {
        return ok(digitalHuman.createAuthorization(user.userId(), req.type(), req.subject(), req.fileUrl()));
    }

    // ---------------- 请求体 ----------------

    public record CreateAvatarRequest(String assetId, String name) {}

    public record CloneVoiceRequest(String name, List<String> audioAssetIds) {}

    public record CreateSlotRequest(String voiceId, String name, int index) {}

    public record TtsRequest(String text, String voiceId) {}

    public record JobRequest(String avatarId, String audioAssetId, String ttsText, String script, String mode) {}

    public record AuthorizationRequest(String type, String subject, String fileUrl) {}
}
