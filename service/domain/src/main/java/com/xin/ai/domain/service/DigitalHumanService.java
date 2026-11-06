package com.xin.ai.domain.service;

import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.domain.repository.MemStore;
import com.xin.ai.domain.repository.Rows;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * 数字人服务：形象 / 音色 / 槽位 / 口播任务 / 授权文件。
 * 行内注释1：形象必须完成标准化（standardized=true）才允许提交口播与厂家介绍视频任务。
 * 行内注释2：口播任务 ready 条件 = 有形象 + 有音频（TTS 生成或上传）。
 * 行内注释3：授权文件属敏感链路，实际生产需走官方直连 + 人工审核。
 */
@Service
public class DigitalHumanService {

    public static final String T_AVATARS = "avatars";
    public static final String T_VOICES = "voices";
    public static final String T_SLOTS = "voice_slots";
    public static final String T_AUTHORIZATIONS = "authorizations";

    private final MemStore store;

    public DigitalHumanService(MemStore store) {
        this.store = store;
    }

    // 行内注释4：形象列表 —— standardized_only=true 时只返回已标准化的。
    public List<Map<String, Object>> listAvatars(String userId, boolean standardizedOnly) {
        return store.listWhere(T_AVATARS, r -> Rows.str(r, "user_id").equals(userId)).stream()
                .filter(r -> !standardizedOnly || Rows.bool(r, "standardized"))
                .sorted((a, b) -> Rows.str(b, "created_at").compareTo(Rows.str(a, "created_at")))
                .map(a -> Rows.row(
                        "id", Rows.str(a, "id"),
                        "name", Rows.str(a, "name", "未命名形象"),
                        "url", Rows.str(a, "url", ""),
                        "standardized", Rows.bool(a, "standardized")))
                .toList();
    }

    public Map<String, Object> createAvatar(String userId, String assetId, String name) {
        String id = "avt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        Map<String, Object> a = Rows.row(
                "id", id, "user_id", userId, "asset_id", assetId,
                "name", name == null || name.isBlank() ? "未命名形象" : name.trim(),
                "url", "https://cdn.local.invalid/avatars/" + id,
                "standardized", false,
                "created_at", Times.full(Times.now()));
        store.put(T_AVATARS, id, a);
        return Rows.row("id", id, "name", Rows.str(a, "name"), "url", Rows.str(a, "url"), "standardized", false);
    }

    // 行内注释5：标准化 —— 标记形象可参与生成任务。
    public Map<String, Object> standardize(String userId, String avatarId) {
        Map<String, Object> a = requireOwned(T_AVATARS, userId, avatarId);
        store.update(T_AVATARS, avatarId, Rows.row("standardized", true));
        return Rows.row("id", avatarId, "name", Rows.str(a, "name"),
                "url", Rows.str(a, "url"), "standardized", true);
    }

    public void deleteAvatar(String userId, String avatarId) {
        requireOwned(T_AVATARS, userId, avatarId);
        store.delete(T_AVATARS, avatarId);
    }

    // 行内注释6：音色列表与克隆 —— 克隆需提供参考音频资产。
    public List<Map<String, Object>> listVoices(String userId) {
        return store.listWhere(T_VOICES, r -> Rows.str(r, "user_id").equals(userId)).stream()
                .map(v -> Rows.row(
                        "id", Rows.str(v, "id"),
                        "name", Rows.str(v, "name", ""),
                        "source", Rows.str(v, "source", "builtin"),
                        "created_at", Rows.str(v, "created_at")))
                .toList();
    }

    public Map<String, Object> cloneVoice(String userId, String name, List<String> audioAssetIds) {
        if (audioAssetIds == null || audioAssetIds.isEmpty()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "至少需要一个参考音频"));
        }
        String id = "vce_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        store.put(T_VOICES, id, Rows.row(
                "id", id, "user_id", userId,
                "name", name == null || name.isBlank() ? "未命名音色" : name.trim(),
                "source", "clone",
                "audio_asset_ids", audioAssetIds,
                "created_at", Times.full(Times.now())));
        return Rows.row("id", id, "name", name == null ? "未命名音色" : name.trim(), "source", "clone");
    }

    // 行内注释7：音色槽位 —— 用户可保存的常用音色位。
    public List<Map<String, Object>> listSlots(String userId) {
        return store.listWhere(T_SLOTS, r -> Rows.str(r, "user_id").equals(userId)).stream()
                .map(s -> Rows.row(
                        "id", Rows.str(s, "id"),
                        "voice_id", Rows.str(s, "voice_id"),
                        "name", Rows.str(s, "name", ""),
                        "index", Rows.num(s, "index")))
                .toList();
    }

    public Map<String, Object> createSlot(String userId, String voiceId, String name, int index) {
        String id = "vsl_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        store.put(T_SLOTS, id, Rows.row(
                "id", id, "user_id", userId, "voice_id", voiceId,
                "name", name == null ? "" : name, "index", index,
                "created_at", Times.full(Times.now())));
        return Rows.row("id", id, "voice_id", voiceId, "name", name == null ? "" : name, "index", index);
    }

    // 行内注释8：授权文件 —— 肖像与声音授权登记。
    public List<Map<String, Object>> listAuthorizations(String userId) {
        return store.listWhere(T_AUTHORIZATIONS, r -> Rows.str(r, "user_id").equals(userId)).stream()
                .map(a -> Rows.row(
                        "id", Rows.str(a, "id"),
                        "type", Rows.str(a, "type", "portrait"),
                        "subject", Rows.str(a, "subject", ""),
                        "file_url", Rows.str(a, "file_url", ""),
                        "status", Rows.str(a, "status", "pending"),
                        "created_at", Rows.str(a, "created_at")))
                .toList();
    }

    public Map<String, Object> createAuthorization(String userId, String type, String subject, String fileUrl) {
        String id = "ath_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        store.put(T_AUTHORIZATIONS, id, Rows.row(
                "id", id, "user_id", userId,
                "type", type == null || type.isBlank() ? "portrait" : type,
                "subject", subject == null ? "" : subject,
                "file_url", fileUrl == null ? "" : fileUrl,
                "status", "pending",
                "created_at", Times.full(Times.now())));
        return Rows.row("id", id, "type", type, "status", "pending");
    }

    private Map<String, Object> requireOwned(String table, String userId, String id) {
        Map<String, Object> row = store.find(table, id).orElse(null);
        if (row == null || !Rows.str(row, "user_id").equals(userId)) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        return row;
    }
}
