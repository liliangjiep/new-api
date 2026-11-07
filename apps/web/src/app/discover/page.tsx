"use client";

/**
 * 发现 —— 用户作品流（接 GET /discover/feed）。
 * 行内注释1：此前 /discover 这个路由在导航里有链接，但页面文件不存在（点进去 404），
 *             同时后端 /discover/feed、/discover/items/{id}、/discover/items/{id}/like
 *             这三个接口前端一次都没调用过。
 * 行内注释2：这里展示的是「用户发布 + 审核通过」的作品，
 *             与首页的「平台精选演示」是两套内容 —— 两者语义不同，不能互相替代。
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/features/WorkspaceShell";
import { useToast } from "@/components/features/ToastHost";
import { Badge, Card, CardBody, EmptyState } from "@/components/ui/surfaces";
import { Button, Input } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api";
import { getFeed, likeItem, type DiscoverItem } from "@/lib/backend/discover";

const FILTERS = [
  { key: "", label: "全部" },
  { key: "image", label: "图片" },
  { key: "video", label: "视频" },
];

export default function DiscoverPage() {
  const { push } = useToast();
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFeed({
        filter: filter || undefined,
        query: query.trim() || undefined,
        limit: 40,
      });
      setItems(res.items ?? []);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "加载作品失败";
      push({ tone: "warning", title: "加载失败", description: msg });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const onLike = async (it: DiscoverItem) => {
    setLiking(it.id);
    try {
      await likeItem(it.id);
      setItems((p) => p.map((x) => (x.id === it.id ? { ...x, likes: x.likes + 1 } : x)));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "点赞失败";
      push({ tone: "warning", title: "点赞失败", description: msg });
    } finally {
      setLiking(null);
    }
  };

  return (
    <WorkspaceShell>
      <section className="mx-auto flex w-full max-w-shell flex-col gap-6 bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6">
        <header className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">发现</h1>
            <p className="mt-1 text-xs text-muted">社区作品流 · 仅展示审核通过的内容</p>
          </div>
          <Link href="/" className="ml-auto text-xs text-muted underline underline-offset-2 hover:text-foreground">
            返回首页
          </Link>
        </header>

        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={
                filter === f.key
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
            placeholder="搜索作品标题"
            aria-label="搜索作品"
            className="ml-auto max-w-xs"
          />
        </div>

        {loading ? (
          <div className="rounded-xl border border-dashed px-3 py-12 text-center text-xs text-muted">加载中…</div>
        ) : items.length === 0 ? (
          <Card>
            <CardBody>
              <EmptyState
                title="还没有作品"
                description="生成内容后可以发布到发现流，审核通过后会展示在这里"
              />
            </CardBody>
          </Card>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((it) => (
              <li key={it.id} className="group overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-line-strong">
                <div className="relative aspect-[4/3] bg-surface-2">
                  {it.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.cover_url}
                      alt={it.title}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-[11px] text-muted">
                      暂无封面
                    </div>
                  )}
                  <span className="absolute right-2 top-2">
                    <Badge tone="neutral">{it.capability === "video" ? "视频" : "图片"}</Badge>
                  </span>
                </div>
                <div className="space-y-1.5 p-2.5">
                  <p className="truncate text-xs font-medium text-foreground" title={it.title}>
                    {it.title}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="tabular text-[10px] text-subtle">
                      {it.points} 积分 · {it.created_at}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={liking === it.id}
                      onClick={() => void onLike(it)}
                      aria-label={`点赞 ${it.title}`}
                    >
                      ♥ {it.likes}
                    </Button>
                  </div>
                  {it.tool_href ? (
                    <Link
                      href={it.tool_href}
                      className="inline-block text-[10px] text-accent-deep underline underline-offset-2"
                    >
                      用同款参数生成
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </WorkspaceShell>
  );
}
