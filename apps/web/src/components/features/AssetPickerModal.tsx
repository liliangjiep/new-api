"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export interface AssetItem {
  id: string;
  name: string;
  url: string;
  thumb?: string;
  duration?: string;
  meta?: string;
  source: "upload" | "ai";
  kind: "video" | "image" | "audio";
}

const MOCK_VIDEOS: AssetItem[] = [
  { id: "v1", name: "9月12日.mp4", url: "/images/gen/example-video-1.png", thumb: "/images/gen/example-video-1.png", duration: "50s", meta: "10/30", source: "upload", kind: "video" },
  { id: "v2", name: "产品口播-01.mp4", url: "/images/gen/example-video-1.png", thumb: "/images/gen/example-video-1.png", duration: "32s", meta: "10/28", source: "upload", kind: "video" },
  { id: "v3", name: "AI生成-街景.mp4", url: "/images/gen/example-video-1.png", thumb: "/images/gen/example-video-1.png", duration: "15s", meta: "10/25", source: "ai", kind: "video" },
];

const MOCK_IMAGES: AssetItem[] = [
  { id: "i1", name: "商品白底-01.png", url: "/images/gen/skill-product-white-background.jpg", thumb: "/images/gen/skill-product-white-background.jpg", meta: "10/30", source: "upload", kind: "image" },
  { id: "i2", name: "人物-棚拍-02.jpg", url: "/images/gen/skill-model-product-try-on.jpg", thumb: "/images/gen/skill-model-product-try-on.jpg", meta: "10/29", source: "upload", kind: "image" },
  { id: "i3", name: "背景-客厅.jpg", url: "/images/gen/skill-background-change.jpg", thumb: "/images/gen/skill-background-change.jpg", meta: "10/28", source: "upload", kind: "image" },
  { id: "i4", name: "AI-场景种草.jpg", url: "/images/gen/skill-ecommerce-scene-seeding.jpg", thumb: "/images/gen/skill-ecommerce-scene-seeding.jpg", meta: "10/25", source: "ai", kind: "image" },
  { id: "i5", name: "AI-电商卖点.jpg", url: "/images/gen/skill-ecommerce-spoken-selling.jpg", thumb: "/images/gen/skill-ecommerce-spoken-selling.jpg", meta: "10/24", source: "ai", kind: "image" },
  { id: "i6", name: "商品精修-03.jpg", url: "/images/gen/skill-product-refine.jpg", thumb: "/images/gen/skill-product-refine.jpg", meta: "10/22", source: "upload", kind: "image" },
];

const MOCK_AUDIOS: AssetItem[] = [
  { id: "a1", name: "口播-女声01.mp3", url: "", duration: "00:32", meta: "10/30", source: "upload", kind: "audio" },
  { id: "a2", name: "BGM-轻快.mp3", url: "", duration: "01:05", meta: "10/28", source: "upload", kind: "audio" },
  { id: "a3", name: "AI配音-磁性男声.mp3", url: "", duration: "00:48", meta: "10/25", source: "ai", kind: "audio" },
];

export function AssetPickerModal({
  open,
  kind = "video",
  title,
  subtitle,
  maxSelect = 1,
  onClose,
  onConfirm,
}: {
  open: boolean;
  kind?: "video" | "image" | "audio" | "media";
  title: string;
  subtitle?: string;
  maxSelect?: number;
  onClose: () => void;
  onConfirm: (assets: AssetItem[]) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [sourceTab, setSourceTab] = useState<"all" | "upload" | "ai">("all");
  const [libFilter, setLibFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [extra, setExtra] = useState<AssetItem[]>([]);
  const [libOpen, setLibOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) {
      setQuery("");
      setSourceTab("all");
      setSelected([]);
    }
  }, [open ]);

  const base = useMemo(() => {
    if (kind === "video") return MOCK_VIDEOS;
    if (kind === "image") return MOCK_IMAGES;
    if (kind === "media") return [...MOCK_VIDEOS, ...MOCK_IMAGES];
    return MOCK_AUDIOS;
  }, [kind]);

  const all = useMemo(() => [...extra, ...base], [extra, base]);
  const filtered = useMemo(
    () =>
      all.filter((a) => {
        if (sourceTab !== "all" && a.source !== sourceTab) return false;
        if (libFilter !== "all" && a.kind !== libFilter) return false;
        if (query.trim() && !a.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
        return true;
      }),
    [all, sourceTab, libFilter, query]
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxSelect) {
        if (maxSelect === 1) return [id];
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const adds: AssetItem[] = Array.from(files)
      .slice(0, 8)
      .map((f, i) => {
        const url = URL.createObjectURL(f);
        const isImg = f.type.startsWith("image/");
        const isAud = f.type.startsWith("audio/");
        const isVid = f.type.startsWith("video/");
        const k: AssetItem["kind"] =
          kind === "video" ? "video" : kind === "audio" ? "audio" : kind === "image" ? "image" : isVid ? "video" : isAud ? "audio" : "image";
        return {
          id: `local-${Date.now()}-${i}`,
          name: f.name,
          url,
          thumb: isImg || f.type.startsWith("video/") ? url : undefined,
          duration: "",
          meta: "刚刚",
          source: "upload" as const,
          kind: k,
        };
      });
    setExtra((p) => [...adds, ...p]);
    setSelected((prev) => {
      const ids = adds.map((a) => a.id);
      if (maxSelect === 1) return [ids[0]];
      return [...ids, ...prev].slice(0, maxSelect);
    });
    setSourceTab("upload");
  };

  if (!open || !mounted) return null;

  const kindLabel = kind === "video" ? "视频" : kind === "image" ? "图片" : kind === "media" ? "图片 / 视频" : "音频";
  const accept = kind === "video" ? "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" : kind === "image" ? "image/*,.png,.jpg,.jpeg,.webp" : kind === "media" ? "image/*,video/*,.png,.jpg,.jpeg,.webp,.mp4,.mov,.webm" : "audio/*,.mp3,.wav,.m4a";

  const node = (
    <div className="fixed inset-0 z-[9600] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex h-[min(80vh,660px)] w-full max-w-[880px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        {/* —— 头部 —— */}
        <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" aria-hidden className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold leading-6 text-foreground">{title}</h2>
              {subtitle ? <p className="mt-0.5 text-xs leading-4 text-muted">{subtitle}</p> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {selected.length > 0 ? <span className="text-xs font-medium text-foreground">已选择 {selected.length} 个</span> : null}
            <button type="button" onClick={onClose} aria-label="关闭" className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-black/[0.04] hover:text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" aria-hidden className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* —— 筛选行 —— */}
        <div className="flex items-center gap-3 px-5 pt-2">
          <div className="relative shrink-0">
            <button type="button" onClick={() => setLibOpen((v) => !v)} className="flex h-9 w-32 items-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-medium text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden className="h-3.5 w-3.5 text-muted">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" />
              </svg>
              <span className="flex-1 truncate text-left">{libFilter === "all" ? "全部资产" : libFilter === "video" ? "视频" : libFilter === "image" ? "图片" : "音频"}</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" aria-hidden className="h-3 w-3 text-muted">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {libOpen ? (
              <div className="absolute left-0 top-10 z-10 w-32 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg">
                {[["all", "全部资产"], ["video", "视频"], ["image", "图片"], ["audio", "音频"]].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => { setLibFilter(v); setLibOpen(false); }} className={cn("block w-full px-3 py-1.5 text-left text-xs", libFilter === v ? "bg-black/[0.04] font-semibold text-foreground" : "text-muted hover:text-foreground")}>{l}</button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="relative min-w-0 flex-1">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="按文件名搜索素材" className="h-9 w-full rounded-lg border border-line bg-white pl-3 pr-9 text-xs text-foreground outline-none placeholder:text-muted focus:border-[#999]" />
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
        </div>

        {/* —— 类型行 —— */}
        <div className="flex items-center justify-between gap-2 px-5 pt-3">
          <span className="text-xs font-medium text-muted">{kindLabel}</span>
          <div className="flex items-center gap-1.5">
            {([["all", "全部"], ["upload", "我上传的"], ["ai", "AI生成的"]] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setSourceTab(v)} className={cn("rounded-full px-3 py-1 text-xs transition", sourceTab === v ? "bg-black/[0.06] font-semibold text-foreground" : "text-muted hover:text-foreground")}>{l}</button>
            ))}
          </div>
        </div>

        {/* —— 内容 —— */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <input ref={fileRef} type="file" accept={accept} multiple={maxSelect > 1} className="sr-only" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {/* 上传卡 */}
            <div className="flex aspect-[3/4] flex-col overflow-hidden rounded-xl border border-dashed border-line bg-[#fafafa]">
              <button type="button" onClick={() => fileRef.current?.click()} className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 text-center">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-2xl font-light leading-none text-foreground shadow-sm">+</span>
                <span className="mt-2 text-xs font-semibold text-foreground">上传素材</span>
                <span className="mt-1 text-[10px] leading-4 text-muted">{kind === "video" ? "建议选择 4-60 秒的视频。" : kind === "image" ? "支持 PNG / JPG / WebP。" : "支持 MP3 / WAV / M4A。"}</span>
              </button>
              <div className="flex shrink-0 border-t border-line">
                <button type="button" onClick={() => fileRef.current?.click()} className="h-9 flex-1 text-xs font-medium text-foreground transition hover:bg-black/[0.03]">上传文件</button>
                <span className="w-px bg-line" aria-hidden />
                <button type="button" onClick={() => fileRef.current?.click()} className="h-9 flex-1 text-xs font-medium text-muted transition hover:bg-black/[0.03] hover:text-foreground">{kind === "audio" ? "录音" : "拍照"}</button>
              </div>
            </div>

            {filtered.map((a) => {
              const on = selected.includes(a.id);
              return (
                <button key={a.id} type="button" onClick={() => toggle(a.id)} aria-pressed={on} className={cn("group flex aspect-[3/4] flex-col overflow-hidden rounded-xl border bg-white text-left transition", on ? "border-foreground ring-1 ring-foreground" : "border-line hover:border-[#999]")}>
                  <span className="relative block min-h-0 flex-1 overflow-hidden bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {a.thumb || (a.kind !== "audio" && a.url) ? <img src={a.thumb ?? a.url} alt="" draggable={false} className="h-full w-full object-cover" /> : (
                      <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#f4f4f5] px-2 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden className="h-6 w-6 text-muted">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 0v9.75M9 9v9.75m10.5-9.75L9 12.75" />
                        </svg>
                        <span className="line-clamp-2 text-[10px] text-muted">{a.name}</span>
                      </span>
                    )}
                    {a.kind === "video" && a.duration ? (
                      <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">{a.duration}</span>
                    ) : null}
                    <span className={cn("absolute bottom-1.5 left-1.5 grid h-5 w-5 place-items-center rounded-full border transition", on ? "border-foreground bg-foreground text-white" : "border-white/80 bg-black/45 text-white")}>
                      {on ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-3 w-3"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                      ) : null}
                    </span>
                  </span>
                  <span className="block shrink-0 px-2 pb-1.5 pt-1.5">
                    <span className="block truncate text-xs font-medium text-foreground">{a.name}</span>
                    <span className="mt-0.5 flex items-center justify-between text-[10px] tabular-nums text-muted">
                      <span>{a.meta ?? ""}</span>
                      {a.duration && a.kind !== "video" ? <span>{a.duration}</span> : a.kind === "video" ? <span>{a.duration}</span> : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 ? <p className="py-10 text-center text-xs text-muted">没有找到匹配的素材，换个关键词或上传新的素材吧。</p> : null}
        </div>

        {/* —— 底部 —— */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-5 py-3">
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-line px-5 text-xs font-medium text-foreground transition hover:bg-black/[0.03]">取消</button>
          <button type="button" disabled={selected.length === 0} onClick={() => { onConfirm(all.filter((a) => selected.includes(a.id))); onClose(); }} className="h-9 rounded-lg bg-black px-5 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40">确认选择</button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
