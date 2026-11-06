package com.xin.ai.domain.service;

import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.domain.catalog.Catalog;
import com.xin.ai.domain.repository.MemStore;
import com.xin.ai.domain.repository.Rows;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * 发现服务：公开内容流（游标分页）+ 详情 + 一键复用参数快照。
 * 行内注释1：内容条目来自用户公开的生成任务（source=ai 的资产 + 已公开任务），无数据时回落基线样例。
 * 行内注释2：params_snapshot 保存生成参数，供「一键复用」跳回工具页。
 * 行内注释3：cursor 为不透明的 offset 字符串，前端只做透传。
 */
@Service
public class DiscoverService {

    public static final String T_ITEMS = "discover_items";

    private final MemStore store;

    public DiscoverService(MemStore store) {
        this.store = store;
    }

    // 行内注释4：内容流 —— filter 支持 全部/图片/视频/数字人/石材，query 匹配标题。
    public Map<String, Object> feed(String filter, String query, String cursor, int limit) {
        int offset = 0;
        if (cursor != null && !cursor.isBlank()) {
            try {
                offset = Integer.parseInt(new String(java.util.Base64.getUrlDecoder().decode(cursor)));
            } catch (RuntimeException e) {
                offset = 0;
            }
        }
        int size = limit <= 0 ? 20 : Math.min(limit, 50);
        List<Map<String, Object>> all = store.listWhere(T_ITEMS, r -> true).stream()
                .filter(r -> filter == null || filter.isBlank() || "全部".equals(filter)
                        || filter.equals(Rows.str(r, "capability")))
                .filter(r -> query == null || query.isBlank() || Rows.str(r, "title", "").contains(query))
                .toList();
        int from = Math.min(offset, all.size());
        int to = Math.min(from + size, all.size());
        List<Map<String, Object>> page = all.subList(from, to).stream().map(this::view).toList();
        String next = to < all.size()
                ? java.util.Base64.getUrlEncoder().withoutPadding()
                        .encodeToString(String.valueOf(to).getBytes(java.nio.charset.StandardCharsets.UTF_8))
                : null;
        return Rows.row("items", page, "next_cursor", next);
    }

    public Map<String, Object> detail(String itemId) {
        Map<String, Object> item = store.find(T_ITEMS, itemId).orElse(null);
        if (item == null) {
            throw new BizException(ErrorCode.COMMON_NOT_FOUND);
        }
        return view(item);
    }

    // 行内注释5：发布内容 —— 生成任务完成后可公开到发现流。
    public Map<String, Object> publish(String userId, String title, String coverUrl, String capability,
            int points, List<String> tags, String toolHref, Map<String, Object> paramsSnapshot) {
        String id = "dsc_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        Map<String, Object> item = Rows.row(
                "id", id, "user_id", userId,
                "title", title == null ? "未命名作品" : title,
                "cover_url", coverUrl == null ? "" : coverUrl,
                "capability", capability == null ? "image" : capability,
                "points", points,
                "tags", tags == null ? List.of() : tags,
                "tool_href", toolHref == null ? "/toolbox/image-generation" : toolHref,
                "params_snapshot", paramsSnapshot == null ? Map.of() : paramsSnapshot,
                "likes", 0,
                "created_at", Times.full(Times.now()));
        store.put(T_ITEMS, id, item);
        return view(item);
    }

    public void like(String itemId) {
        Map<String, Object> item = store.find(T_ITEMS, itemId).orElse(null);
        if (item != null) {
            store.update(T_ITEMS, itemId, Rows.row("likes", Rows.num(item, "likes") + 1));
        }
    }

    // 行内注释6：视图装配。
    private Map<String, Object> view(Map<String, Object> i) {
        return Rows.row(
                "id", Rows.str(i, "id"),
                "title", Rows.str(i, "title", ""),
                "cover_url", Rows.str(i, "cover_url", ""),
                "capability", Rows.str(i, "capability", ""),
                "points", Rows.num(i, "points"),
                "tags", Rows.list(i, "tags"),
                "tool_href", Rows.str(i, "tool_href", ""),
                "params_snapshot", Rows.map(i, "params_snapshot"),
                "likes", Rows.num(i, "likes"),
                "created_at", Rows.str(i, "created_at"));
    }
}
