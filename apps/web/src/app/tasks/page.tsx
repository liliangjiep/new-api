"use client";

import { useEffect, useMemo, useState } from "react";
import { StudioShell } from "@/components/layout/StudioShell";
import { Button, Input } from "@/components/ui/primitives";
import { Card, CardBody, Badge, Progress, Table, Th, Td, EmptyState, Tabs, ErrorState } from "@/components/ui/surfaces";
import { Drawer } from "@/components/ui/overlays";
import { MOCK_TASKS, TASK_STATUS_META, type TaskStatus } from "@/lib/domain";
import { useToast } from "@/components/features/ToastHost";
import { cn } from "@/lib/cn";
import { Search, RotateCw, RefreshCw, XCircle, Eye, Download } from "lucide-react";

const FILTERS: { id: TaskStatus | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "pending", label: "排队中" },
  { id: "running", label: "生成中" },
  { id: "succeeded", label: "已完成" },
  { id: "failed", label: "已失败" },
];

interface LiveTask {
  id: string;
  title: string;
  capability: string;
  status: TaskStatus;
  progress: number;
  points: number;
  createdAt: string;
  model: string;
  failReason?: string;
}

// 行内注释1：任务中心 = 全站批次/单条任务统一视图，mock 在 MOCK_TASKS 上叠加本地 live 状态
// 行内注释2：running 任务用 interval 推进进度到 100 后转 succeeded；failed 可重试回到 running
// 行内注释3：pending 可取消；succeeded 可下载；failed 显示失败原因与已退回徽标
// 行内注释4：详情抽屉展示批次 items、报价指纹、幂等键、usage_record 追溯（mock）
// TODO(API): 接入 GET /batches（分页+状态筛选）与 GET /batches/{id}/events（SSE 改轮询）
export default function TasksPage() {
  const [tasks, setTasks] = useState<LiveTask[]>(
    MOCK_TASKS.map((t) => ({ ...t, failReason: t.status === "failed" ? "上游审核拒绝：画面含敏感水印，已全额退回" : undefined }))
  );
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const { push } = useToast();

  // 行内注释5：running 进度自增 mock，模拟 SSE 推送
  useEffect(() => {
    const timer = setInterval(() => {
      setTasks((prev) =>
        prev.map((t) =>
          t.status === "running"
            ? { ...t, progress: Math.min(100, t.progress + 3), status: t.progress + 3 >= 100 ? "succeeded" : "running" }
            : t
        )
      );
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const rows = useMemo(
    () =>
      tasks.filter((t) => {
        const inFilter = filter === "all" || t.status === filter;
        const q = query.trim().toLowerCase();
        return inFilter && (!q || t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.model.toLowerCase().includes(q));
      }),
    [tasks, filter, query]
  );

  const selected = tasks.find((t) => t.id === selectedId) ?? null;

  const retry = (id: string) => { setTasks((p) => p.map((t) => (t.id === id ? { ...t, status: "running" as const, progress: 5, failReason: undefined } : t))); push({ tone: "neutral", title: "已重新提交", description: id }); };
  const cancel = (id: string) => { setTasks((p) => p.map((t) => (t.id === id ? { ...t, status: "failed" as const, failReason: "用户主动取消，已全额退回" } : t))); push({ tone: "warning", title: "已取消", description: `${id} 积分已原路退回` }); };
  const downloadTask = (title: string) => push({ tone: "success", title: "下载已开始", description: `${title} · 成片已存入下载队列` });

  if (error) {
    return (
      <StudioShell title="任务" description="全部生成任务与执行状态">
        <Card><CardBody><ErrorState title="任务列表加载失败" description="网络波动，重试即可恢复" onRetry={() => setError(false)} /></CardBody></Card>
      </StudioShell>
    );
  }

  return (
    <StudioShell
      title="任务"
      description="全部生成任务与执行状态 · 失败自动退回"
      actions={<span className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => { setTasks((p) => [...p]); push({ tone: "neutral", title: "已刷新", description: `共 ${tasks.length} 条任务已同步` }); }}><RotateCw className="size-3.5" aria-hidden />刷新</Button><Button variant="ghost" size="sm" onClick={() => setError(true)}>模拟失败态</Button></span>}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1 min-w-52">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索任务标题、ID 或模型" aria-label="搜索任务" className="pl-8" />
          </div>
          <p className="tabular text-xs text-fg-subtle">共 {rows.length} 条 · 失败任务积分已原路退回</p>
        </div>

        <Tabs
          items={FILTERS.map((f) => ({ id: f.id, label: f.label, count: f.id === "all" ? tasks.length : tasks.filter((t) => t.status === f.id).length }))}
          value={filter}
          onChange={setFilter}
        />

        <Card>
          {rows.length === 0 ? (
            <CardBody><EmptyState icon={<Search className="size-5" />} title="没有匹配的任务" description="换个筛选条件或关键词试试" /></CardBody>
          ) : (
            <CardBody className="p-0">
              <Table>
                <thead><tr><Th>任务</Th><Th>能力</Th><Th>模型</Th><Th>进度</Th><Th>状态</Th><Th className="text-right">积分</Th><Th>创建时间</Th><Th>操作</Th></tr></thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id}>
                      <Td><button type="button" onClick={() => setSelectedId(t.id)} className="block max-w-56 truncate text-left text-fg hover:text-accent"><span className="block truncate">{t.title}</span><span className="tabular block text-[11px] text-fg-subtle">{t.id}</span></button></Td>
                      <Td className="whitespace-nowrap text-fg-muted">{t.capability}</Td>
                      <Td className="whitespace-nowrap text-fg-muted">{t.model}</Td>
                      <Td className="w-28">{t.status === "running" ? <Progress value={t.progress} label={`${t.title}进度`} /> : <span className="tabular text-xs text-fg-subtle">{t.progress}%</span>}</Td>
                      <Td><Badge tone={TASK_STATUS_META[t.status].tone}>{TASK_STATUS_META[t.status].label}</Badge></Td>
                      <Td className={cn("tabular text-right", t.status === "failed" ? "text-success" : "text-fg-muted")}>{t.status === "failed" ? "已退回" : t.points}</Td>
                      <Td className="tabular whitespace-nowrap text-fg-subtle">{t.createdAt}</Td>
                      <Td>
                        <span className="flex gap-1">
                          <Button variant="ghost" size="icon-sm" aria-label={`查看${t.title}`} onClick={() => setSelectedId(t.id)}><Eye className="size-3.5" /></Button>
                          {t.status === "failed" && <Button variant="ghost" size="icon-sm" aria-label={`重试${t.title}`} onClick={() => retry(t.id)}><RefreshCw className="size-3.5" /></Button>}
                          {t.status === "pending" && <Button variant="ghost" size="icon-sm" aria-label={`取消${t.title}`} onClick={() => cancel(t.id)}><XCircle className="size-3.5" /></Button>}
                          {t.status === "succeeded" && <Button variant="ghost" size="icon-sm" aria-label={`下载${t.title}`} onClick={() => downloadTask(t.title)}><Download className="size-3.5" /></Button>}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          )}
        </Card>
      </div>

      <Drawer open={!!selected} onClose={() => setSelectedId(null)} title={selected?.title ?? ""} footer={selected?.status === "failed" ? <Button size="sm" onClick={() => selected && retry(selected.id)}><RefreshCw className="size-3.5" aria-hidden />重新生成</Button> : <Button size="sm" onClick={() => setSelectedId(null)}>关闭</Button>}>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2"><Badge tone={TASK_STATUS_META[selected.status].tone}>{TASK_STATUS_META[selected.status].label}</Badge><span className="tabular text-xs text-fg-subtle">{selected.progress}% · {selected.points}积分</span></div>
            {selected.status === "running" && <Progress value={selected.progress} label="任务进度" />}
            {selected.failReason && <p className="rounded-sm border border-warning/40 bg-warning/8 p-2.5 text-xs leading-relaxed text-fg-muted">{selected.failReason}</p>}
            <dl className="space-y-2 text-sm">
              {[["任务 ID", selected.id], ["能力域", selected.capability], ["模型", selected.model], ["创建时间", selected.createdAt], ["幂等键", `idem_${selected.id}`], ["报价指纹", `fp_${selected.id}_9f21`], ["成本追溯", `${selected.model} · usage_record 已落库`]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-fg-subtle">{k}</dt><dd className="tabular truncate text-fg">{v}</dd></div>
              ))}
            </dl>
            <p className="text-[11px] text-fg-subtle">TODO(API): 接入 /batches/{selected.id}/events 做真实 SSE 进度。</p>
          </div>
        )}
      </Drawer>
    </StudioShell>
  );
}
