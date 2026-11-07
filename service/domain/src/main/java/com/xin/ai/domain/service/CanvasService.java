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
 * 画布服务：项目 CRUD + graph 存取（版本冲突检测）+ 版本快照 + 分享链接 + 模板。
 * 行内注释1：PUT graph 带 version 号，服务端比对当前版本，不一致返回 409 canvas.version_conflict。
 * 行内注释2：每次成功写入生成一个版本快照，供回滚使用。
 * 行内注释3：前端当前用 localStorage（xin-canvas-projects），接后端时按 Project{id,title,at} + Card{id,x,y,text} 结构平替。
 */
@Service
public class CanvasService {

    public static final String T_CANVASES = "canvases";
    public static final String T_VERSIONS = "canvas_versions";
    public static final String T_TEMPLATES = "canvas_templates";

    private final DataStore store;

    public CanvasService(DataStore store) {
        this.store = store;
    }

    public List<Map<String, Object>> list(String userId) {
        return store.listWhere(T_CANVASES, r -> Rows.strEq(r, "user_id", userId)).stream()
                .sorted((a, b) -> Rows.str(b, "updated_at").compareTo(Rows.str(a, "updated_at")))
                .map(c -> Rows.row(
                        "id", Rows.str(c, "id"),
                        "title", Rows.str(c, "title", "未命名画布"),
                        "at", Rows.str(c, "updated_at"),
                        "version", Rows.num(c, "version")))
                .toList();
    }

    public Map<String, Object> create(String userId, String title) {
        String id = "cvs_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        Map<String, Object> c = Rows.row(
                "id", id, "user_id", userId,
                "title", title == null || title.isBlank() ? "未命名画布" : title.trim(),
                "version", 0,
                "nodes", List.of(), "edges", List.of(),
                "share_url", "",
                "created_at", Times.full(Times.now()),
                "updated_at", Times.full(Times.now()));
        store.put(T_CANVASES, id, c);
        return view(c);
    }

    public Map<String, Object> get(String userId, String id) {
        return view(requireOwned(userId, id));
    }

    public Map<String, Object> rename(String userId, String id, String title) {
        requireOwned(userId, id);
        Map<String, Object> updated = store.update(T_CANVASES, id, Rows.row(
                "title", title == null ? "未命名画布" : title.trim(),
                "updated_at", Times.full(Times.now()))).orElseThrow();
        return view(updated);
    }

    public void delete(String userId, String id) {
        requireOwned(userId, id);
        store.delete(T_CANVASES, id);
    }

    // 行内注释4：整图存取 —— version 不匹配抛 409；匹配则写入并生成新版本快照。
    public Map<String, Object> saveGraph(String userId, String id, List<Object> nodes, List<Object> edges, Integer version) {
        Map<String, Object> canvas = requireOwned(userId, id);
        int current = Rows.num(canvas, "version");
        if (version != null && version != current) {
            throw new BizException(ErrorCode.CANVAS_VERSION_CONFLICT,
                    Map.of("current_version", current, "your_version", version));
        }
        int next = current + 1;
        store.update(T_CANVASES, id, Rows.row(
                "nodes", nodes == null ? List.of() : nodes,
                "edges", edges == null ? List.of() : edges,
                "version", next,
                "updated_at", Times.full(Times.now())));
        String versionId = "v" + next;
        store.put(T_VERSIONS, id + ":" + versionId, Rows.row(
                "id", versionId, "canvas_id", id, "user_id", userId,
                "version", next, "nodes", nodes == null ? List.of() : nodes,
                "edges", edges == null ? List.of() : edges,
                "created_at", Times.full(Times.now())));
        return view(store.find(T_CANVASES, id).orElse(canvas));
    }

    public List<Map<String, Object>> versions(String userId, String canvasId) {
        requireOwned(userId, canvasId);
        return store.listWhere(T_VERSIONS, r -> Rows.strEq(r, "canvas_id", canvasId)).stream()
                .sorted((a, b) -> Rows.num(b, "version") - Rows.num(a, "version"))
                .map(v -> Rows.row(
                        "version", Rows.num(v, "version"),
                        "created_at", Rows.str(v, "created_at"),
                        "node_count", Rows.list(v, "nodes").size()))
                .toList();
    }

    // 行内注释5：回滚 —— 把历史版本的 nodes/edges 写回，并生成新版本号（不覆盖历史）。
    public Map<String, Object> restore(String userId, String canvasId, String version) {
        requireOwned(userId, canvasId);
        Map<String, Object> v = store.find(T_VERSIONS, canvasId + ":" + version).orElse(null);
        if (v == null) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        return saveGraph(userId, canvasId, Rows.list(v, "nodes"), Rows.list(v, "edges"), null);
    }

    // 行内注释6：分享链接 —— 生成只读访问 URL。
    public Map<String, Object> share(String userId, String canvasId) {
        requireOwned(userId, canvasId);
        String shareUrl = "https://xin-ai.local/s/" + canvasId;
        store.update(T_CANVASES, canvasId, Rows.row(
                "share_url", shareUrl, "updated_at", Times.full(Times.now())));
        return Rows.row("share_url", shareUrl);
    }

    // 行内注释7：画布模板 —— 固定基线，前端画布页可直接选。
    public List<Map<String, Object>> templates() {
        return List.of(
                tpl("tpl_blank", "空白画布", "从零开始搭建"),
                tpl("tpl_ec_set", "商详套图流程", "卖点分析 → 主图 → 细节 → 场景"),
                tpl("tpl_video_story", "短视频分镜", "分镜表 → 角色 → 场景 → 成片"),
                tpl("tpl_brand", "品牌视觉板", "Logo → 色彩 → 字体 → 应用场景"));
    }

    private Map<String, Object> tpl(String id, String label, String desc) {
        return Rows.row("id", id, "label", label, "description", desc);
    }

    private Map<String, Object> view(Map<String, Object> c) {
        return Rows.row(
                "id", Rows.str(c, "id"),
                "title", Rows.str(c, "title", ""),
                "version", Rows.num(c, "version"),
                "nodes", Rows.list(c, "nodes"),
                "edges", Rows.list(c, "edges"),
                "share_url", Rows.str(c, "share_url", ""),
                "updated_at", Rows.str(c, "updated_at"));
    }

    private Map<String, Object> requireOwned(String userId, String id) {
        Map<String, Object> c = store.find(T_CANVASES, id).orElse(null);
        if (c == null || !Rows.strEq(c, "user_id", userId)) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        return c;
    }
}
