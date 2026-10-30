"use client";

import { useMemo, useState } from "react";
import { StudioShell } from "@/components/layout/StudioShell";
import { Button, Input } from "@/components/ui/primitives";
import {
  Card,
  CardBody,
  Badge,
  EmptyState,
  Tabs,
  Pagination,
} from "@/components/ui/surfaces";
import { Drawer, Modal } from "@/components/ui/overlays";
import { UploadSlots, type UploadedFile } from "@/components/features/UploadSlots";
import { useToast } from "@/components/features/ToastHost";
import { MOCK_ASSETS, formatBytes, type AssetItem } from "@/lib/domain";
import { cn } from "@/lib/cn";
import {
  Upload,
  Search,
  FolderPlus,
  Download,
  Trash2,
  FileVideo,
  FileImage,
  FileAudio,
  Check,
  X,
} from "lucide-react";

const BASE_GROUPS = ["全部", "产品素材", "成片归档", "参考图", "配音"] as const;

// 行内注释1：资产库本地态 —— groups 可新建，assets 可删，全部前端 mock
// 行内注释2：批量模式用 Set 存 id，单选详情用 selected；都走本地 state
// 行内注释3：派生件为 mock 列表，联调后替换 GET /media/derivatives
// 行内注释4：上传抽屉确认后把 UploadedFile 转成 AssetItem 并入列表
// 行内注释5：删除需二次确认（Modal），批量删除同理

function mockDerivatives(a: AssetItem): { id: string; label: string; spec: string }[] {
  if (a.kind === "video") {
    return [
      { id: `${a.id}_thumb`, label: "首帧缩略图", spec: "640×360 · jpg" },
      { id: `${a.id}_720p`, label: "转码 720P", spec: "mp4 · h264" },
      { id: `${a.id}_gif`, label: "预览动图", spec: "gif · 3s" },
    ];
  }
  if (a.kind === "audio") {
    return [
      { id: `${a.id}_wave`, label: "波形预览", spec: "png" },
      { id: `${a.id}_mp3`, label: "转码 MP3", spec: "128kbps" },
    ];
  }
  return [
    { id: `${a.id}_thumb`, label: "缩略图", spec: "512×512 · webp" },
    { id: `${a.id}_2k`, label: "高清放大", spec: "2K · png" },
  ];
}

export default function AssetsPage() {
  const { push } = useToast();
  const [assets, setAssets] = useState<AssetItem[]>(MOCK_ASSETS);
  const [groups, setGroups] = useState<string[]>([...BASE_GROUPS]);
  const [group, setGroup] = useState<string>("全部");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AssetItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploadGroup, setUploadGroup] = useState<string>("产品素材");
  const [groupModal, setGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AssetItem | null>(null);
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [viewDerivative, setViewDerivative] = useState<string | null>(null);
  const pageSize = 24;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      const inGroup = group === "全部" || a.group === group;
      const inQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q));
      return inGroup && inQuery;
    });
  }, [assets, group, query]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const toggleCheck = (id: string) =>
    setChecked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const createGroup = () => {
    const name = groupName.trim();
    if (!name) {
      push({ tone: "warning", title: "请输入分组名称" });
      return;
    }
    if (groups.includes(name)) {
      push({ tone: "warning", title: "分组已存在", description: name });
      return;
    }
    setGroups((g) => [...g, name]);
    setGroup(name);
    setPage(1);
    setGroupName("");
    setGroupModal(false);
    push({ tone: "success", title: "分组已创建", description: name });
  };

  const confirmImport = () => {
    if (files.length === 0) {
      push({ tone: "warning", title: "请先选择文件" });
      return;
    }
    const now = new Date();
    const stamp = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const additions: AssetItem[] = files.map((f, i) => {
      const ext = f.name.includes(".") ? f.name.split(".").pop()!.toLowerCase() : "";
      const kind = ["mp4", "mov", "webm"].includes(ext)
        ? "video"
        : ["mp3", "wav", "m4a"].includes(ext)
          ? "audio"
          : "image";
      return {
        id: `ast_local_${Date.now()}_${i}`,
        name: f.name,
        kind,
        size: f.size,
        createdAt: `2026-${stamp}`,
        group: groups.includes(uploadGroup) ? uploadGroup : "产品素材",
        tags: ["本地上传"],
        thumb: `/images/toapi/asset-${((assets.length + i) % 6) + 1}.png`,
      };
    });
    setAssets((p) => [...additions, ...p]);
    setFiles([]);
    setUploading(false);
    setPage(1);
    push({ tone: "success", title: `已导入 ${additions.length} 个素材`, description: `已归入「${uploadGroup}」` });
  };

  const doDeleteOne = (a: AssetItem) => {
    setAssets((p) => p.filter((x) => x.id !== a.id));
    setChecked((p) => p.filter((x) => x !== a.id));
    if (selected?.id === a.id) setSelected(null);
    setConfirmDelete(null);
    push({ tone: "success", title: "已删除", description: a.name });
  };

  const doDeleteBatch = () => {
    setAssets((p) => p.filter((x) => !checked.includes(x.id)));
    push({ tone: "success", title: `已删除 ${checked.length} 个素材` });
    setChecked([]);
    setBatchMode(false);
    setConfirmBatch(false);
  };

  const mockDownload = (names: string[]) =>
    push({
      tone: "success",
      title: names.length === 1 ? `开始下载 ${names[0]}` : `开始批量下载 ${names.length} 个文件`,
      description: "前端 mock：联调后替换为对象存储签名 URL 直接下载",
    });

  return (
    <StudioShell
      title="资产库"
      description="素材、分组、角色与派生件"
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setBatchMode((v) => !v);
              setChecked([]);
            }}
            aria-pressed={batchMode}
          >
            {batchMode ? "退出多选" : "批量管理"}
          </Button>
          <Button size="sm" onClick={() => setUploading(true)}>
            <Upload className="size-3.5" aria-hidden />
            上传素材
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="搜索素材名称或标签"
              aria-label="搜索素材"
              className="pl-8"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => setGroupModal(true)}>
            <FolderPlus className="size-3.5" aria-hidden />
            新建分组
          </Button>
          {batchMode && (
            <>
              <span className="tabular text-xs text-fg-subtle">已选 {checked.length} 项</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={checked.length === 0}
                onClick={() =>
                  mockDownload(
                    assets.filter((a) => checked.includes(a.id)).map((a) => a.name)
                  )
                }
              >
                <Download className="size-3.5" aria-hidden />
                批量下载
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={checked.length === 0}
                onClick={() => setConfirmBatch(true)}
              >
                <Trash2 className="size-3.5" aria-hidden />
                批量删除
              </Button>
            </>
          )}
        </div>

        <Tabs
          items={groups.map((g) => ({
            id: g,
            label: g,
            count:
              g === "全部" ? assets.length : assets.filter((a) => a.group === g).length,
          }))}
          value={group}
          onChange={(id) => {
            setGroup(id);
            setPage(1);
          }}
        />

        {paged.length === 0 ? (
          <Card>
            <CardBody>
              <EmptyState
                icon={<Search className="size-5" />}
                title="没有匹配的素材"
                description="换个关键词或分组试试，也可以直接上传新素材"
                action={
                  <Button size="sm" onClick={() => setUploading(true)}>
                    <Upload className="size-3.5" aria-hidden />
                    上传素材
                  </Button>
                }
              />
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {paged.map((a) => {
                  const isChecked = checked.includes(a.id);
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => (batchMode ? toggleCheck(a.id) : setSelected(a))}
                        aria-pressed={batchMode ? isChecked : undefined}
                        className={cn(
                          "group w-full overflow-hidden rounded-sm border border-line bg-surface-2 text-left transition-colors hover:border-line-strong",
                          batchMode && isChecked && "border-accent ring-1 ring-accent/50"
                        )}
                      >
                        <span className="relative flex aspect-square items-center justify-center bg-surface-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={a.thumb}
                            alt={a.name}
                            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <span className="absolute left-1.5 top-1.5">
                            <Badge tone="neutral">
                              {a.kind === "video" ? (
                                <FileVideo className="size-2.5" aria-hidden />
                              ) : a.kind === "audio" ? (
                                <FileAudio className="size-2.5" aria-hidden />
                              ) : (
                                <FileImage className="size-2.5" aria-hidden />
                              )}
                            </Badge>
                          </span>
                          {batchMode && (
                            <span
                              className={cn(
                                "absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-xs border",
                                isChecked
                                  ? "border-accent bg-accent text-accent-fg"
                                  : "border-line bg-surface/80 text-transparent"
                              )}
                              aria-hidden
                            >
                              <Check className="size-3" />
                            </span>
                          )}
                        </span>
                        <span className="block px-2 py-1.5">
                          <span className="block truncate text-xs text-fg">{a.name}</span>
                          <span className="tabular mt-0.5 flex items-center justify-between text-[10px] text-fg-subtle">
                            {formatBytes(a.size)}
                            <span>{a.createdAt.slice(5, 10)}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
            <div className="border-t border-line">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
              />
            </div>
          </Card>
        )}
      </div>

      {/* 新建分组弹窗 */}
      <Modal
        open={groupModal}
        onClose={() => setGroupModal(false)}
        title="新建分组"
        description="分组仅为前端组织维度，联调后同步到服务端"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setGroupModal(false)}>
              取消
            </Button>
            <Button size="sm" onClick={createGroup}>
              创建分组
            </Button>
          </>
        }
      >
        <label htmlFor="group-name" className="mb-1.5 block text-xs font-medium text-fg-muted">
          分组名称
        </label>
        <Input
          id="group-name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") createGroup();
          }}
          placeholder="如：展厅实拍 / 待处理"
          autoFocus
        />
      </Modal>

      {/* 资产详情抽屉 */}
      <Drawer
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setViewDerivative(null);
        }}
        title={selected?.name ?? ""}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => selected && mockDownload([selected.name])}>
              <Download className="size-3.5" aria-hidden />
              下载
            </Button>
            <Button variant="danger" size="sm" onClick={() => selected && setConfirmDelete(selected)}>
              <Trash2 className="size-3.5" aria-hidden />
              删除
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-sm border border-line bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.thumb} alt={selected.name} className="aspect-square w-full object-cover" />
            </div>

            <dl className="space-y-2.5 text-sm">
              {[
                { k: "资产 ID", v: selected.id },
                { k: "类型", v: selected.kind === "video" ? "视频" : selected.kind === "audio" ? "音频" : "图片" },
                { k: "大小", v: formatBytes(selected.size) },
                { k: "分组", v: selected.group },
                { k: "创建时间", v: selected.createdAt },
              ].map((r) => (
                <div key={r.k} className="flex justify-between gap-4">
                  <dt className="text-fg-subtle">{r.k}</dt>
                  <dd className="tabular truncate text-fg">{r.v}</dd>
                </div>
              ))}
            </dl>

            <div>
              <p className="mb-1.5 text-xs font-medium text-fg-muted">标签</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.tags.map((t) => (
                  <Badge key={t} tone="neutral">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-fg-muted">派生件（mock）</p>
              <ul className="space-y-1.5">
                {mockDerivatives(selected).map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setViewDerivative(viewDerivative === d.id ? null : d.id)}
                      aria-expanded={viewDerivative === d.id}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-sm border px-2.5 py-2 text-left transition-colors",
                        viewDerivative === d.id
                          ? "border-accent bg-accent-soft/30"
                          : "border-line bg-surface-2 hover:border-line-strong"
                      )}
                    >
                      <span className="text-xs text-fg">{d.label}</span>
                      <span className="tabular text-[11px] text-fg-subtle">{d.spec}</span>
                    </button>
                    {viewDerivative === d.id && (
                      <div className="mt-1.5 overflow-hidden rounded-sm border border-line bg-surface-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selected.thumb} alt={`${selected.name} 派生预览`} className="aspect-video w-full object-cover opacity-90" />
                        <p className="tabular px-2 py-1.5 text-[11px] text-fg-subtle">
                          {d.id} · 联调后替换为真实派生文件地址
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-fg-subtle">
                TODO(API): 接入 /media/derivatives，展示该素材派生的缩略图与转码版本
              </p>
            </div>
          </div>
        )}
      </Drawer>

      {/* 上传抽屉 */}
      <Drawer
        open={uploading}
        onClose={() => setUploading(false)}
        title="上传素材"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setUploading(false)}>
              稍后
            </Button>
            <Button size="sm" onClick={confirmImport} disabled={files.length === 0}>
              导入到库（{files.length}）
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-fg-subtle">
            两段式直传：先向服务端换取上传凭证，直传对象存储后回调确认。图片自动生成缩略图，
            视频自动提取元数据与关键帧。
          </p>
          <div>
            <label htmlFor="upload-group" className="mb-1.5 block text-xs font-medium text-fg-muted">
              归入分组
            </label>
            <div className="flex flex-wrap gap-1.5">
              {groups
                .filter((g) => g !== "全部")
                .map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setUploadGroup(g)}
                    aria-pressed={uploadGroup === g}
                    className={cn(
                      "rounded-xs border px-2.5 py-1.5 text-xs transition-colors",
                      uploadGroup === g
                        ? "border-accent bg-accent-soft/40 text-fg"
                        : "border-line bg-surface-2 text-fg-muted hover:border-line-strong"
                    )}
                  >
                    {g}
                  </button>
                ))}
            </div>
          </div>
          <UploadSlots
            label="选择文件"
            accept="image/*,video/*,audio/*"
            max={20}
            value={files}
            onChange={setFiles}
          />
        </div>
      </Drawer>

      {/* 单个删除确认 */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="确认删除"
        description={`将删除「${confirmDelete?.name ?? ""}」，该操作前端 mock 立即生效`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
              取消
            </Button>
            <Button variant="danger" size="sm" onClick={() => confirmDelete && doDeleteOne(confirmDelete)}>
              <Trash2 className="size-3.5" aria-hidden />
              确认删除
            </Button>
          </>
        }
      >
        <p className="flex items-center gap-2 text-xs text-fg-subtle">
          <X className="size-3.5" aria-hidden />
          关联的引用（画布节点、任务输入）将显示缺失占位。
        </p>
      </Modal>

      {/* 批量删除确认 */}
      <Modal
        open={confirmBatch}
        onClose={() => setConfirmBatch(false)}
        title={`确认批量删除 ${checked.length} 项`}
        description="批量删除前端 mock 立即生效，不可撤销"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmBatch(false)}>
              取消
            </Button>
            <Button variant="danger" size="sm" onClick={doDeleteBatch}>
              确认删除
            </Button>
          </>
        }
      >
        <p className="tabular text-xs text-fg-subtle">共 {checked.length} 个素材将被移除。</p>
      </Modal>
    </StudioShell>
  );
}
