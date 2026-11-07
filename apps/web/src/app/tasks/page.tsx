"use client";

/**
 * 任务中心 —— 用户自己的生成任务列表 + 取消 / 重试。
 * 行内注释1：为什么需要这个页 ——
 *             后端 GET /tasks、POST /tasks/{id}/cancel、POST /tasks/{id}/retry
 *             此前完全没有前端入口 —— listTasks 函数定义了却从未被调用，
 *             导致用户看不到自己的任务历史，也无从取消排队中的任务或重试失败任务。
 * 行内注释2：状态与后端一致 —— pending/running/succeeded/failed/canceled。
 *             「取消」只对 pending 开放，「重试」只对 failed 开放，
 *             与后端 TaskOrchestrator 的护栏完全对齐（前端只是提前拦一道，不代替后端校验）。
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/features/WorkspaceShell";
import { useToast } from "@/components/features/ToastHost";
import { Badge, Card, CardBody, EmptyState, Table, Td, Th } from "@/components/ui/surfaces";
import { Button, Input } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api";
import {
  cancelTask,
  listTasks,
  retryTask,
  type TaskRecord,
} from "@/lib/backend/tasks";

const STATUS_META: Record<string, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" }> = {
  pending: { label: "排队中", tone: "neutral" },
  running: { label: "生成中", tone: "accent" },
  succeeded: { label: "已完成", tone: "success" },
  failed: { label: "已失败", tone: "danger" },
  canceled: { label: "已取消", tone: "warning" },
};

const FILTERS = [
  { key: "", label: "全部" },
  { key: "pending", label: "排队中" },
  { key: "running", label: "生成中" },
  { key: "succeeded", label: "已完成" },
  { key: "failed", label: "已失败" },
  { key: "canceled", label: "已取消" },
];

export default function TasksPage() {
  const { push } = useToast();
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<TaskRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listTasks({
        page: 1,
        pageSize: 50,
        status: status || undefined,
        query: query.trim() || undefined,
      });
      setRows(res.data ?? []);
      setTotal(res.pagination?.total ?? (res.data ?? []).length);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "加载任务失败";
      push({ tone: "warning", title: "加载失败", description: msg });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const onCancel = async (t: TaskRecord) => {
    setBusyId(t.id);
    try {
      await cancelTask(t.id);
      push({ tone: "neutral", title: "已取消", description: `${t.title ?? t.id} 的积分已退回` });
      void load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "取消失败";
      push({ tone: "danger", title: "取消失败", description: msg });
    } finally {
      setBusyId(null);
    }
  };

  const onRetry = async (t: TaskRecord) => {
    setBusyId(t.id);
    try {
      await retryTask(t.id);
      push({ tone: "success", title: "已重新排队", description: t.title ?? t.id });
      void load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "重试失败";
      push({ tone: "danger", title: "重试失败", description: msg });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <WorkspaceShell>
      <section className="mx-auto flex w-full max-w-shell flex-col gap-6 bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6">
        <header className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">任务中心</h1>
            <p className="mt-1 text-xs text-muted">共 {total} 个任务 · 排队中可取消，失败可重试</p>
          </div>
          <Link
            href="/assets"
            className="ml-auto text-xs text-muted underline underline-offset-2 hover:text-foreground"
          >
            查看我的资产
          </Link>
        </header>

        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatus(f.key)}
              aria-pressed={status === f.key}
              className={
                status === f.key
                  ? "rounded-full bg-accent-muted px-3 py-1.5 text-[11px] font-semibold text-accent-deep transition-colors"
                  : "rounded-full px-3 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-foreground"
              }
            >
              {f.label}
            </button>
          ))}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题或任务 ID"
            aria-label="搜索任务"
            className="ml-auto max-w-xs"
          />
        </div>

        <Card>
          <CardBody className="p-0">
            {loading ? (
              <p className="py-10 text-center text-xs text-muted">加载中…</p>
            ) : rows.length === 0 ? (
              <EmptyState title="没有匹配的任务" description="生成一次内容后，任务会出现在这里" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>任务</Th>
                    <Th>模型</Th>
                    <Th>状态</Th>
                    <Th>进度</Th>
                    <Th className="text-right">积分</Th>
                    <Th>时间</Th>
                    <Th className="text-right">操作</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const meta = STATUS_META[t.status] ?? { label: t.status, tone: "neutral" as const };
                    const canCancel = t.status === "pending";
                    const canRetry = t.status === "failed";
                    return (
                      <tr key={t.id}>
                        <Td>
                          <p className="text-fg">{t.title || t.id}</p>
                          <p className="tabular mt-0.5 text-[11px] text-fg-subtle">{t.id}</p>
                          {t.fail_reason ? (
                            <p className="mt-0.5 max-w-xs truncate text-[11px] text-danger" title={t.fail_reason}>
                              {t.fail_reason}
                            </p>
                          ) : null}
                        </Td>
                        <Td className="tabular text-fg-muted">{t.model || t.model_key || "—"}</Td>
                        <Td>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
                              <div
                                className="h-full rounded-full bg-accent transition-[width]"
                                style={{ width: `${Math.max(0, Math.min(100, t.progress ?? 0))}%` }}
                              />
                            </div>
                            <span className="tabular text-[11px] text-fg-subtle">{t.progress ?? 0}%</span>
                          </div>
                        </Td>
                        <Td className="tabular text-right text-fg-muted">
                          {t.points_charged ?? t.points ?? 0}
                        </Td>
                        <Td className="tabular whitespace-nowrap text-fg-subtle">{t.created_at ?? "—"}</Td>
                        <Td>
                          <span className="flex justify-end gap-1">
                            {canCancel ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busyId === t.id}
                                onClick={() => void onCancel(t)}
                              >
                                取消
                              </Button>
                            ) : null}
                            {canRetry ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={busyId === t.id}
                                onClick={() => void onRetry(t)}
                              >
                                重试
                              </Button>
                            ) : null}
                            {!canCancel && !canRetry ? (
                              <span className="text-[11px] text-fg-subtle">—</span>
                            ) : null}
                          </span>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </section>
    </WorkspaceShell>
  );
}
