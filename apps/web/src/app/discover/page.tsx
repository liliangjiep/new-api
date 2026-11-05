"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/layout/TopNav";
import { Input } from "@/components/ui/primitives";
import { Badge, Card, CardBody, EmptyState } from "@/components/ui/surfaces";
import { MOCK_ASSETS } from "@/lib/domain";
import { Search, ArrowRight } from "lucide-react";

// M1-10 发现流：公开作品展示 + 能力筛选
// 行内注释1：公开页，无需登录，TopNav variant=public
// 行内注释2：筛选维度只有两档（创作/行业），避免过度筛选导致空结果
// 行内注释3：卡片点击跳工具箱对应能力，落地页可直接复用参数
// TODO(API): 接入 GET /discover/feed，支持游标分页
const FILTERS = ["全部", "图片", "视频", "数字人", "石材"] as const;

export default function DiscoverPage() {
  // 行内注释4：本地筛选状态，接入后端后改为 query 参数驱动，便于分享链接
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("全部");
  const [query, setQuery] = useState("");

  // 行内注释5：用 useMemo 做派生过滤，避免每次渲染全量遍历
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_ASSETS.filter((a) => {
      const inFilter =
        filter === "全部" ||
        (filter === "图片" && a.kind === "image") ||
        (filter === "视频" && a.kind === "video") ||
        (filter === "数字人" && a.tags.some((t) => t.includes("人") || t.includes("口播"))) ||
        (filter === "石材" && a.tags.some((t) => t.includes("石材")));
      const inQuery =
        !q || a.name.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q));
      return inFilter && inQuery;
    });
  }, [filter, query]);

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">发现</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">
            看看别人用 new-ai 做了什么。每个作品都标注了能力域与消耗，点击可直接复用同款工作流。
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索作品、标签"
              aria-label="搜索发现流"
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="作品筛选">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={
                  filter === f
                    ? "rounded-xs border border-accent bg-accent-soft/40 px-2.5 py-1 text-xs text-fg"
                    : "rounded-xs border border-line bg-surface-2 px-2.5 py-1 text-xs text-fg-muted hover:border-line-strong"
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <Card className="mt-6">
            <CardBody>
              <EmptyState
                icon={<Search className="size-5" />}
                title="没有匹配的作品"
                description="换个关键词或筛选试试"
              />
            </CardBody>
          </Card>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((a) => (
              <li key={a.id}>
                <Link
                  href="/toolbox"
                  className="group block overflow-hidden rounded-md border border-line bg-surface transition-colors hover:border-line-strong"
                >
                  <span className="relative block aspect-[4/3] bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.thumb}
                      alt={a.name}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-2 top-2">
                      <Badge tone="neutral">{a.group}</Badge>
                    </span>
                  </span>
                  <span className="block px-3 py-2.5">
                    <span className="block truncate text-sm text-fg">{a.name}</span>
                    <span className="mt-1 flex items-center justify-between">
                      <span className="flex gap-1">
                        {a.tags.slice(0, 2).map((t) => (
                          <Badge key={t} tone="neutral">
                            {t}
                          </Badge>
                        ))}
                      </span>
                      <ArrowRight
                        className="size-3.5 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                        aria-hidden
                      />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
