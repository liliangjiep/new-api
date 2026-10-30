import Link from "next/link";
import { AdminShell } from "@/components/layout/StudioShell";
import { Card, CardBody, CardTitle, Badge } from "@/components/ui/surfaces";
import { ADMIN_SECTIONS } from "@/lib/domain";
import { ArrowRight, AlertTriangle, Clock } from "lucide-react";

// M1-29 后台总览：按分组聚合 20 个入口 + 待办提醒
// 行内注释1：与 AdminShell 侧栏同源（ADMIN_SECTIONS），避免两处硬编码
// 行内注释2：待办 mock —— 审核/发票/余额预警/对账差异四个强提醒
export const metadata = { title: "运营后台" };

const TODOS = [
  { label: "内容审核待处理", count: 2, href: "/admin/review", tone: "warning" as const },
  { label: "发票待开票", count: 1, href: "/admin/invoices", tone: "warning" as const },
  { label: "通道余额预警", count: 1, href: "/admin/channels", tone: "danger" as const },
  { label: "对账差异", count: 1, href: "/admin/bills", tone: "warning" as const },
];

export default function AdminOverviewPage() {
  const groups = ADMIN_SECTIONS.reduce<Record<string, typeof ADMIN_SECTIONS>>((acc, s) => {
    (acc[s.group] ??= []).push(s);
    return acc;
  }, {});

  return (
    <AdminShell title="运营后台" description="20 个分组 · 通道 / 定价 / 财务 / 数据全覆盖">
      <div className="mb-4 flex items-center gap-2">
        <Badge tone="danger">管理员可见</Badge>
        <span className="text-xs text-fg-subtle">所有写操作记审计日志，改价与切通道需二次确认（TODO(API) 接入二次确认接口）</span>
      </div>
      <Card className="mb-6">
        <CardBody>
          <p className="flex items-center gap-2 text-sm font-medium text-fg"><AlertTriangle className="size-4 text-warning" aria-hidden />待办事项（{TODOS.reduce((a, t) => a + t.count, 0)}）</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {TODOS.map((t) => (
              <li key={t.label}>
                <Link href={t.href} className="flex items-center justify-between gap-2 rounded-sm border border-line bg-surface-2 px-3 py-2.5 transition-colors hover:border-line-strong">
                  <span className="flex items-center gap-1.5 text-xs text-fg-muted"><Clock className="size-3.5 text-fg-subtle" aria-hidden />{t.label}</span>
                  <Badge tone={t.tone}>{t.count}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <div className="space-y-6">
        {Object.entries(groups).map(([g, items]) => (
          <section key={g}>
            <h2 className="mb-2 border-b border-line pb-1.5 text-xs font-medium uppercase tracking-wider text-fg-subtle">{g} · {items.length}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((s) => (
                <Link key={s.key} href={`/admin/${s.key}`} className="group">
                  <Card className="h-full transition-colors group-hover:border-line-strong">
                    <CardBody>
                      <span className="flex items-center justify-between gap-2">
                        <CardTitle>{s.label}</CardTitle>
                        <ArrowRight className="size-3.5 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-fg-muted">{s.description}</span>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
