package com.xin.ai.domain.repository;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Predicate;

/**
 * 内存仓储：按「实体类型 → id → 字段」三级存放。
 * 行内注释1：本期无 PG 环境，先以内存实现跑通全部业务逻辑，接口保持与 MyBatis-Plus Mapper 同形，后续可平替。
 * 行内注释2：字段用 Map 承载，避免为每张表重复生成 POJO + Mapper 样板代码。
 * 行内注释3：写入返回字段副本，调用方拿到的对象与内部状态隔离，避免外部误改。
 */
public class MemStore {

    private final Map<String, Map<String, Map<String, Object>>> byType = new ConcurrentHashMap<>();

    public Map<String, Object> put(String type, String id, Map<String, Object> fields) {
        Map<String, Object> row = new LinkedHashMap<>(fields);
        row.put("id", id);
        byType.computeIfAbsent(type, k -> new ConcurrentHashMap<>()).put(id, row);
        return new LinkedHashMap<>(row);
    }

    public Optional<Map<String, Object>> find(String type, String id) {
        Map<String, Map<String, Object>> bucket = byType.get(type);
        if (bucket == null) {
            return Optional.empty();
        }
        Map<String, Object> row = bucket.get(id);
        return row == null ? Optional.empty() : Optional.of(new LinkedHashMap<>(row));
    }

    public boolean exists(String type, String id) {
        Map<String, Map<String, Object>> bucket = byType.get(type);
        return bucket != null && bucket.containsKey(id);
    }

    public List<Map<String, Object>> list(String type) {
        Map<String, Map<String, Object>> bucket = byType.get(type);
        if (bucket == null) {
            return List.of();
        }
        List<Map<String, Object>> out = new ArrayList<>(bucket.size());
        bucket.values().forEach(v -> out.add(new LinkedHashMap<>(v)));
        return out;
    }

    public List<Map<String, Object>> listWhere(String type, Predicate<Map<String, Object>> filter) {
        return list(type).stream().filter(filter).toList();
    }

    public long countWhere(String type, Predicate<Map<String, Object>> filter) {
        return listWhere(type, filter).size();
    }

    public boolean delete(String type, String id) {
        Map<String, Map<String, Object>> bucket = byType.get(type);
        return bucket != null && bucket.remove(id) != null;
    }

    public int deleteWhere(String type, Predicate<Map<String, Object>> filter) {
        List<String> ids = listWhere(type, filter).stream().map(r -> String.valueOf(r.get("id"))).toList();
        ids.forEach(id -> delete(type, id));
        return ids.size();
    }

    /** 更新已有行（不存在则不新建）。 */
    public Optional<Map<String, Object>> update(String type, String id, Map<String, Object> patch) {
        Map<String, Map<String, Object>> bucket = byType.get(type);
        if (bucket == null) {
            return Optional.empty();
        }
        Map<String, Object> row = bucket.get(id);
        if (row == null) {
            return Optional.empty();
        }
        row.putAll(patch);
        return Optional.of(new LinkedHashMap<>(row));
    }

    public void clear(String type) {
        byType.remove(type);
    }

    public Map<String, Object> newRow() {
        return new LinkedHashMap<>();
    }

    public List<Map<String, Object>> emptyList() {
        return Collections.emptyList();
    }
}
