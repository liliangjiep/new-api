package com.xin.ai.domain.service;

import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.domain.repository.DataStore;
import com.xin.ai.domain.repository.Rows;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * 资产服务：两段式直传（upload-policy → complete）+ 列表/改名/分组/删除。
 * 行内注释1：直传不经后端中转大文件 —— policy 返回上传凭证，前端直连对象存储，再回调 complete 落库。
 * 行内注释2：size 上限按 kind 区分（头像 5MB / 图片 20MB / 视频 500MB / 音频 50MB）。
 * 行内注释3：source 维度区分 upload（用户上传）与 ai（AI 生成产物），对应前端 AssetPickerModal 的筛选。
 */
@Service
public class AssetService {

    public static final String T_ASSETS = "assets";
    public static final String T_GROUPS = "asset_groups";
    public static final String T_POLICIES = "upload_policies";

    private static final int POLICY_TTL_SECONDS = 300;
    private static final long MAX_IMAGE = 20L * 1024 * 1024;
    private static final long MAX_AVATAR = 5L * 1024 * 1024;
    private static final long MAX_VIDEO = 500L * 1024 * 1024;
    private static final long MAX_AUDIO = 50L * 1024 * 1024;

    private final DataStore store;

    public AssetService(DataStore store) {
        this.store = store;
    }

    // 行内注释4：申请上传凭证 —— 校验类型与大小，返回直传地址与临时 header。
    public Map<String, Object> uploadPolicy(String userId, String filename, long size, String contentType,
            String kind, String group) {
        String normalizedKind = normalizeKind(kind, contentType, filename);
        long limit = switch (normalizedKind) {
            case "avatar" -> MAX_AVATAR;
            case "image" -> MAX_IMAGE;
            case "video" -> MAX_VIDEO;
            case "audio" -> MAX_AUDIO;
            default -> MAX_IMAGE;
        };
        if (size <= 0) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "size 必须大于 0"));
        }
        if (size > limit) {
            throw new BizException(ErrorCode.ASSET_TOO_LARGE,
                    Map.of("size", size, "limit", limit, "kind", normalizedKind));
        }
        String assetId = "ast_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String uploadUrl = "https://oss.local-direct-upload.invalid/" + userId + "/" + assetId + "/"
                + (filename == null || filename.isBlank() ? "file" : filename);
        Map<String, Object> headers = Rows.row("Content-Type", contentType == null ? "application/octet-stream" : contentType);
        Map<String, Object> policy = Rows.row(
                "upload_url", uploadUrl, "asset_id", assetId, "headers", headers,
                "expires_in", POLICY_TTL_SECONDS,
                "kind", normalizedKind, "group", group == null ? "" : group);
        store.put(T_POLICIES, assetId, Rows.row(
                "id", assetId, "user_id", userId, "kind", normalizedKind,
                "group", group == null ? "" : group,
                "filename", filename == null ? "" : filename,
                "content_type", contentType == null ? "" : contentType,
                "size", size, "created_at", Times.full(Times.now()),
                "expire_at", Times.full(Times.now().plusSeconds(POLICY_TTL_SECONDS))));
        return policy;
    }

    // 行内注释5：确认上传 —— 校验 policy 存在且未过期，写入资产行（此时资产才对用户可见）。
    public Map<String, Object> complete(String userId, String assetId, long size, String etag) {
        Map<String, Object> policy = store.find(T_POLICIES, assetId).orElse(null);
        if (policy == null || !Rows.str(policy, "user_id").equals(userId)) {
            throw new BizException(ErrorCode.ASSET_NOT_FOUND);
        }
        if (Times.parse(Rows.str(policy, "expire_at")).isBefore(Times.now())) {
            throw new BizException(ErrorCode.ASSET_TOO_LARGE, Map.of("message", "上传凭证已过期，请重新申请"));
        }
        String kind = Rows.str(policy, "kind");
        String group = Rows.str(policy, "group", "");
        Map<String, Object> asset = Rows.row(
                "id", assetId, "user_id", userId,
                "name", Rows.str(policy, "filename", assetId),
                "kind", kind,
                "size", size <= 0 ? Rows.num(policy, "size") : size,
                "content_type", Rows.str(policy, "content_type", ""),
                "etag", etag == null ? "" : etag,
                "group", group,
                "tags", List.of(),
                "source", "upload",
                "thumb", "",
                "url", "https://cdn.local.invalid/assets/" + assetId,
                "duration", 0,
                "created_at", Times.full(Times.now()));
        store.put(T_ASSETS, assetId, asset);
        store.delete(T_POLICIES, assetId);
        return view(asset);
    }

    // 行内注释6：资产列表 —— kind × source 两维筛选 + 文件名关键字 + 分组过滤。
    public List<Map<String, Object>> list(String userId, String kind, String group, String source,
            String query, int page, int pageSize) {
        List<Map<String, Object>> all = store.listWhere(T_ASSETS, r -> Rows.str(r, "user_id").equals(userId)).stream()
                .filter(r -> kind == null || kind.isBlank() || kind.equals(Rows.str(r, "kind")))
                .filter(r -> group == null || group.isBlank() || group.equals(Rows.str(r, "group")))
                .filter(r -> source == null || source.isBlank() || "all".equals(source) || source.equals(Rows.str(r, "source")))
                .filter(r -> query == null || query.isBlank() || Rows.str(r, "name", "").contains(query))
                .sorted((a, b) -> Rows.str(b, "created_at").compareTo(Rows.str(a, "created_at")))
                .toList();
        int from = Math.min((page - 1) * pageSize, all.size());
        int to = Math.min(from + pageSize, all.size());
        return all.subList(from, to).stream().map(this::view).toList();
    }

    public long count(String userId, String kind, String group, String source, String query) {
        return list(userId, kind, group, source, query, 1, Integer.MAX_VALUE).size();
    }

    // 行内注释7：改名 / 换组 / 打标签。
    public Map<String, Object> update(String userId, String assetId, String name, String group, List<String> tags) {
        Map<String, Object> asset = requireOwned(userId, assetId);
        Map<String, Object> patch = new LinkedHashMap<>();
        if (name != null && !name.isBlank()) {
            patch.put("name", name.trim());
        }
        if (group != null) {
            patch.put("group", group);
        }
        if (tags != null) {
            patch.put("tags", tags);
        }
        Map<String, Object> updated = store.update(T_ASSETS, assetId, patch).orElse(asset);
        return view(updated);
    }

    public void delete(String userId, String assetId) {
        requireOwned(userId, assetId);
        store.delete(T_ASSETS, assetId);
    }

    // 行内注释8：批量删除 —— 返回实际删除数量。
    public int batchDelete(String userId, List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        int n = 0;
        for (String id : ids) {
            if (store.find(T_ASSETS, id).map(a -> Rows.str(a, "user_id").equals(userId)).orElse(false)) {
                store.delete(T_ASSETS, id);
                n++;
            }
        }
        return n;
    }

    // 行内注释9：分组 CRUD —— assets 页的分组维度。
    public List<Map<String, Object>> listGroups(String userId) {
        List<Map<String, Object>> groups = store.listWhere(T_GROUPS, r -> Rows.str(r, "user_id").equals(userId));
        if (groups.isEmpty()) {
            // 默认给四个分组，与前端 mock 的「产品素材/成片归档/参考图/配音」一致
            for (String g : List.of("产品素材", "成片归档", "参考图", "配音")) {
                String id = "grp_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
                store.put(T_GROUPS, id, Rows.row("id", id, "user_id", userId, "name", g,
                        "created_at", Times.full(Times.now())));
            }
            groups = store.listWhere(T_GROUPS, r -> Rows.str(r, "user_id").equals(userId));
        }
        return groups.stream().map(g -> Rows.row(
                "id", Rows.str(g, "id"), "name", Rows.str(g, "name"),
                "count", store.countWhere(T_ASSETS,
                        r -> Rows.str(r, "user_id").equals(userId) && Rows.str(r, "group").equals(Rows.str(g, "name"))))).toList();
    }

    public Map<String, Object> createGroup(String userId, String name) {
        if (name == null || name.isBlank()) {
            throw new BizException(ErrorCode.COMMON_BAD_REQUEST, Map.of("message", "分组名不能为空"));
        }
        String id = "grp_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        Map<String, Object> g = Rows.row("id", id, "user_id", userId, "name", name.trim(),
                "created_at", Times.full(Times.now()));
        store.put(T_GROUPS, id, g);
        return Rows.row("id", id, "name", name.trim());
    }

    public void deleteGroup(String userId, String groupId) {
        Map<String, Object> g = store.find(T_GROUPS, groupId).orElse(null);
        if (g == null || !Rows.str(g, "user_id").equals(userId)) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        store.delete(T_GROUPS, groupId);
    }

    // 行内注释10：视图装配 —— 字段名与前端契约一致。
    private Map<String, Object> view(Map<String, Object> a) {
        return Rows.row(
                "id", Rows.str(a, "id"),
                "name", Rows.str(a, "name", ""),
                "kind", Rows.str(a, "kind", "image"),
                "size", Rows.num(a, "size"),
                "created_at", Rows.str(a, "created_at"),
                "group", Rows.str(a, "group", ""),
                "tags", Rows.list(a, "tags"),
                "thumb", Rows.str(a, "thumb", ""),
                "url", Rows.str(a, "url", ""),
                "duration", Rows.num(a, "duration"),
                "source", Rows.str(a, "source", "upload"));
    }

    private Map<String, Object> requireOwned(String userId, String assetId) {
        Map<String, Object> a = store.find(T_ASSETS, assetId).orElse(null);
        if (a == null || !Rows.str(a, "user_id").equals(userId)) {
            throw new BizException(ErrorCode.ASSET_NOT_FOUND);
        }
        return a;
    }

    // 行内注释11：kind 推断 —— 未显式指定时按 content_type 与文件名后缀判定。
    private String normalizeKind(String kind, String contentType, String filename) {
        if (kind != null && !kind.isBlank()) {
            return kind;
        }
        String ct = contentType == null ? "" : contentType.toLowerCase();
        String fn = filename == null ? "" : filename.toLowerCase();
        if (ct.startsWith("video/") || fn.endsWith(".mp4") || fn.endsWith(".mov")) {
            return "video";
        }
        if (ct.startsWith("audio/") || fn.endsWith(".wav") || fn.endsWith(".mp3")) {
            return "audio";
        }
        return "image";
    }
}
