"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StudioShell } from "@/components/layout/StudioShell";
import { Button, Input } from "@/components/ui/primitives";
import { Card, CardBody, CardHeader, CardTitle, Badge, Progress, Tabs, EmptyState } from "@/components/ui/surfaces";
import { MOCK_TASKS, TASK_STATUS_META, CAPABILITIES, type TaskStatus } from "@/lib/domain";
import { useToast } from "@/components/features/ToastHost";
import { cn } from "@/lib/cn";
import { ArrowRight, Coins, Plus, Activity, TrendingUp, Clock, Search, RotateCw, Eye } from "lucide-react";

const QUICK = [
  { href: "/toolbox/depth-video-clone", label: "爆款复刻", desc: "动作轮廓替换" },
  { href: "/toolbox/ecommerce-image-set", label: "商详套图", desc: "6张/45积分" },
  { href: "/toolbox/video-creator", label: "视频创意", desc: "19套技能包" },
  { href: "/toolbox/image-generation", label: "生成图片", desc: "1K/2K/4K" },
  { href: "/toolbox/video-generation", label: "生成视频", desc: "文生/图生/参考" },
  { href: "/toolbox/digital-human", label: "数字人", desc: "口播/改口型" },
  { href: "/toolbox/stone-effect", label: "石材效果图", desc: "2K/8积分·新增" },
];

const METRICS = [
  { key: "balance", label: "可用积分", value: "2,480", sub: "冻结 0", href: "/account", icon: Coins, accent: true },
  { key: "running", label: "进行中任务", value: "", sub: "平均 4 分钟", href: "/tasks", icon: Activity, accent: false },
  { key: "week", label: "本周已生成", value: "86", sub: "较上周 +18%", href: "/tasks", icon: TrendingUp, accent: false },
  { key: "month", label: "本月消费", value: "1,840", sub: "积分", href: "/account", icon: Clock, accent: false },
];

type FilterKey = "all" | TaskStatus;

export default function WorkbenchPage() {
  const { push } = useToast();
  // 行内注释1：工作台任务 = MOCK_TASKS 的 live 副本，running 每 1.5s 推进，满 100 转 succeeded
  const [tasks, setTasks] = useState(() => MOCK_TASKS.map((t) => ({ ...t })));
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  // 行内注释2：live 进度 tick，模拟 SSE 推送；失败/排队任务不受影响
  useEffect(() => {
    const timer = setInterval(() => {
      setTasks((prev) =>
        prev.map((t) =>
          t.status === "running"
            ? { ...t, progress: Math.min(100, t.progress + 4), status: t.progress + 4 >= 100 ? ("succeeded" as const) : t.status }
            : t
        )
      );
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const running = tasks.filter((t) => t.status === "running");

  // 行内注释3：派生筛选 —— 先按状态 tab，再按关键词（标题/ID/模型）
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      const hitTab =
        filter === "all" ? true : filter === "pending" ? t.status === "pending" : filter === "running" ? t.status === "running" : filter === "succeeded" ? t.status === "succeeded" : t.status === "failed";
      const hitQ = !q || t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.model.toLowerCase().includes(q);
      return hitTab && hitQ;
    });
  }, [tasks, filter, query]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      running: running.length,
      succeeded: tasks.filter((t) => t.status === "succeeded").length,
      failed: tasks.filter((t) => t.status === "failed").length,
    }),
    [tasks, running.length]
  );

  return (
    <StudioShell
      title="工作台"
      description="首屏聚合：常用工具、进行中的任务、最近创作"
      actions={
        <span className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setTasks(MOCK_TASKS.map((t) => ({ ...t }))); push({ tone: "neutral", title: "已刷新", description: "任务状态已同步" }); }}>
            <RotateCw className="size-3.5" aria-hidden />刷新
          </Button>
          <Link href="/toolbox">
            <Button size="sm"><Plus className="size-3.5" aria-hidden />新建创作</Button>
          </Link>
        </span>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {METRICS.map((m) => (
            <Link key={m.key} href={m.href}>
              <Card className="transition-colors hover:border-line-strong">
                <CardBody className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-fg-subtle">{m.label}</p>
                    <p className={cn("tabular mt-1 text-2xl font-semibold tracking-tight", m.accent && "text-accent")}>
                      {m.key === "running" ? running.length : m.value}
                    </p>
                    <p className="tabular mt-0.5 text-[11px] text-fg-subtle">{m.sub}</p>
                  </div>
                  <m.icon className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>常用工具</CardTitle><Link href="/toolbox" className="text-xs text-fg-subtle hover:text-fg">全部 13 个 →</Link></CardHeader>
              <CardBody>
                <div className="grid gap-2 sm:grid-cols-3">
                  {QUICK.map((q) => (
                    <Link key={q.href} href={q.href} className="group flex items-center justify-between gap-2 rounded-sm border border-line bg-surface-2 px-3 py-2.5 transition-colors hover:border-accent">
                      <span><span className="block text-sm text-fg">{q.label}</span><span className="tabular mt-0.5 block text-[11px] text-fg-subtle">{q.desc}</span></span>
                      <ArrowRight className="size-3.5 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <div className="border-b border-line px-4 pt-2">
                <Tabs
                  items={[
                    { id: "all", label: "全部任务", count: counts.all },
                    { id: "running", label: "进行中", count: counts.running },
                    { id: "succeeded", label: "已完成", count: counts.succeeded },
                    { id: "failed", label: "失败", count: counts.failed },
                    { id: "pending", label: "排队", count: counts.pending },
                  ]}
                  value={filter}
                  onChange={(id) => setFilter(id as FilterKey)}
                />
              </div>
              <CardBody className="space-y-2 p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索任务标题 / ID / 模型" aria-label="搜索工作台任务" className="pl-8" />
                </div>
                {rows.length === 0 ? (
                  <EmptyState icon={<Search className="size-5" />} title="没有匹配的任务" description="换个筛选或关键词试试" />
                ) : (
                  rows.map((t) => (
                    <Link key={t.id} href="/tasks" className="flex items-center gap-3 rounded-sm border border-line bg-surface-2 px-3 py-2.5 transition-colors hover:border-line-strong">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-fg">{t.title}</span>
                        <span className="tabular mt-0.5 block text-[11px] text-fg-subtle">{t.id} · {t.model} · {t.createdAt}</span>
                      </span>
                      {t.status === "running" && <span className="w-24 shrink-0"><Progress value={t.progress} label={`${t.title} 进度`} /></span>}
                      <Badge tone={TASK_STATUS_META[t.status].tone}>{TASK_STATUS_META[t.status].label}</Badge>
                      <span className="tabular w-14 shrink-0 text-right text-xs text-fg-subtle">{t.status === "failed" ? "已退回" : `${t.points}分`}</span>
                    </Link>
                  ))
                )}
              </CardBody>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>能力速览</CardTitle><Link href="/toolbox" className="flex items-center gap-1 text-xs text-fg-subtle hover:text-fg">工具箱<Eye className="size-3" aria-hidden /></Link></CardHeader>
              <CardBody className="space-y-1">
                {CAPABILITIES.slice(0, 8).map((c) => (
                  <Link key={c.key} href={c.href} className="flex items-center justify-between gap-3 rounded-xs px-2 py-1.5 transition-colors hover:bg-surface-2">
                    <span className="text-sm text-fg-muted">{c.label}</span>
                    <ArrowRight className="size-3 text-fg-subtle" aria-hidden />
                  </Link>
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader><CardTitle>进行中</CardTitle>{running.length > 0 && <Badge tone="accent">{running.length}</Badge>}</CardHeader>
              <CardBody className="space-y-3">
                {running.length === 0 ? <p className="text-sm text-fg-muted">当前没有进行中的任务</p> : running.map((t) => (
                  <div key={t.id}>
                    <div className="flex items-center justify-between gap-2"><span className="truncate text-xs text-fg">{t.title}</span><span className="tabular text-[11px] text-accent">{t.progress}%</span></div>
                    <Progress value={t.progress} className="mt-1.5" />
                  </div>
                ))}
                <p className="text-[11px] text-fg-subtle">TODO(API): 接入 GET /batches?status=running 做真实轮询。</p>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
