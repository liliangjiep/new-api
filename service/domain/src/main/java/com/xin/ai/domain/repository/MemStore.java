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
 * 行内注释1：作为 DataStore 的内存实现，用于无数据库环境的开发/测试。
 * 行内注释2：字段用 Map 承载，避免为每张表重复生成 POJO + Mapper 样板代码。
 * 行内注释3：写入返回字段副本，调用方拿到的对象与内部状态隔离，避免外部误改。
 */
public class MemStore implements DataStore {

    private final Map<String, Map<String, Map<String, Object>>> byType = new ConcurrentHashMap<>();

    @Override
    public Map<String, Object> put(String type, String id, Map<String, Object> fields) {
        Map<String, Object> row = new LinkedHashMap<>(fields);
        row.put("id", id);
        byType.computeIfAbsent(type, k -> new ConcurrentHashMap<>()).put(id, row);
        return new LinkedHashMap<>(row);
    }

    @Override
    public Optional<Map<String, Object>> find(String type, String id) {
        Map<String, Map<String, Object>> bucket = byType.get(type);
        if (bucket == null) {
            return Optional.empty();
        }
        Map<String, Object> row = bucket.get(id);
        return row == null ? Optional.empty() : Optional.of(new LinkedHashMap<>(row));
    }

    @Override
    public boolean exists(String type, String id) {
        Map<String, Map<String, Object>> bucket = byType.get(type);
        return bucket != null && bucket.containsKey(id);
    }

    @Override
    public List<Map<String, Object>> list(String type) {
        Map<String, Map<String, Object>> bucket = byType.get(type);
        if (bucket == null) {
            return List.of();
        }
        List<Map<String, Object>> out = new ArrayList<>(bucket.size());
        bucket.values().forEach(v -> out.add(new LinkedHashMap<>(v)));
        return out;
    }

    @Override
    public List<Map<String, Object>> listWhere(String type, Predicate<Map<String, Object>> filter) {
        return list(type).stream().filter(filter).toList();
    }

    /**
     * 按类型前缀批量查询 —— 内存实现直接扫全部桶。
     * 行内注释1：跨用户聚合用（如全站积分流水 point_ledger_*）。
     */
    @Override
    public List<Map<String, Object>> listByTypePrefix(String prefix) {
        List<Map<String, Object>> out = new ArrayList<>();
        byType.forEach((type, bucket) -> {
            if (type != null && type.startsWith(prefix)) {
                bucket.values().forEach(v -> out.add(new LinkedHashMap<>(v)));
            }
        });
        return out;
    }

    @Override
    public long countWhere(String type, Predicate<Map<String, Object>> filter) {
        return listWhere(type, filter).size();
    }

    @Override
    public boolean delete(String type, String id) {
        Map<String, Map<String, Object>> bucket = byType.get(type);
        return bucket != null && bucket.remove(id) != null;
    }

    @Override
    public int deleteWhere(String type, Predicate<Map<String, Object>> filter) {
        List<String> ids = listWhere(type, filter).stream().map(r -> String.valueOf(r.get("id"))).toList();
        ids.forEach(id -> delete(type, id));
        return ids.size();
    }

    /** 更新已有行（不存在则不新建）。 */
    @Override
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

    @Override
    public void clear(String type) {
        byType.remove(type);
    }

    @Override
    public Map<String, Object> newRow() {
        return new LinkedHashMap<>();
    }

    @Override
    public List<Map<String, Object>> emptyList() {
        return Collections.emptyList();
    }

    // 行内注释4：原子自增 —— 用 compute 保证同一 key 的读改写不被打断。
    @Override
    public void increment(String type, String id, String column, long delta) {
        byType.computeIfAbsent(type, k -> new ConcurrentHashMap<>()).computeIfPresent(id, (k, row) -> {
            Object cur = row.get(column);
            long base = 0;
            if (cur instanceof Number n) {
                base = n.longValue();
            } else if (cur != null) {
                try {
                    base = Long.parseLong(String.valueOf(cur));
                } catch (NumberFormatException ignored) {
                    base = 0;
                }
            }
            row.put(column, base + delta);
            return row;
        });
    }

    @Override
    public long numericValue(String type, String id, String column) {
        Map<String, Object> row = find(type, id).orElse(null);
        if (row == null) {
            return 0L;
        }
        Object v = row.get(column);
        if (v instanceof Number n) {
            return n.longValue();
        }
        try {
            return v == null ? 0L : Long.parseLong(String.valueOf(v));
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
