package com.xin.ai.domain.service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * 任务事件总线 —— 任务状态变化的进程内发布订阅。
 * 行内注释1：用途 —— SSE 进度接口要「长连接、状态一变就推」，
 *             原来是一次性推完即断开，前端拿不到中间进度。
 * 行内注释2：发布方是 TaskOrchestrator（markRunning / markProgress / markSucceeded / markFailed），
 *             订阅方是 TaskController 的 SSE 端点。
 * 行内注释3：进程内实现 —— 单实例部署够用；多实例部署时换成 Redis Pub/Sub 广播即可，
 *             接口（publish / subscribe）保持不变。
 */
public class TaskEventBus {

    /** 事件类型。 */
    public static final String EV_PROGRESS = "progress";
    public static final String EV_DONE = "done";
    public static final String EV_FAILED = "failed";

    /** 事件载荷。 */
    public record TaskEvent(String taskId, String type, int progress, String status,
            Map<String, Object> payload) {}

    /** taskId → 订阅者列表。 */
    private final Map<String, List<Consumer<TaskEvent>>> subscribers = new ConcurrentHashMap<>();

    /**
     * 订阅任务事件 —— 返回取消订阅的句柄。
     * 行内注释4：订阅者收到事件后应自行判断是否移除（SSE 完成时调用返回的 Runnable）。
     */
    public Runnable subscribe(String taskId, Consumer<TaskEvent> consumer) {
        List<Consumer<TaskEvent>> list =
                subscribers.computeIfAbsent(taskId, k -> new CopyOnWriteArrayList<>());
        list.add(consumer);
        return () -> {
            list.remove(consumer);
            if (list.isEmpty()) {
                subscribers.remove(taskId);
            }
        };
    }

    /**
     * 发布事件 —— 没有订阅者时静默丢弃（前端可能没开 SSE，只有轮询）。
     */
    public void publish(TaskEvent event) {
        List<Consumer<TaskEvent>> list = subscribers.get(event.taskId());
        if (list == null || list.isEmpty()) {
            return;
        }
        for (Consumer<TaskEvent> c : list) {
            try {
                c.accept(event);
            } catch (Exception ignored) {
                // 行内注释5：单个订阅者异常（连接已断）不能影响其它订阅者。
            }
        }
    }

    /** 当前订阅数 —— 排障用。 */
    public int subscriberCount(String taskId) {
        List<Consumer<TaskEvent>> list = subscribers.get(taskId);
        return list == null ? 0 : list.size();
    }
}
