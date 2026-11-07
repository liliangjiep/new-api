package com.xin.ai.domain.repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Predicate;

/**
 * 数据仓储抽象 —— 内存与 MySQL 双实现，业务层无感切换。
 * 行内注释1：这是 MemStore 的接口化 —— 业务代码只依赖本接口，
 *            切库时只换实现（DomainConfig 里的 @Bean），不改任何 Service。
 * 行内注释2：语义与原 MemStore 完全一致，避免切换期行为漂移。
 */
public interface DataStore {

    /** 写入或覆盖一行，返回字段副本。 */
    Map<String, Object> put(String type, String id, Map<String, Object> fields);

    /** 按主键查一行。 */
    Optional<Map<String, Object>> find(String type, String id);

    /** 判断是否存在。 */
    boolean exists(String type, String id);

    /** 列出该类型的全部行。 */
    List<Map<String, Object>> list(String type);

    /** 条件查询。 */
    List<Map<String, Object>> listWhere(String type, Predicate<Map<String, Object>> filter);

    /**
     * 按类型前缀批量查询 —— 用于「跨用户」聚合。
     * 行内注释1：积分流水按用户分表（point_ledger_{userId}），
     *            后台运营视角要看全站流水，就得按前缀把分散的行捞出来。
     */
    List<Map<String, Object>> listByTypePrefix(String prefix);

    /** 条件计数。 */
    long countWhere(String type, Predicate<Map<String, Object>> filter);

    /** 按主键删除。 */
    boolean delete(String type, String id);

    /** 条件删除。 */
    int deleteWhere(String type, Predicate<Map<String, Object>> filter);

    /** 更新已有行（不存在则不新建）。 */
    Optional<Map<String, Object>> update(String type, String id, Map<String, Object> patch);

    /** 清空某类型。 */
    void clear(String type);

    /** 新建空行。 */
    Map<String, Object> newRow();

    /** 空列表常量。 */
    List<Map<String, Object>> emptyList();

    /**
     * 原子自增 —— 用于余额/计数这类需要并发安全的字段。
     * 行内注释3：内存实现用 CAS 循环；MySQL 实现用 UPDATE ... SET col = col + delta。
     */
    void increment(String type, String id, String column, long delta);

    /**
     * 读取带类型的数值列 —— 供 increment 之类的原子操作前置判断。
     */
    long numericValue(String type, String id, String column);
}
