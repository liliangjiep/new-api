"use client";

import { useMemo, useRef, useState } from "react";
import { WorkspaceShell } from "@/components/features/WorkspaceShell";
import { useToast } from "@/components/features/ToastHost";
import { MOCK_ASSETS, formatBytes, type AssetKind } from "@/lib/domain";
import { Drawer, Modal } from "@/components/ui/overlays";
import { Input, Button, Select } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/surfaces";
import { cn } from "@/lib/cn";
import { Search, Upload, Download, Trash2, Eye, X, CheckSquare } from "lucide-react";

const TABS: { id: AssetKind | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "video", label: "视频" },
  { id: "image", label: "图片" },
  { id: "audio", label: "音频" },
];

export default function AssetsPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<AssetKind | "all">("all");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("全部分组");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [assets, setAssets] = useState(MOCK_ASSETS);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => ["全部分组", ...Array.from(new Set(assets.map((a) => a.group)))], [assets]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (tab !== "all" && a.kind !== tab) return false;
      if (group !== "全部分组" && a.group !== group) return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assets, tab, query, group]);

  const preview = assets.find((a) => a.id === previewId) ?? null;
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleAll = () =>
    setSelected((p) => {
      const n = new Set(p);
      if (allChecked) rows.forEach((r) => n.delete(r.id));
      else rows.forEach((r) => n.add(r.id));
      return n;
    });

  const doUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files).slice(0, 10).map((f, i) => ({
      id: `ast_local_${Date.now()}_${i}`,
      name: f.name,
      kind: (f.type.startsWith("video") ? "video" : f.type.startsWith("audio") ? "audio" : "image") as AssetKind,
      size: f.size,
      createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      group: "产品素材",
      tags: ["本地上传"],
      thumb: "/images/toapi/asset-1.png",
    }));
    setAssets((p) => [...incoming, ...p]);
    setUploadOpen(false);
    push({ tone: "success", title: `已上传 ${incoming.length} 个文件`, description: "前端演示：已加入资产库（mock）" });
  };

  const delSelected = () => {
    if (selected.size === 0) {
      push({ tone: "warning", title: "请先勾选素材" });
      return;
    }
    setAssets((p) => p.filter((a) => !selected.has(a.id)));
    push({ tone: "success", title: `已删除 ${selected.size} 个素材` });
    setSelected(new Set());
  };

  const downloadSelected = () => {
    if (selected.size === 0) {
      push({ tone: "warning", title: "请先勾选素材" });
      return;
    }
    push({ tone: "success", title: "打包下载已开始", description: `${selected.size} 个素材 ZIP 下载中（演示）` });
  };

  return (
    <WorkspaceShell>
      <section className="page-assets relative z-[1] mx-auto flex w-full max-w-shell shrink-0 flex-col gap-6 bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6">
        <header className="flex max-w-4xl shrink-0 flex-wrap items-center gap-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">我的资产</h1>
            <p className="mt-1 text-xs text-muted">共 {assets.length} 个 · 勾选可批量下载 / 删除 / 移动分组</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setUploadOpen(true)}>
              <Upload className="size-3.5" aria-hidden />上传素材
            </Button>
            <Button size="sm" variant="secondary" disabled={selected.size === 0} onClick={downloadSelected}>
              <Download className="size-3.5" aria-hidden />下载({selected.size})
            </Button>
            <Button size="sm" variant="secondary" disabled={selected.size === 0} onClick={delSelected}>
              <Trash2 className="size-3.5" aria-hidden />删除
            </Button>
          </div>
        </header>

        {/* 筛选条 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-surface p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  tab === t.id ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-52 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索文件名 / 标签" aria-label="搜索资产" className="pl-8" />
          </div>
          <Select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="分组筛选" className="w-36">
            {groups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
          <button type="button" onClick={toggleAll} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground">
            <CheckSquare className="size-3.5" aria-hidden />{allChecked ? "取消全选" : "全选本页"}
          </button>
        </div>

        {/* 拖拽区 */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); doUpload(e.dataTransfer.files); }}
          className={cn("rounded-xl border border-dashed p-3 text-center text-xs transition-colors", dragOver ? "border-accent bg-accent-soft/30 text-foreground" : "border-line text-muted")}
        >
          拖拽文件到此处快速上传 · 或 <button type="button" className="text-accent-deep underline underline-offset-2" onClick={() => setUploadOpen(true)}>打开上传弹窗</button>
        </div>

        {/* 网格 */}
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed px-3 py-12 text-center text-xs text-muted sm:text-sm">没有匹配的素材 · 换个关键词或分组试试</div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {rows.map((a) => {
              const checked = selected.has(a.id);
              return (
                <li key={a.id} className={cn("group overflow-hidden rounded-xl border bg-surface transition-colors", checked ? "border-accent" : "border-line hover:border-line-strong")}>
                  <div className="relative aspect-[4/3] bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.thumb} alt={a.name} className="size-full object-cover" loading="lazy" />
                    <button type="button" role="checkbox" aria-checked={checked} aria-label={`选择${a.name}`} onClick={() => toggle(a.id)}
                      className={cn("absolute left-2 top-2 grid size-5 place-items-center rounded-md border text-[10px]", checked ? "border-accent bg-accent text-on-accent" : "border-line bg-background/90 text-transparent hover:text-muted")}>✓</button>
                    <span className="absolute right-2 top-2"><Badge tone="neutral">{a.kind === "video" ? "视频" : a.kind === "image" ? "图片" : "音频"}</Badge></span>
                    <span className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button type="button" onClick={() => setPreviewId(a.id)} className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md bg-white/95 text-[11px] font-medium text-black"><Eye className="size-3" aria-hidden />预览</button>
                    </span>
                  </div>
                  <div className="space-y-1 p-2.5">
                    <p className="truncate text-xs font-medium text-foreground" title={a.name}>{a.name}</p>
                    <p className="tabular text-[10px] text-subtle">{formatBytes(a.size)} · {a.createdAt}</p>
                    <p className="flex items-center justify-between gap-2">
                      <span className="truncate text-[10px] text-muted">{a.group} · {a.tags.join("/")}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 上传弹窗 */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="上传素材" description="支持图片 / 视频 / 音频，单次最多 10 个" footer={<><Button variant="secondary" onClick={() => setUploadOpen(false)}>取消</Button><Button onClick={() => fileRef.current?.click()}>选择文件</Button></>}>
        <div className="space-y-3">
          <input ref={fileRef} type="file" multiple accept="image/*,video/*,audio/*" className="hidden" aria-label="选择上传文件" onChange={(e) => doUpload(e.target.files)} />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-line bg-surface-2/60 px-4 py-8 text-center hover:border-accent">
            <Upload className="size-5 text-muted" aria-hidden />
            <span className="text-sm text-foreground">点击选择文件</span>
            <span className="text-[11px] text-subtle">或直接拖拽到页面虚线区</span>
          </button>
          <p className="text-[11px] leading-relaxed text-subtle">TODO(API): 接入 POST /assets/upload-policy 直传对象存储，完成后调用 POST /assets/complete 回填。</p>
        </div>
      </Modal>

      {/* 预览抽屉 */}
      <Drawer
        open={!!preview}
        onClose={() => setPreviewId(null)}
        title={preview ? preview.name : "预览"}
        footer={
          preview ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => { setRenameValue(preview.name); setRenameOpen(true); }}>重命名</Button>
              <Button variant="secondary" size="sm" onClick={() => push({ tone: "success", title: "下载已开始", description: preview.name })}><Download className="size-3.5" aria-hidden />下载</Button>
              <Button size="sm" onClick={() => setPreviewId(null)}>关闭</Button>
            </>
          ) : undefined
        }
      >
        {preview && (
          <div className="space-y-3 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.thumb} alt={preview.name} className="aspect-video w-full rounded-lg border border-line object-cover" />
            <dl className="space-y-2">
              {[["类型", preview.kind], ["大小", formatBytes(preview.size)], ["分组", preview.group], ["标签", preview.tags.join(" / ")], ["上传", preview.createdAt]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-subtle">{k}</dt><dd className="text-foreground">{v}</dd></div>
              ))}
            </dl>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => push({ tone: "neutral", title: "已移动分组（演示）", description: preview.name })}>移动分组</Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => { setAssets((p) => p.filter((a) => a.id !== preview.id)); setPreviewId(null); push({ tone: "success", title: "已删除" }); }}><Trash2 className="size-3.5" aria-hidden />删除</Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* 重命名弹窗 */}
      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="重命名" footer={<><Button variant="secondary" onClick={() => setRenameOpen(false)}>取消</Button><Button disabled={!renameValue.trim()} onClick={() => { if (preview) setAssets((p) => p.map((a) => (a.id === preview.id ? { ...a, name: renameValue.trim() } : a))); setRenameOpen(false); push({ tone: "success", title: "已重命名" }); }}>保存</Button></>}>
        <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} aria-label="新文件名" placeholder="输入新文件名" />
      </Modal>
    </WorkspaceShell>
  );
}
