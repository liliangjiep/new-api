"use client";

import { useMemo, useState } from "react";
import {
  DISCOVER_ITEMS,
  DISCOVER_TOTAL_HEIGHT,
  type DiscoverItem,
} from "@/app/discover-data";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/features/ToastHost";

/**
 * 原站首页「发现」瀑布流（.home-discover-waterfall / .ui-waterfall-item）
 *
 *  div.ui-waterfall.relative.w-full.home-discover-waterfall  style="height: <total>px"
 *   └─ div.ui-waterfall-item.min-w-0.absolute.left-0.top-0.visible.transition-[transform,width,height].duration-300
 *       style="width: 279.2px; transform: translate3d(x, y, 0px)"
 *       └─ div.ui-waterfall-item-measure.min-w-0
 *           └─ article.discover-card.group.min-w-0.text-left.outline-none
 *               ├─ div.relative.min-w-0.overflow-hidden.rounded-2xl.bg-[#EBEBEB]...
 *               │   └─ div[role=button][tabindex=0].relative.cursor-pointer...
 *               │       └─ div.discover-card-cover-shell.min-h-[8rem]...
 *               │           ├─ div.discover-card-video-cover > div.interactive-video-cover > img
 *               │           └─ img
 *               ├─ div.pointer-events-none.absolute.inset-x-0.bottom-0.z-\[1\].h-20.bg-gradient-to-t...
 *               └─ div.absolute.inset-x-2.5.bottom-2.5.z-10.flex.items-center.gap-2
 *                   ├─ button.flex.min-w-0.flex-1.items-center.gap-1.5...
 *                   │   ├─ svg.discover-card-type-icon
 *                   │   └─ span.min-w-0.truncate > span.font-semibold + span.text-white\/55 + span.text-white\/80
 *                   └─ button[aria-label=点赞] > svg + likes
 */
export function DiscoverWaterfall({
  items = DISCOVER_ITEMS,
  className,
}: {
  items?: DiscoverItem[];
  className?: string;
}) {
  const total = useMemo(
    () => Math.max(...items.map((i) => i.y + i.h), DISCOVER_TOTAL_HEIGHT),
    [items]
  );

  return (
    <div
      className={cn(
        "ui-waterfall relative w-full home-discover-waterfall",
        className
      )}
      style={{ width: "100%", height: total }}
    >
      {items.map((it, idx) => (
        <WaterfallItem key={`${it.title}-${idx}`} item={it} />
      ))}
    </div>
  );
}

function WaterfallItem({ item }: { item: DiscoverItem }) {
  const { push } = useToast();
  const [liked, setLiked] = useState(false);
  const openDetail = () => {
    push({ tone: "neutral", title: item.title, description: item.desc || "查看作品详情（本地演示）" });
  };
  return (
    <div
      className="ui-waterfall-item min-w-0 absolute left-0 top-0 visible transition-[transform,width,height] duration-300"
      style={{
        width: item.w,
        transform: `translate3d(${item.x}px, ${item.y}px, 0px)`,
      }}
    >
      <div className="ui-waterfall-item-measure min-w-0">
        <article className="discover-card group min-w-0 text-left outline-none">
          <div className="relative min-w-0 overflow-hidden rounded-2xl bg-[#EBEBEB] text-left transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_24px_rgba(15,23,42,0.1)]">
            <div
              role="button"
              tabIndex={0}
              onClick={openDetail}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openDetail();
                }
              }}
              className="relative cursor-pointer overflow-hidden bg-[#EBEBEB] outline-none"
            >
              <div className="discover-card-cover-shell min-h-[8rem] overflow-hidden bg-[#EBEBEB]">
                {item.videoCover ? (
                  <div className="discover-card-video-cover block h-auto w-full transition duration-300 group-hover:scale-[1.02]">
                    <div className="interactive-video-cover relative w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt=""
                        className="video-thumbnail-image interactive-video-cover-poster block h-auto w-full object-cover"
                        loading="lazy"
                        decoding="async"
                        src={item.cover}
                      />
                    </div>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="discover-card-cover-image block h-auto w-full transition duration-300 group-hover:scale-[1.02] opacity-100"
                    loading="lazy"
                    decoding="async"
                    src={item.cover}
                  />
                )}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-20 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
            <div className="absolute inset-x-2.5 bottom-2.5 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={openDetail}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[11px] leading-none text-white"
              >
                <TypeIcon kind={item.kind} />
                <span className="min-w-0 truncate text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]">
                  <span className="font-semibold">{item.title}</span>
                  {item.desc ? (
                    <>
                      <span className="text-white/55"> | </span>
                      <span className="font-normal text-white/80">
                        {item.desc}
                      </span>
                    </>
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                aria-label="点赞"
                aria-pressed={liked}
                onClick={(e) => {
                  e.stopPropagation();
                  setLiked((v) => {
                    const next = !v;
                    push({ tone: "neutral", title: next ? "已点赞" : "已取消点赞", description: item.title });
                    return next;
                  });
                }}
                className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium tabular-nums leading-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)] transition hover:text-white/85 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden
                  data-slot="icon"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                  />
                </svg>
                {item.likes}
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

function TypeIcon({ kind }: { kind: DiscoverItem["kind"] }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
    className:
      "workspace-nav-icon pointer-events-none discover-card-type-icon h-4 w-4 shrink-0 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)] [&_*]:fill-current [&_*]:stroke-current",
  };

  if (kind === "video") {
    return (
      <svg {...common}>
        <path d="m16.5 10 4-3a.5.5 0 0 1 .8.4v9.2a.5.5 0 0 1-.8.4l-4-3" fill="none" />
        <rect x="2.5" y="5.5" width="14" height="13" rx="2.5" fill="none" />
        <rect x="6" y="9" width="6" height="3" rx="1.5" stroke="currentColor" />
      </svg>
    );
  }
  if (kind === "canvas") {
    return (
      <svg {...common}>
        <path d="M7 3.5v17M17 3.5v7M3 7h18M3 16h8" />
        <path
          d="M17 13c.5 2 1.5 3 3.5 3.5-2 .5-3 1.5-3.5 3.5-.5-2-1.5-3-3.5-3.5 2-.5 3-1.5 3.5-3.5Z"
          fill="none"
        />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" fill="none" />
      <circle cx="9" cy="10" r="1.5" stroke="currentColor" />
      <path d="m8 19 6.5-6.5a1.5 1.5 0 0 1 1.8-.25l4.2 2.25" stroke="currentColor" />
    </svg>
  );
}
