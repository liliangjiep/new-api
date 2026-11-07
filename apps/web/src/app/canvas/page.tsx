"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WorkspaceShell } from "@/components/features/WorkspaceShell";
import { useToast } from "@/components/features/ToastHost";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  listCanvases,
  createCanvas,
  getCanvas,
  renameCanvas,
  saveCanvasGraph,
  shareCanvas,
  type CanvasNode,
  type CanvasSummary,
} from "@/lib/backend/canvas";

/*
 * 原站 /canvas（实测 1:1，2026-10-30）
 *
 *  main.workspace-main-content
 *   └─ div.canvas-workspace-layout  flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0 lg:h-full
 *      └─ div.flex.min-h-0.min-w-0.flex-1.flex-col.overflow-auto.pb-10.scrollbar-none
 *         └─ div.mx-auto.w-full.min-w-0.max-w-shell.overflow-x-hidden.px-4.sm:px-6.lg:px-10
 *            ├─ section.canvas-video-tutorial-section  （aria-label=画布视频教程）
 *            │   ├─ header.video-tutorial-header  h2「新手教程」+ 圆形折叠按钮
 *            │   └─ div.canvas-video-tutorial-grid  grid grid-cols-4 gap-2.5 sm:gap-3
 *            └─ section.mt-6  （我的创作）
 *                ├─ header  h2「我的创作」
 *                └─ div.canvas-recent-project-list > div.canvas-recent-project-grid
 *                     └─ div.canvas-start-create-card （新建）
 *
 * 2026-11-03 补：画布编辑器态（对齐用户截图）
 *   顶栏：左「未命名画布」下拉 / 右「已同步 + 分享 + 更多」
 *   左侧竖式工具条 / 中间点阵画布 / 中央「双击画布添加新卡片」药丸
 *   右侧齿轮悬浮钮 + 右下 AI 悬浮钮 / 底部缩放条
 */

const TUTORIALS = [
  { n: 1, cover: "/images/canvas/tutorial-step-01.jpg" },
  { n: 2, cover: "/images/canvas/tutorial-step-02.jpg" },
  { n: 3, cover: "/images/canvas/tutorial-step-03.jpg" },
  { n: 4, cover: "/images/canvas/tutorial-step-04.jpg" },
];

interface Project {
  id: string;
  title: string;
  at: string;
  /** 行内注释1：画布版本号 —— 保存时要带上，后端比对不一致会 409。 */
  version: number;
}

interface Card {
  id: string;
  x: number;
  y: number;
  text: string;
}

/* ---------------- 画布编辑器 ---------------- */

function CanvasEditor({
  project,
  onBack,
  onRename,
}: {
  project: Project;
  onBack: () => void;
  onRename: (title: string) => void;
}) {
  const { push } = useToast();
  const [cards, setCards] = useState<Card[]>([]);
  const [tool, setTool] = useState<"select" | "hand" | "text" | "image" | "shape">("select");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [titleOpen, setTitleOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(project.title);
  const [version, setVersion] = useState(project.version);
  const [saving, setSaving] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const areaRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const dragCardRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  /** 行内注释2：卡片变化后延迟自动保存 —— 拖拽过程不触发保存。 */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 行内注释3：打开画布时从后端加载整图（nodes 即卡片列表）。
   */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const c = await getCanvas(project.id);
        if (cancelled) return;
        setCards((c.nodes ?? []) as Card[]);
        setVersion(c.version ?? 0);
        setEditingTitle(c.title || project.title);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "加载画布失败";
        push({ tone: "warning", title: "加载失败", description: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  /**
   * 行内注释4：自动保存 —— 卡片变化 800ms 后 PUT /canvases/{id}/graph。
   */
  const scheduleSave = useCallback(
    (next: Card[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        setSyncState("saving");
        try {
          const saved = await saveCanvasGraph(project.id, next as CanvasNode[], [], version);
          setVersion(saved.version);
          setSyncState("saved");
        } catch (e) {
          setSyncState("error");
          const msg = e instanceof ApiError ? e.message : "保存失败";
          push({ tone: "danger", title: "保存失败", description: msg });
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [project.id, version, push],
  );

  const updateCards = useCallback(
    (updater: (prev: Card[]) => Card[]) => {
      setCards((prev) => {
        const next = updater(prev);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const addCardAt = useCallback(
    (clientX: number, clientY: number) => {
      const el = areaRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (clientX - r.left - r.width / 2 - offset.x) / zoom;
      const y = (clientY - r.top - r.height / 2 - offset.y) / zoom;
      const id = `card_${Date.now()}`;
      updateCards((p) => [...p, { id, x, y, text: `卡片 ${p.length + 1}` }]);
      push({ tone: "success", title: "已添加卡片", description: "拖拽可移动，双击卡片可改名" });
    },
    [offset, zoom, push, updateCards]
  );

  const onAreaDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-card]")) return;
    addCardAt(e.clientX, e.clientY);
  };

  const onAreaPointerDown = (e: React.PointerEvent) => {
    if (tool !== "hand") return;
    if ((e.target as HTMLElement).closest("[data-card]")) return;
    panRef.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onAreaPointerMove = (e: React.PointerEvent) => {
    const pan = panRef.current;
    if (!pan) {
      const drag = dragCardRef.current;
      if (!drag) return;
      const el = areaRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2 - offset.x) / zoom - drag.dx;
      const y = (e.clientY - r.top - r.height / 2 - offset.y) / zoom - drag.dy;
      updateCards((p) => p.map((c) => (c.id === drag.id ? { ...c, x, y } : c)));
      return;
    }
    setOffset({ x: pan.ox + (e.clientX - pan.sx), y: pan.oy + (e.clientY - pan.sy) });
  };
  const onAreaPointerUp = () => {
    panRef.current = null;
    dragCardRef.current = null;
  };

  const startCardDrag = (e: React.PointerEvent, card: Card) => {
    const el = areaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left - r.width / 2 - offset.x) / zoom;
    const py = (e.clientY - r.top - r.height / 2 - offset.y) / zoom;
    dragCardRef.current = { id: card.id, dx: px - card.x, dy: py - card.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const renameCard = (id: string) => {
    const cur = cards.find((c) => c.id === id);
    const next = window.prompt("卡片名称", cur?.text ?? "");
    if (next === null) return;
    const v = next.trim() || cur?.text || "卡片";
    updateCards((p) => p.map((c) => (c.id === id ? { ...c, text: v } : c)));
  };

  const tools: { key: typeof tool | "add"; label: string; icon: React.ReactNode }[] = [
    {
      key: "add",
      label: "添加卡片",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
          <path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      key: "select",
      label: "选择",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 3 14 7-6 2-2 6L5 3Z" />
        </svg>
      ),
    },
    {
      key: "hand",
      label: "抓手",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V11m0-2.5a1.5 1.5 0 0 1 3 0V12m0-1a1.5 1.5 0 0 1 3 0v4a6 6 0 0 1-6 6h-1.8a6 6 0 0 1-4.7-2.3L3 13.6a1.6 1.6 0 0 1 2.5-2L8 14"
          />
        </svg>
      ),
    },
    {
      key: "text",
      label: "文本",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
          <path strokeLinecap="round" d="M5 6V4h14v2M12 4v16m-3 0h6" />
        </svg>
      ),
    },
    {
      key: "image",
      label: "图片",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
          <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m8 19 6.5-6.5a1.5 1.5 0 0 1 1.8-.25l4.2 2.25" />
        </svg>
      ),
    },
    {
      key: "shape",
      label: "形状",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
          <rect x="4" y="4" width="12" height="12" rx="2" />
          <circle cx="15" cy="15" r="5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="canvas-editor-root relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f4f4f5]">
      {/* —— 顶栏 —— */}
      <div className="relative z-20 flex h-12 shrink-0 items-center justify-between gap-2 px-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setTitleOpen((v) => !v)}
            aria-expanded={titleOpen}
            aria-label="画布标题菜单"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-black/[0.06] bg-white px-2.5 text-xs font-semibold text-foreground shadow-sm transition hover:shadow"
          >
            <span className="max-w-[10rem] truncate">{project.title}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 text-muted">
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {titleOpen ? (
            <div className="absolute left-0 top-9 z-50 w-56 rounded-xl border border-black/[0.06] bg-white p-1.5 shadow-xl">
              <input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onRename(editingTitle.trim() || project.title);
                    setTitleOpen(false);
                  }
                }}
                aria-label="重命名画布"
                className="h-8 w-full rounded-lg border border-line bg-surface px-2 text-xs outline-none"
              />
              <div className="mt-1.5 grid gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onRename(editingTitle.trim() || project.title);
                    setTitleOpen(false);
                    push({ tone: "success", title: "已重命名" });
                  }}
                  className="flex h-8 items-center rounded-lg px-2 text-xs font-medium hover:bg-black/[0.04]"
                >
                  保存名称
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitleOpen(false);
                    onBack();
                  }}
                  className="flex h-8 items-center rounded-lg px-2 text-xs font-medium hover:bg-black/[0.04]"
                >
                  ← 返回我的创作
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 hidden items-center gap-1 text-[11px] text-muted sm:inline-flex">
            {/* 行内注释5：同步状态真实反映后端保存结果 —— 不再是写死的「已同步」。 */}
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                syncState === "saving" ? "bg-amber-500" : syncState === "error" ? "bg-red-500" : "bg-emerald-500",
              )}
            />
            {syncState === "saving" ? "保存中…" : syncState === "error" ? "保存失败" : "已同步"}
          </span>
          <button
            type="button"
            aria-label="分享画布"
            onClick={() => {
              void (async () => {
                try {
                  const r = await shareCanvas(project.id);
                  await navigator.clipboard?.writeText(r.share_url);
                  push({ tone: "success", title: "分享链接已复制", description: r.share_url });
                } catch (e) {
                  const msg = e instanceof ApiError ? e.message : "生成分享链接失败";
                  push({ tone: "danger", title: "分享失败", description: msg });
                }
              })();
            }}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-black/[0.06] bg-white px-2.5 text-xs font-medium shadow-sm transition hover:shadow"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 8h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Zm3-5 5 5m0-5v5"
              />
            </svg>
            分享
          </button>
          <button
            type="button"
            aria-label="画布设置"
            onClick={() => push({ tone: "neutral", title: "画布设置", description: "网格 / 背景 / 导出（演示）" })}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.06] bg-white shadow-sm transition hover:shadow"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.5 7.5 0 0 0-2-1.2L14.6 3h-5.2L9 5.7a7.5 7.5 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7.5 7.5 0 0 0 2 1.2l.4 2.7h5.2l.4-2.7a7.5 7.5 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2Z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* —— 主体 —— */}
      <div className="relative flex min-h-0 flex-1">
        {/* 左侧竖式工具条 */}
        <div className="absolute left-3 top-2 z-20 flex flex-col gap-0.5 rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-[0_8px_28px_rgba(15,23,42,0.10)]">
          {tools.map((t) => {
            const active = tool === t.key;
            return (
              <button
                key={t.key + t.label}
                type="button"
                aria-label={t.label}
                aria-pressed={t.key === tool}
                title={t.label}
                onClick={() => {
                  if (t.key === "add") {
                    const el = areaRef.current;
                    if (!el) return;
                    const r = el.getBoundingClientRect();
                    addCardAt(r.left + r.width / 2 + (Math.random() * 120 - 60), r.top + r.height / 2 + (Math.random() * 80 - 40));
                    return;
                  }
                  setTool(t.key);
                  push({
                    tone: "neutral",
                    title: `${t.label}工具`,
                    description: t.key === "hand" ? "拖拽平移画布" : t.key === "select" ? "点击/拖拽卡片" : `${t.label}（演示，前端 mock）`,
                  });
                }}
                className={`grid h-9 w-9 place-items-center rounded-xl transition ${
                  active ? "bg-black/[0.06] text-foreground" : "text-muted hover:bg-black/[0.04] hover:text-foreground"
                }`}
              >
                {t.icon}
              </button>
            );
          })}
        </div>

        {/* 画布区 */}
        <div
          ref={areaRef}
          role="application"
          aria-label="画布编辑区，双击添加卡片"
          onDoubleClick={onAreaDoubleClick}
          onPointerDown={onAreaPointerDown}
          onPointerMove={onAreaPointerMove}
          onPointerUp={onAreaPointerUp}
          className={`relative min-h-0 flex-1 overflow-hidden ${tool === "hand" ? "cursor-grab active:cursor-grabbing" : ""}`}
          style={{
            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.16) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            backgroundPosition: `${offset.x}px ${offset.y}px`,
            touchAction: "none",
          }}
        >
          <div
            className="absolute left-1/2 top-1/2"
            style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})` }}
          >
            {cards.map((c) => (
              <div
                key={c.id}
                data-card={c.id}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  startCardDrag(e, c);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  renameCard(c.id);
                }}
                className="absolute flex h-28 w-44 -translate-x-1/2 -translate-y-1/2 cursor-move flex-col overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
                style={{ left: c.x, top: c.y }}
              >
                <div className="flex h-7 items-center justify-between border-b border-black/[0.05] bg-[#fafafa] px-2">
                  <span className="max-w-[7rem] truncate text-[11px] font-semibold">{c.text}</span>
                  <button
                    type="button"
                    aria-label={`删除${c.text}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateCards((p) => p.filter((x) => x.id !== c.id));
                      push({ tone: "neutral", title: "已删除卡片" });
                    }}
                    className="grid h-5 w-5 place-items-center rounded-md text-muted hover:bg-black/[0.05] hover:text-foreground"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
                      <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
                <div className="grid flex-1 place-items-center bg-[radial-gradient(circle,rgba(0,0,0,0.08)_1px,transparent_1px)] [background-size:14px_14px]">
                  <span className="text-[11px] text-muted">双击改名 · 拖拽移动</span>
                </div>
              </div>
            ))}
          </div>

          {/* 中央药丸（空态提示，对齐截图） */}
          {cards.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
              <button
                type="button"
                onClick={() => {
                  const el = areaRef.current;
                  if (!el) return;
                  const r = el.getBoundingClientRect();
                  addCardAt(r.left + r.width / 2, r.top + r.height / 2);
                }}
                className="pointer-events-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-black/[0.05] bg-white/90 px-3.5 text-xs text-muted shadow-sm backdrop-blur transition hover:text-foreground hover:shadow"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4" />
                  <path strokeLinecap="round" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
                双击画布添加新卡片
              </button>
            </div>
          ) : null}
        </div>

        {/* 右侧悬浮：齿轮 */}
        <button
          type="button"
          aria-label="画布偏好设置"
          onClick={() => push({ tone: "neutral", title: "偏好设置", description: "对齐 / 网格吸附（演示）" })}
          className="absolute right-3 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-[#111] text-white shadow-xl transition hover:scale-105"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <circle cx="12" cy="12" r="3" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.89a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09A1.7 1.7 0 0 0 10.11 3V3a2 2 0 1 1 4 0v.09c0 .68.4 1.3 1 1.55.61.26 1.32.11 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09c.26.61.88 1 1.55 1H21a2 2 0 1 1 0 4h-.09c-.68 0-1.3.4-1.51 1Z"
            />
          </svg>
        </button>

        {/* 右下 AI 悬浮 */}
        <button
          type="button"
          aria-label="AI 助手"
          onClick={() => push({ tone: "neutral", title: "AI 助手", description: "输入一句话生成卡片组（演示）" })}
          className="absolute bottom-14 right-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-[#111] text-white shadow-xl transition hover:scale-105"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M12 2c.6 4.8 3.2 7.4 8 8-4.8.6-7.4 3.2-8 8-.6-4.8-3.2-7.4-8-8 4.8-.6 7.4-3.2 8-8Z" />
          </svg>
        </button>
      </div>

      {/* —— 底栏缩放 —— */}
      <div className="relative z-20 flex h-10 shrink-0 items-center gap-1 border-t border-black/[0.05] bg-white/90 px-3 backdrop-blur">
        <button
          type="button"
          aria-label="缩小"
          onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.1).toFixed(2)))}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-black/[0.04] hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
            <path strokeLinecap="round" d="M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="缩放比例，重置为 100%"
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="h-7 min-w-14 rounded-lg px-2 text-xs tabular-nums text-muted hover:bg-black/[0.04] hover:text-foreground"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          aria-label="放大"
          onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-black/[0.04] hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <span className="mx-1 h-4 w-px bg-black/10" />
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
            push({ tone: "neutral", title: "已适应屏幕" });
          }}
          className="h-7 rounded-lg px-2 text-xs text-muted hover:bg-black/[0.04] hover:text-foreground"
        >
          适应屏幕
        </button>
        <span className="flex-1" />
        <span className="text-[11px] tabular-nums text-muted">
          {cards.length} 张卡片 · {tool === "hand" ? "抓手" : "选择"}模式
        </span>
      </div>
    </div>
  );
}

/* ---------------- 列表页 ---------------- */

export default function CanvasPage() {
  const { push } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * 行内注释6：画布列表走后端 —— 之前是 localStorage 存的假数据，
   *             换台设备看不到自己建的画布。
   */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCanvases();
      setProjects(
        (rows ?? []).map((c: CanvasSummary) => ({
          id: c.id,
          title: c.title,
          at: c.at,
          version: c.version ?? 0,
        })),
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "加载画布失败";
      push({ tone: "warning", title: "加载失败", description: msg });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createProject = async () => {
    try {
      const c = await createCanvas();
      const np: Project = { id: c.id, title: c.title, at: c.updated_at, version: c.version ?? 0 };
      setProjects((p) => [np, ...p]);
      setActiveId(np.id);
      push({ tone: "success", title: "已新建画布", description: np.title });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "新建失败";
      push({ tone: "danger", title: "新建失败", description: msg });
    }
  };

  const openProject = (p: Project) => setActiveId(p.id);
  const active = projects.find((p) => p.id === activeId) ?? null;

  /**
   * 行内注释7：重命名走后端 PATCH /canvases/{id}。
   */
  const doRename = async (title: string) => {
    if (!active) return;
    try {
      const c = await renameCanvas(active.id, title);
      setProjects((p) => p.map((x) => (x.id === active.id ? { ...x, title: c.title } : x)));
      push({ tone: "success", title: "已重命名" });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "重命名失败";
      push({ tone: "danger", title: "重命名失败", description: msg });
    }
  };

  return (
    <WorkspaceShell>
      {active ? (
        <CanvasEditor
          project={active}
          onBack={() => setActiveId(null)}
          onRename={(title) => void doRename(title)}
        />
      ) : (
        <div className="canvas-workspace-layout flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0 lg:h-full">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto pb-10 scrollbar-none">
            <div className="mx-auto w-full min-w-0 max-w-shell overflow-x-hidden px-4 scrollbar-none sm:px-6 lg:px-10">
              {/* —— 新手教程 —— */}
              <section
                aria-label="画布视频教程"
                className={`canvas-video-tutorial-section w-full min-w-0 transform-gpu transition-all duration-300 ease-out mt-4 sm:mt-6 ${
                  collapsed
                    ? "max-h-14 translate-y-0 overflow-hidden opacity-100"
                    : "max-h-[28rem] translate-y-0 opacity-100"
                }`}
              >
                <header className="video-tutorial-header mb-4 flex items-center gap-2">
                  <h2 className="video-tutorial-title text-base font-semibold tracking-tight text-[var(--color-text)] sm:text-lg">
                    新手教程
                  </h2>
                  <button
                    type="button"
                    aria-label={collapsed ? "展开新手教程" : "收起新手教程"}
                    aria-expanded={!collapsed}
                    onClick={() => setCollapsed((v) => !v)}
                    className="tutorial-collapse-action group relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/[0.045] text-[var(--color-text-muted)] transition hover:text-accent-deep"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                      stroke="currentColor"
                      aria-hidden
                      className="h-3.5 w-3.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 18.75 7.5-7.5 7.5 7.5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 7.5-7.5 7.5 7.5" />
                    </svg>
                    <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-black/75 px-2 py-1 text-[11px] font-medium leading-none text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      {collapsed ? "展开" : "收起"}
                    </span>
                  </button>
                </header>
                <div className="canvas-video-tutorial-grid grid grid-cols-4 gap-2.5 sm:gap-3">
                  {TUTORIALS.map((t) => (
                    <button
                      key={t.n}
                      type="button"
                      aria-label={`播放视频教程 ${t.n}`}
                      onClick={() =>
                        push({ tone: "neutral", title: `视频教程 ${t.n}`, description: "本地联调：教程视频占位，点击已生效" })
                      }
                      className="canvas-video-tutorial-card group relative isolate aspect-[2/1] min-w-0 overflow-hidden rounded-xl bg-surface shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.1)] sm:rounded-2xl"
                    >
                      <div className="tutorial-cover-frame absolute inset-0 overflow-hidden rounded-[inherit] border border-black/[0.05]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={t.cover}
                          alt={`视频教程 ${t.n}`}
                          className="tutorial-cover block h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <span className="tutorial-play-button absolute left-1/2 top-1/2 z-[3] flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 shadow-lg backdrop-blur-sm transition group-hover:bg-black/60 group-hover:opacity-100 sm:h-12 sm:w-12">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden
                          className="h-5 w-5 translate-x-0.5 sm:h-6 sm:w-6"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* —— 我的创作 —— */}
              <section className="mt-6 w-full min-w-0 sm:mt-8">
                <header className="mb-4 flex items-center gap-2">
                  <h2 className="recent-project-title text-base font-semibold tracking-tight text-[var(--color-text)] sm:text-lg">
                    我的创作
                  </h2>
                </header>
                <div className="canvas-recent-project-list flex min-h-0 flex-col pb-2">
                  <div
                    className="canvas-recent-project-grid grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5 lg:grid-cols-5 lg:gap-3 xl:grid-cols-6"
                    aria-busy="false"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => void createProject()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          void createProject();
                        }
                      }}
                      className="canvas-start-create-card group/card relative flex w-full flex-col rounded-xl border-0 bg-transparent shadow-none ring-0 cursor-pointer"
                      aria-disabled="false"
                      aria-label="新建画布"
                    >
                      <div className="canvas-start-create-button relative flex aspect-square w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#fafafa] text-left shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.05] outline-none transition duration-300 ease-out [transform:translateZ(0)] group-hover/card:-translate-y-0.5 group-hover/card:shadow-[0_12px_28px_rgba(15,23,42,0.1)]">
                        <span className="inline-flex items-center justify-center text-muted transition group-hover/card:scale-105 group-hover/card:text-accent-deep">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.15}
                            stroke="currentColor"
                            aria-hidden
                            className="h-8 w-8"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </span>
                        <span className="text-[11px] font-semibold text-foreground">新建</span>
                      </div>
                      <div className="canvas-start-create-meta flex min-h-[2.25rem] flex-col justify-center border-t-0 bg-transparent px-2 py-1.5">
                        <p className="truncate text-[11px] font-semibold leading-snug text-foreground">
                          开始创作
                        </p>
                      </div>
                    </div>
                    {loading ? (
                      <p className="col-span-full py-8 text-center text-xs text-muted">加载中…</p>
                    ) : null}
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => openProject(p)}
                        className="group/card relative flex w-full flex-col rounded-xl border-0 bg-transparent text-left shadow-none ring-0 cursor-pointer"
                      >
                        <div className="relative flex aspect-square w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-surface text-left shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.05] outline-none transition duration-300 ease-out [transform:translateZ(0)] group-hover/card:-translate-y-0.5 group-hover/card:shadow-[0_12px_28px_rgba(15,23,42,0.1)]">
                          <span className="text-[11px] font-semibold text-foreground">{p.title}</span>
                          <span className="text-[10px] text-muted">{p.at}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
