"use client";

import { useMemo, useState } from "react";
import { ToolLayout } from "@/components/features/ToolLayout";
import { FieldGroup } from "@/components/features/QuotePanel";
import { UploadSlots, type UploadedFile } from "@/components/features/UploadSlots";
import { Button, Input, Label, Select, Checkbox } from "@/components/ui/primitives";
import { Card, CardBody, CardHeader, CardTitle, Badge, EmptyState, Table, Th, Td } from "@/components/ui/surfaces";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/features/ToastHost";
import { Database, Star, Download, Search } from "lucide-react";

// E2 石材材质库：品类/纹理/色系/应用部位多维标签 + 材质卡 + 实拍上传 + 检索收藏 + 批量导出
// 行内注释1：四维标签用四个 Select 联动过滤，全部存在 MOCK 材料上，保证可点可查
// 行内注释2：收藏用 Set 存 id， onlyFav 开关过滤，不走后端
// 行内注释3：材质卡 = 选中材料的缩略图 + 标签 + 规格，一键复制提示词片段
// TODO(API): 接入 GET /stone/materials（分页+标签过滤）与 POST /stone/materials（新建）
interface StoneMaterial {
  id: string;
  name: string;
  category: string;
  texture: string;
  color: string;
  usage: string;
  thumb: string;
  spec: string;
}

const MATERIALS: StoneMaterial[] = [
  { id: "st_001", name: "卡拉拉白", category: "大理石", texture: "直纹", color: "白色系", usage: "地面铺装", thumb: "/images/toapi/asset-1.png", spec: "亮面 · 800×800" },
  { id: "st_002", name: "爵士白", category: "大理石", texture: "网纹", color: "白色系", usage: "背景墙", thumb: "/images/toapi/asset-2.png", spec: "亮面 · 750×1500" },
  { id: "st_003", name: "黑金花", category: "花岗岩", texture: "颗粒", color: "黑色系", usage: "前台", thumb: "/images/toapi/asset-3.png", spec: "哑光 · 600×600" },
  { id: "st_004", name: "米黄洞石", category: "石灰石", texture: "洞孔", color: "米色系", usage: "墙面干挂", thumb: "/images/toapi/asset-4.png", spec: "哑光 · 600×1200" },
  { id: "st_005", name: "鱼肚白", category: "大理石", texture: "云纹", color: "白色系", usage: "洗手台", thumb: "/images/toapi/asset-5.png", spec: "高光 · 750×750" },
  { id: "st_006", name: "深啡网", category: "大理石", texture: "网纹", color: "啡色系", usage: "楼梯踏步", thumb: "/images/toapi/asset-6.png", spec: "防滑 · 300×600" },
];

export default function StoneMaterialsPage() {
  const { push } = useToast();
  // 行内注释4：过滤状态四件套，任一变化都触发 useMemo 重算
  const [category, setCategory] = useState("全部");
  const [texture, setTexture] = useState("全部");
  const [color, setColor] = useState("全部");
  const [usage, setUsage] = useState("全部");
  const [query, setQuery] = useState("");
  const [favs, setFavs] = useState<Set<string>>(new Set(["st_001"]));
  const [onlyFav, setOnlyFav] = useState(false);
  const [selected, setSelected] = useState<StoneMaterial | null>(MATERIALS[0]);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  // 行内注释5：派生过滤 —— 先标签后关键词最后收藏，保证空结果可解释
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MATERIALS.filter((m) => {
      if (category !== "全部" && m.category !== category) return false;
      if (texture !== "全部" && m.texture !== texture) return false;
      if (color !== "全部" && m.color !== color) return false;
      if (usage !== "全部" && m.usage !== usage) return false;
      if (onlyFav && !favs.has(m.id)) return false;
      if (q && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [category, texture, color, usage, query, onlyFav, favs]);

  // 行内注释6：收藏切换 —— 新 Set 替换旧 Set，触发重渲染
  const toggleFav = (id: string) =>
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ToolLayout
      title="石材材质库"
      description="多维标签检索 · 材质卡 · 实拍上传"
      breadcrumbs={[{ label: "工具箱", href: "/toolbox" }, { label: "行业", href: "/toolbox" }, { label: "石材材质库" }]}
      params={
        <>
          <FieldGroup title="多维检索" description="四个维度可组合过滤">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "品类", value: category, set: setCategory, opts: ["全部", "大理石", "花岗岩", "石灰石"] },
                { label: "纹理", value: texture, set: setTexture, opts: ["全部", "直纹", "网纹", "颗粒", "洞孔", "云纹"] },
                { label: "色系", value: color, set: setColor, opts: ["全部", "白色系", "米色系", "黑色系", "啡色系"] },
                { label: "应用部位", value: usage, set: setUsage, opts: ["全部", "地面铺装", "背景墙", "前台", "墙面干挂", "洗手台", "楼梯踏步"] },
              ].map((f) => (
                <div key={f.label}>
                  <Label className="mb-1 block text-[11px]">{f.label}</Label>
                  <Select value={f.value} onChange={(e) => f.set(e.target.value)} aria-label={f.label}>
                    {f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索材质名" aria-label="搜索材质" />
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-fg-muted">
                <Checkbox checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)} />仅收藏
              </label>
            </div>
          </FieldGroup>

          <FieldGroup title="实拍上传" description="上传后自动打标签，可转效果图">
            <UploadSlots label="上传实拍" accept="image/*" max={10} value={files} onChange={setFiles} hint="自动识别品类与色系" />
          </FieldGroup>

          <FieldGroup title="批量操作">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => push({ tone: "success", title: favs.size ? "导出已开始" : "请先收藏材质", description: favs.size ? `${favs.size} 个收藏材质已打包 · ZIP 下载中` : "点击卡片右下角星标收藏" })}><Download className="size-3.5" aria-hidden />导出选中</Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => { setSelected(rows[0] ?? null); push({ tone: "neutral", title: "材质卡已生成", description: rows[0] ? rows[0].name : "暂无材质" }); }}>生成材质卡</Button>
            </div>
            <p className="text-[11px] text-fg-subtle">TODO(API): 批量导出走 POST /stone/materials/export，返回打包下载链接</p>
          </FieldGroup>
        </>
      }
      results={
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="size-4 text-accent" aria-hidden />材质检索（{rows.length}）</CardTitle>
              <span className="flex items-center gap-1.5 text-xs text-fg-subtle"><Search className="size-3" aria-hidden />{query ? `关键词“${query}”` : "全部材质"}</span>
            </CardHeader>
            <CardBody>
              {rows.length === 0 ? (
                <EmptyState icon={<Search className="size-5" />} title="没有匹配的材质" description="放宽标签或关键词试试" />
              ) : (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {rows.map((m) => (
                    <div key={m.id} className={cn("overflow-hidden rounded-sm border bg-surface-2 transition-colors", selected?.id === m.id ? "border-accent" : "border-line")}>
                      <button type="button" onClick={() => setSelected(m)} className="block w-full text-left">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.thumb} alt={m.name} className="aspect-[4/3] w-full object-cover" />
                        <span className="block px-2.5 py-2">
                          <span className="block truncate text-sm text-fg">{m.name}</span>
                          <span className="tabular mt-0.5 block text-[11px] text-fg-subtle">{m.category} · {m.texture} · {m.color}</span>
                        </span>
                      </button>
                      <div className="flex items-center justify-between border-t border-line px-2 py-1.5">
                        <span className="text-[11px] text-fg-subtle">{m.usage}</span>
                        <button type="button" onClick={() => toggleFav(m.id)} aria-pressed={favs.has(m.id)} aria-label={favs.has(m.id) ? `取消收藏${m.name}` : `收藏${m.name}`} className={favs.has(m.id) ? "text-accent" : "text-fg-subtle hover:text-fg"}>
                          <Star className={cn("size-3.5", favs.has(m.id) && "fill-current")} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>材质卡</CardTitle>{selected && <Badge tone="accent">{selected.id}</Badge>}</CardHeader>
            <CardBody>
              {!selected ? <EmptyState icon={<Database className="size-5" />} title="未选中材质" description="点击上方任意材质生成卡片" /> : (
                <div className="space-y-2 text-sm">
                  <Table><tbody>
                    {[["名称", selected.name], ["规格", selected.spec], ["应用", selected.usage], ["标签", `${selected.category}/${selected.texture}/${selected.color}`]].map(([k, v]) => (
                      <tr key={k}><Th>{k}</Th><Td>{v}</Td></tr>
                    ))}
                  </tbody></Table>
                  <Button variant="secondary" size="sm" className="w-full" onClick={async () => { const text = `${selected.name} ${selected.category} ${selected.texture} ${selected.color}，${selected.spec}`; try { await navigator.clipboard.writeText(text); } catch { /* noop */ } push({ tone: "success", title: "提示词已复制", description: text }); }}>复制提示词片段</Button>
                  <p className="text-[11px] text-fg-subtle">材质卡可直接粘贴到效果图页做材质锚定</p>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      }
    />
  );
}
