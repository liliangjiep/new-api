"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExampleCarousel,
  PANEL,
  PANEL_BODY,
  PANEL_HEADER,
  PreviewPanel,
  QueuePanel,
  SubmitBar,
  ToolHeader,
  ToolboxShell,
} from "@/components/features/BenchWorkspace";
import { PopoverSelect, TallPopoverSelect } from "@/components/features/PopoverSelect";
import { useToast } from "@/components/features/ToastHost";
import { cn } from "@/lib/cn";

/* ===== 85191 模块常量（原站逐字） ===== */
const MODULE_PURPOSES = [
  "首图 / 主视觉",
  "场景图 / 使用",
  "卖点图 / 功效",
  "细节图 / 材质",
  "包装图 / 到手",
  "收尾图 / CTA",
  "成分图 / 配料",
  "结构图 / 功能",
  "对比图 / 痛点",
];
const MAX_TOTAL = 16; // uu.HR
const SLOT_MAX: Record<string, number> = { product: 8, person: 2, background: 3 }; // uu.m9
const SLOT_LABEL: Record<string, string> = { product: "商品", person: "人物", background: "背景" }; // uu.BO
const SLOT_ROLES: string[] = ["product", "person", "background"]; // uu.j8
const DEFAULT_COUNTS: Record<string, number> = {
  "首图 / 主视觉": 2,
  "场景图 / 使用": 2,
  "卖点图 / 功效": 1,
  "细节图 / 材质": 1,
}; // uI()

/* 549707 模块缩略图（我们自生成，路径对应原站 module-thumbnails/） */
const MODULE_THUMBS: Record<string, string> = {
  "首图 / 主视觉": "/images/ec/mod-thumb-primary-visual.jpg",
  "场景图 / 使用": "/images/ec/mod-thumb-usage-scene.jpg",
  "卖点图 / 功效": "/images/ec/mod-thumb-benefit-highlight.jpg",
  "细节图 / 材质": "/images/ec/mod-thumb-material-detail.jpg",
  "包装图 / 到手": "/images/ec/mod-thumb-package-unboxing.jpg",
  "收尾图 / CTA": "/images/ec/mod-thumb-closing-cta.jpg",
  "成分图 / 配料": "/images/ec/mod-thumb-ingredient-formula.jpg",
  "结构图 / 功能": "/images/ec/mod-thumb-functional-structure.jpg",
  "对比图 / 痛点": "/images/ec/mod-thumb-pain-point-comparison.jpg",
};

/* 549707 参考示例 12 张（原站 examples/ecommerce-detail-example-01..12.jpg 的用途顺序） */
const EXAMPLE_ORDER = [
  "首图 / 主视觉",
  "卖点图 / 功效",
  "细节图 / 材质",
  "成分图 / 配料",
  "场景图 / 使用",
  "结构图 / 功能",
  "卖点图 / 功效",
  "对比图 / 痛点",
  "场景图 / 使用",
  "细节图 / 材质",
  "包装图 / 到手",
  "收尾图 / CTA",
];
const EXAMPLES = Array.from({ length: 12 }, (_, i) => ({
  src: `/images/ec/ecommerce-detail-example-${String(i + 1).padStart(2, "0")}.jpg`,
  alt: `${EXAMPLE_ORDER[i]}参考示例 ${i + 1}`,
}));

/* 上传位：64×64 方卡 + 下方标签 + 竖分隔线（原站 reference-slot-* 实测） */
const SLOT_COVERS: Record<string, string> = {
  product: "/toolboxs/depth-video-clone/product.png",
  person: "/toolboxs/depth-video-clone/person.png",
  background: "/toolboxs/depth-video-clone/background.png",
};

interface Sel {
  modulePurpose: string;
  enabled: boolean;
  count: number;
}

export default function EcommerceImageSetPage() {
  const { push } = useToast();
  const router = useRouter();
  const [sels, setSels] = useState<Sel[]>(
    MODULE_PURPOSES.map((p) => ({
      modulePurpose: p,
      enabled: p in DEFAULT_COUNTS,
      count: DEFAULT_COUNTS[p] ?? 0,
    }))
  );
  const [slots, setSlots] = useState<Record<string, number>>({ product: 0, person: 0, background: 0 });
  const [lang, setLang] = useState("none");
  const [ratio, setRatio] = useState("3:4");
  const [note, setNote] = useState("");
  const [model, setModel] = useState("LC Image 2.5 Pro");
  const [resolution, setResolution] = useState("1K");
  const [format, setFormat] = useState("PNG");
  const [tab, setTab] = useState("example");
  const [results, setResults] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => sels.reduce((a, s) => a + (s.enabled ? s.count : 0), 0), [sels]);
  const selCount = sels.filter((s) => s.enabled).length;

  const change = (modulePurpose: string, patch: Partial<Sel>) => {
    setSels((prev) => {
      const next = prev.map((s) => (s.modulePurpose === modulePurpose ? { ...s, ...patch } : s));
      const sum = next.reduce((a, s) => a + (s.enabled ? s.count : 0), 0);
      if (sum > MAX_TOTAL) {
        push({ tone: "warning", title: `每次最多生成 ${MAX_TOTAL} 张，请先减少其他类型的张数` });
        return prev;
      }
      return next;
    });
  };

  const toggle = (s: Sel) =>
    change(s.modulePurpose, {
      enabled: !s.enabled,
      count: !s.enabled ? s.count || 1 : 0,
    });

  const validate = () => {
    if (slots.product === 0) return "请先上传商品图";
    for (const r of SLOT_ROLES) {
      if (slots[r] > SLOT_MAX[r]) return `${SLOT_LABEL[r]}图最多 ${SLOT_MAX[r]} 张，请移除超出的素材`;
    }
    if (total === 0) return "请至少设置一种图片类型的张数";
    return null;
  };
  const err = validate();

  const gen = () => {
    if (err) {
      push({ tone: "warning", title: err });
      return;
    }
    setBusy(true);
    push({ tone: "success", title: "已提交", description: `已选 ${selCount} 类，共 ${total} 张 · ${model}` });
    setTimeout(() => {
      setResults(EXAMPLES.slice(0, total).map((e) => e.src));
      setBusy(false);
      setTab("preview");
      push({ tone: "success", title: "生成完成", description: `${total} 张商详图已就绪` });
    }, 1600);
  };

  return (
    <ToolboxShell
      editor={
        <div className={PANEL}>
          <div className="ecommerce-config-root relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col gap-4">
            <div className={`${PANEL_HEADER} ecommerce-config-header`}>
              <ToolHeader
                title="商详套图"
                onBack={() => router.back()}
                onNew={() => {
                  setSels(
                    MODULE_PURPOSES.map((p) => ({
                      modulePurpose: p,
                      enabled: p in DEFAULT_COUNTS,
                      count: DEFAULT_COUNTS[p] ?? 0,
                    }))
                  );
                  setSlots({ product: 0, person: 0, background: 0 });
                  setNote("");
                }}
              />
            </div>

            <div className={`${PANEL_BODY} ecommerce-config-content -mt-2.5 flex flex-col gap-4 pb-4 pt-2.5`}>
              {/* —— 参考槽位：64×64 卡片，标签在下 —— */}
              <section className="ecommerce-image-set-reference-section min-w-0 shrink-0">
                <div className="reference-slot-list flex w-fit max-w-full min-w-0 items-start gap-0">
                  {SLOT_ROLES.map((r, i) => (
                    <div key={r} className="reference-slot-card group/reference-slot relative flex w-16 flex-col items-center">
                      {i > 0 && (
                        <span
                          className="reference-slot-divider absolute right-0 top-1 h-12 w-px bg-line"
                          aria-hidden
                        />
                      )}
                      <button
                        type="button"
                        aria-label={`添加${SLOT_LABEL[r]}${r === "product" ? " · 必填" : ""}`}
                        onClick={() =>
                          setSlots((p) => ({ ...p, [r]: Math.min(SLOT_MAX[r], p[r] + 1) }))
                        }
                        className="reference-slot-card-stage pointer-events-none relative z-[1] size-16 overflow-hidden rounded-xl border border-line bg-surface"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={SLOT_COVERS[r]}
                          alt=""
                          className="reference-slot-cover-image h-full w-full object-cover"
                        />
                        <span className="reference-slot-cover-upload-icon absolute bottom-1 right-1 flex size-4 items-center justify-center rounded-full bg-black/45 text-[10px] text-white">
                          +
                        </span>
                      </button>
                      <div className="reference-slot-label mt-1 flex h-4 max-w-max shrink-0 items-center gap-0.5">
                        <span className="reference-slot-title text-[10px] text-[#555]">
                          {SLOT_LABEL[r]}
                        </span>
                        {r === "product" ? (
                          <span className="reference-slot-required text-[10px] text-[#888]">· 必填</span>
                        ) : (
                          <span className="reference-slot-optional ml-0.5 text-[10px] text-[#888]">可选</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* —— 选择模块：3 列网格，每格 = 缩略图 + 名称 + 数量步进器 —— */}
              <section className="ecommerce-image-set-type-grid flex shrink-0 flex-col gap-2">
                <div className="ecommerce-image-set-type-grid-heading flex flex-wrap items-center justify-between gap-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="shrink-0 text-xs font-semibold text-foreground">选择模块</h3>
                    {err === "请至少设置一种图片类型的张数" && (
                      <p className="text-[11px] text-danger" role="status">
                        请至少设置一种图片类型的张数
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] tabular-nums text-muted">
                    已选 {selCount} 类，共 {total} 张
                  </span>
                </div>
                <div className="ecommerce-image-set-type-grid-items grid grid-cols-3 gap-3 max-[540px]:grid-cols-2 max-[375px]:grid-cols-1">
                  {sels.map((s) => (
                    <div
                      key={s.modulePurpose}
                      role="button"
                      tabIndex={0}
                      aria-label={`${s.enabled ? "取消选择" : "选择"}${s.modulePurpose}`}
                      aria-pressed={s.enabled}
                      onClick={() => toggle(s)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggle(s);
                        }
                      }}
                      className={cn(
                        "ecommerce-image-set-type-grid-item group relative flex min-w-0 flex-row gap-0 overflow-hidden rounded-md border border-[#e5e5e5] p-0",
                        s.enabled ? "cursor-pointer bg-surface" : "cursor-pointer bg-[#eee]"
                      )}
                    >
                      <div className="ecommerce-image-set-type-grid-header pointer-events-none relative z-[1] flex min-w-0 flex-1 items-stretch gap-2 p-2">
                        <div
                          className={cn(
                            "ecommerce-image-set-type-grid-example pointer-events-auto size-10 shrink-0 overflow-hidden rounded",
                            s.enabled ? "" : "saturate-50"
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={MODULE_THUMBS[s.modulePurpose]}
                            alt={`${s.modulePurpose}示例`}
                            className="block h-full w-full object-contain"
                            draggable={false}
                          />
                        </div>
                        <div className="ecommerce-image-set-type-grid-text flex h-10 min-w-0 flex-1 flex-col justify-between text-left">
                          <p
                            className={cn(
                              "ecommerce-image-set-type-grid-name min-w-0 text-[11px] font-semibold leading-4",
                              s.enabled ? "text-foreground" : "text-muted"
                            )}
                          >
                            {s.modulePurpose.split(" / ")[0]}
                          </p>
                          <div className="ecommerce-type-count pointer-events-auto flex shrink-0 flex-col items-start gap-1 max-sm:min-w-0 max-sm:flex-row max-sm:items-center max-sm:gap-0">
                            <div className="ecommerce-type-count-controls flex items-center justify-start max-sm:min-w-0 max-sm:flex-1">
                              <span className="ecommerce-type-count-label shrink-0 whitespace-nowrap text-[10px] leading-5 text-muted">
                                数量：
                              </span>
                              <input
                                aria-label={`${s.modulePurpose}数量`}
                                inputMode="numeric"
                                readOnly={!s.enabled || s.count === 0}
                                value={String(s.enabled ? s.count : 0)}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (/^\d+$/.test(v)) change(s.modulePurpose, { count: Number(v) });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="ecommerce-type-count-input h-5 w-7 min-w-0 px-1 text-xs font-semibold tabular-nums text-foreground disabled:opacity-40"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="ecommerce-type-count-step-buttons pointer-events-auto relative z-[1] invisible flex w-7 shrink-0 flex-col border-l border-[#ddd] bg-surface/70 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
                        <span className="ecommerce-type-count-divider pointer-events-none absolute inset-x-0 top-1/2 z-[1] h-px bg-[#ddd]" aria-hidden />
                        <button
                          type="button"
                          aria-label={`增加${s.modulePurpose}数量`}
                          disabled={!s.enabled || s.count >= MAX_TOTAL - total + s.count}
                          onClick={(e) => {
                            e.stopPropagation();
                            change(s.modulePurpose, { count: s.count + 1, enabled: true });
                          }}
                          className="ecommerce-type-count-increase grid min-h-0 flex-1 cursor-pointer place-items-center text-muted transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-30"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          aria-label={`减少${s.modulePurpose}数量`}
                          disabled={!s.enabled || s.count <= 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            change(s.modulePurpose, { count: s.count - 1, enabled: s.count - 1 > 0 });
                          }}
                          className="ecommerce-type-count-decrease grid min-h-0 flex-1 cursor-pointer place-items-center text-muted transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-30"
                        >
                          −
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* —— 图片文案 / 图片比例 —— */}
              <div className="ecommerce-generation-config grid shrink-0 grid-cols-2 gap-2">
                <PopoverSelect
                  label="图片文案"
                  value={lang}
                  onChange={setLang}
                  ariaLabel="图片文案"
                  className="ecommerce-text-language min-w-0"
                  options={[
                    { value: "none", label: "无文案" },
                    { value: "zh", label: "中文" },
                    { value: "en", label: "英文" },
                  ]}
                />
                <PopoverSelect
                  label="图片比例"
                  value={ratio}
                  onChange={setRatio}
                  ariaLabel="图片比例"
                  className="ecommerce-aspect-ratio min-w-0"
                  options={[
                    { value: "3:4", label: "3:4" },
                    { value: "1:1", label: "1:1" },
                    { value: "4:3", label: "4:3" },
                    { value: "9:16", label: "9:16" },
                    { value: "16:9", label: "16:9" },
                  ]}
                />
              </div>

              {/* —— 补充说明 —— */}
              <section className="ecommerce-extra-instruction flex flex-1 flex-col gap-2" aria-label="补充说明（选填）">
                <div className="ecommerce-extra-instruction-editor flex flex-1 flex-col overflow-hidden rounded-lg border bg-surface transition">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="补充说明(可选)：卖点方向、目标人群、禁用元素、希望呈现的风格"
                    className="min-h-[92px] w-full flex-1 resize-none bg-transparent p-2 text-xs leading-6 outline-none placeholder:text-fg-subtle"
                  />
                  <div className="flex items-center justify-end gap-2 border-t border-line px-2 py-1.5">
                    <button type="button" className="text-[11px] text-muted">
                      语音输入
                    </button>
                  </div>
                </div>
              </section>

              {err && err !== "请至少设置一种图片类型的张数" && (
                <p className="ecommerce-config-reference-error text-[11px] text-danger" role="status">
                  {err}
                </p>
              )}

              {/* —— 模型 / 图片设置 —— */}
              <div className="ecommerce-config-selectors relative z-[300] grid shrink-0 grid-cols-2 gap-2">
                <TallPopoverSelect
                  label="模型"
                  value={model}
                  onChange={setModel}
                  ariaLabel="模型"
                  className="min-w-0"
                  summary={
                    <span className="model-summary-text mt-px flex min-w-0 items-baseline gap-1.5">
                      <span className="model-summary-title min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold leading-snug text-foreground">
                        {model}
                      </span>
                    </span>
                  }
                  options={[
                    { value: "LC Image 2.5 Pro", label: "LC Image 2.5 Pro", description: "画质优先" },
                    { value: "LC Image 2.5 Fast", label: "LC Image 2.5 Fast", description: "速度优先" },
                    { value: "LC Image 2.5", label: "LC Image 2.5", description: "标准" },
                  ]}
                />
                <TallPopoverSelect
                  label="图片设置"
                  value={`${resolution}|${format}`}
                  onChange={(v) => {
                    const [r, f] = v.split("|");
                    setResolution(r);
                    setFormat(f);
                  }}
                  ariaLabel="图片设置"
                  align="end"
                  className="min-w-0"
                  summary={
                    <span className="mt-px flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] font-semibold leading-snug tabular-nums text-foreground">
                      <span className="shrink-0 tabular-nums">{resolution}</span>
                      <span className="shrink-0">高</span>
                      <span aria-hidden>·</span>
                      <span className="shrink-0">{format}</span>
                    </span>
                  }
                  options={[
                    { value: "1K|PNG", label: "1K 高 · PNG" },
                    { value: "2K|PNG", label: "2K 高 · PNG" },
                    { value: "1K|JPEG", label: "1K 高 · JPEG" },
                    { value: "2K|JPEG", label: "2K 高 · JPEG" },
                  ]}
                />
              </div>
            </div>

            <div className="ecommerce-config-submit sticky bottom-0 z-[2] flex shrink-0 flex-col">
              <SubmitBar
                label={results.length ? "再次生成商品图" : "立即生成商品图"}
                credits={err ? null : total * 8}
                disabled={!!err}
                loading={busy}
                onClick={gen}
              />
            </div>
          </div>
        </div>
      }
      preview={
        <PreviewPanel
          tabs={[
            {
              key: "example",
              label: "参考示例",
              panel: (
                <ExampleCarousel
                  title="参考示例"
                  description="按 图片类型 串联完整商详图结构，帮助你快速理解生成方向"
                  images={EXAMPLES}
                />
              ),
            },
            {
              key: "favorites",
              label: "收藏",
              panel: (
                <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted">
                  请先登录再查看收藏任务。
                </div>
              ),
            },
          ]}
          activeTab={tab}
          onTabChange={setTab}
        />
      }
      queue={
        <QueuePanel>
          <ul className="space-y-2">
            <li className="rounded-lg border border-dashed border-line bg-surface-2 p-3 text-xs text-muted">
              还没有任务。生成完成后，成品会出现在这里。
            </li>
          </ul>
        </QueuePanel>
      }
    />
  );
}
