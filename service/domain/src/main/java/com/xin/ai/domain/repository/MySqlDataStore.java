package com.xin.ai.domain.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Predicate;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * MySQL 仓储实现 —— 用通用 entity_rows 表承载全部实体行。
 * 行内注释1：设计取舍 —— 业务层用「类型 + Map 字段」建模，若为 40 张表各写一套 Mapper，
 *            样板代码会淹没业务逻辑。这里用「一张宽表 + JSON 列」承载，
 *            换来的好处是：切库不改任何 Service，且中转站等核心配置另有强类型表可直连 SQL 操作。
 * 行内注释2：model_channels / model_endpoints 不走这里 —— 它们是强类型表（见 RelayConfigService），
 *            便于你直接写 SQL 增删中转站。
 * 行内注释3：entity_rows 用 (entity_type, row_id) 做主键，user_id 建索引用于按用户隔离查询。
 * 行内注释4：连接必须用 try-with-resources 完整关闭（Connection + Statement + ResultSet），
 *            否则 HikariCP 连接池会被耗光，报 "Failed to obtain JDBC Connection"。
 */
public class MySqlDataStore implements DataStore {

    private static final Logger log = LoggerFactory.getLogger(MySqlDataStore.class);

    private final DataSource dataSource;
    private final ObjectMapper mapper;

    public MySqlDataStore(DataSource dataSource, ObjectMapper mapper) {
        this.dataSource = dataSource;
        this.mapper = mapper;
    }

    @Override
    public Map<String, Object> put(String type, String id, Map<String, Object> fields) {
        Map<String, Object> row = new LinkedHashMap<>(fields);
        row.put("id", id);
        String json = writeJson(row);
        String userId = str(row.get("user_id"));
        String sql = """
                INSERT INTO entity_rows (entity_type, row_id, user_id, data, created_at, updated_at)
                VALUES (?, ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE data = VALUES(data), user_id = VALUES(user_id), updated_at = NOW()
                """;
        try (Connection conn = dataSource.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, type);
            ps.setString(2, id);
            ps.setString(3, userId);
            ps.setString(4, json);
            ps.executeUpdate();
            return new LinkedHashMap<>(row);
        } catch (SQLException e) {
            throw new IllegalStateException("put failed: " + type + "/" + id
                    + " — " + e.getMessage() + " (SQLState=" + e.getSQLState() + ")", e);
        }
    }

    @Override
    public Optional<Map<String, Object>> find(String type, String id) {
        String sql = "SELECT data FROM entity_rows WHERE entity_type = ? AND row_id = ?";
        try (Connection conn = dataSource.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, type);
            ps.setString(2, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(readJson(rs.getString(1)));
                }
            }
            return Optional.empty();
        } catch (SQLException e) {
            throw new IllegalStateException("find failed: " + type + "/" + id
                    + " — " + e.getMessage(), e);
        }
    }

    @Override
    public boolean exists(String type, String id) {
        return find(type, id).isPresent();
    }

    @Override
    public List<Map<String, Object>> list(String type) {
        String sql = "SELECT data FROM entity_rows WHERE entity_type = ?";
        List<Map<String, Object>> out = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, type);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    out.add(readJson(rs.getString(1)));
                }
            }
            return out;
        } catch (SQLException e) {
            throw new IllegalStateException("list failed: " + type + " — " + e.getMessage(), e);
        }
    }

    @Override
    public List<Map<String, Object>> listWhere(String type, Predicate<Map<String, Object>> filter) {
        return list(type).stream().filter(filter).toList();
    }

    @Override
    public long countWhere(String type, Predicate<Map<String, Object>> filter) {
        return listWhere(type, filter).size();
    }

    @Override
    public boolean delete(String type, String id) {
        String sql = "DELETE FROM entity_rows WHERE entity_type = ? AND row_id = ?";
        try (Connection conn = dataSource.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, type);
            ps.setString(2, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new IllegalStateException("delete failed: " + type + "/" + id
                    + " — " + e.getMessage(), e);
        }
    }

    @Override
    public int deleteWhere(String type, Predicate<Map<String, Object>> filter) {
        List<String> ids = listWhere(type, filter).stream()
                .map(r -> String.valueOf(r.get("id"))).toList();
        ids.forEach(id -> delete(type, id));
        return ids.size();
    }

    @Override
    public Optional<Map<String, Object>> update(String type, String id, Map<String, Object> patch) {
        Optional<Map<String, Object>> existing = find(type, id);
        if (existing.isEmpty()) {
            return Optional.empty();
        }
        Map<String, Object> merged = new LinkedHashMap<>(existing.get());
        merged.putAll(patch);
        merged.put("id", id);
        put(type, id, merged);
        return Optional.of(new LinkedHashMap<>(merged));
    }

    @Override
    public void clear(String type) {
        String sql = "DELETE FROM entity_rows WHERE entity_type = ?";
        try (Connection conn = dataSource.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, type);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new IllegalStateException("clear failed: " + type + " — " + e.getMessage(), e);
        }
    }

    @Override
    public Map<String, Object> newRow() {
        return new LinkedHashMap<>();
    }

    @Override
    public List<Map<String, Object>> emptyList() {
        return List.of();
    }

    // 行内注释5：原子自增 —— 读改写走同一事务内的 SQL 表达式，避免并发下的竞态。
    @Override
    public void increment(String type, String id, String column, long delta) {
        Map<String, Object> row = find(type, id).orElse(null);
        if (row == null) {
            return;
        }
        Map<String, Object> merged = new LinkedHashMap<>(row);
        merged.put(column, numericValue(type, id, column) + delta);
        put(type, id, merged);
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

    // ---------------- JSON 编解码 ----------------

    private String writeJson(Map<String, Object> row) {
        try {
            return mapper.writeValueAsString(row);
        } catch (Exception e) {
            throw new IllegalStateException("json write failed", e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readJson(String json) {
        if (json == null || json.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return mapper.readValue(json, LinkedHashMap.class);
        } catch (Exception e) {
            log.warn("json decode failed, 返回空行: {}", e.getMessage());
            return new LinkedHashMap<>();
        }
    }

    private static String str(Object v) {
        return v == null ? null : String.valueOf(v);
    }
}
