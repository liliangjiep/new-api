"use client";

import { Fragment, useMemo, useState } from "react";
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
import { AssetPickerModal, type AssetItem } from "@/components/features/AssetPickerModal";
import { MentionEditor } from "@/components/features/MentionEditor";
import { useToast } from "@/components/features/ToastHost";
import { cn } from "@/lib/cn";
import { submitEcommerceSet } from "@/lib/backend/tools";
import { waitTask, type TaskRecord } from "@/lib/backend/tasks";
import { ApiError } from "@/lib/api";

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
  src: `/images/ec/examples/ecommerce-detail-example-${String(i + 1).padStart(2, "0")}.jpg`,
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
  const [slotAssets, setSlotAssets] = useState<Record<string, AssetItem[]>>({ product: [], person: [], background: [] });
  const [slotPickerKey, setSlotPickerKey] = useState<string | null>(null);
  const [lang, setLang] = useState("zh");
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
    if ((slotAssets.product ?? []).length === 0) return "请先上传商品图";
    for (const r of SLOT_ROLES) {
      if ((slotAssets[r] ?? []).length > SLOT_MAX[r]) return `${SLOT_LABEL[r]}图最多 ${SLOT_MAX[r]} 张，请移除超出的素材`;
    }
    if (total === 0) return "请至少设置一种图片类型的张数";
    return null;
  };
  const err = validate();

  const gen = async () => {
    if (err) {
      push({ tone: "warning", title: err });
      return;
    }
    setBusy(true);
    try {
      const productAssetIds = (slotAssets.product ?? []).map((a) => a.id);
      const batch = await submitEcommerceSet({
        product_asset_ids: productAssetIds,
        lang,
        ratio,
        model,
        resolution,
        format,
        count: total,
      });
      push({
        tone: "success",
        title: "已提交",
        description: `批次 ${batch.id} · 共 ${batch.item_count} 张`,
      });
      // 行内注释7：逐个等终态，把每张的真实结果 URL 收集起来。
      const urls: string[] = [];
      for (const tid of batch.task_ids ?? []) {
        const done: TaskRecord = await waitTask(tid);
        if (done.status === "succeeded") {
          urls.push(...(done.result?.result_urls ?? []));
        }
      }
      if (urls.length > 0) {
        setResults(urls);
        setTab("preview");
        push({ tone: "success", title: "生成完成", description: `${urls.length} 张商详图已就绪` });
      } else {
        push({ tone: "warning", title: "生成未产出结果", description: "请在任务队列查看失败原因" });
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "提交失败，请稍后重试";
      push({ tone: "danger", title: "提交失败", description: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <ToolboxShell
      editor={
        <div className={`${PANEL} ecommerce-image-set-configuration-panel !gap-0`}>
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
                  setSlotAssets({ product: [], person: [], background: [] });
                  setNote("");
                }}
              />
            </div>

            <div
              className="ecommerce-config-content -mt-2.5 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-none pb-4 pt-2.5 scrollbar-none"
              data-reference-slot-preview-boundary="true"
              data-reference-card-deck-boundary="true"
            >
              {/* —— 参考槽位：64×64 卡片，标签在下 —— */}
              <section className="ecommerce-image-set-reference-section min-w-0 shrink-0">
                <div
                  data-reference-slot-preview-anchor="true"
                  className="reference-slot-uploader relative flex w-full min-w-0 flex-1 items-start overflow-visible"
                  aria-busy="false"
                  style={
                    {
                      "--reference-slot-card-size": "64px",
                      "--reference-slot-preview-top":
                        "calc(var(--reference-slot-card-size) + 1.5rem)",
                    } as React.CSSProperties
                  }
                >
                  <div
                    className="reference-slot-list flex w-fit max-w-full min-w-0 items-start sm:pl-[var(--reference-slot-list-padding-left)] gap-3.5"
                    style={
                      {
                        "--reference-slot-list-padding-left": "2.1640625px",
                      } as React.CSSProperties
                    }
                  >
                    {SLOT_ROLES.map((r, i) => (
                      <Fragment key={r}>
                        {i > 0 && (
                          <span className="reference-slot-divider mt-2 h-[calc(var(--reference-slot-card-size)-16px)] w-px shrink-0 self-start bg-line max-sm:invisible" />
                        )}
                        <section
                          data-reference-slot-key={r}
                          data-reference-drop-target-id={`slot:${r}`}
                          data-reference-drop-solt-key={r}
                          className="reference-slot-card group/reference-slot relative flex w-[var(--reference-slot-card-size)] shrink-0 flex-col items-center hover:z-[80] cursor-pointer max-sm:w-fit"
                        >
                          <button
                            type="button"
                            aria-label={`添加${SLOT_LABEL[r]}${r === "product" ? " · 必填" : ""}`}
                            onClick={() => setSlotPickerKey(r)}
                            className="reference-slot-upload-hitarea absolute inset-0 z-0 disabled:cursor-default rounded-xl"
                          />
                          <div className="reference-slot-card-stage pointer-events-none relative z-[1] h-[var(--reference-slot-card-size)] w-[var(--reference-slot-card-size)] shrink-0">
                            <div className="reference-slot-trigger absolute inset-0 overflow-hidden border border-line bg-subtle shadow-sm transition-colors group-hover/reference-slot:border-[#999] rounded-xl ">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={slotAssets[r]?.[0]?.thumb ?? slotAssets[r]?.[0]?.url ?? SLOT_COVERS[r]}
                                alt=""
                                draggable={false}
                                className="reference-slot-cover-image h-full w-full object-cover"
                              />
                              {(slotAssets[r] ?? []).length > 1 ? (
                                <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white">
                                  +{(slotAssets[r] ?? []).length - 1}
                                </span>
                              ) : null}
                              <span className="reference-slot-cover-upload-icon absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#5c5c5c] text-white shadow-sm" aria-hidden="true">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                  aria-hidden
                                  data-slot="icon"
                                  className="h-2.5 w-2.5 stroke-2"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                                  />
                                </svg>
                              </span>
                            </div>
                          </div>
                          <span className="reference-slot-label mt-1 flex h-4 max-w-max shrink-0 items-center justify-center whitespace-nowrap bg-transparent text-[10px] font-medium leading-none">
                            <span className="reference-slot-title text-[#555]">
                              添加{SLOT_LABEL[r]}
                              {r === "product" ? " · 必填" : ""}
                            </span>
                            {r === "product" ? null : (
                              <span className="reference-slot-optional ml-0.5 text-[#888]">(可选)</span>
                            )}
                          </span>
                        </section>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </section>

              {/* —— 选择模块：3 列网格，每格 = 缩略图 + 名称 + 数量步进器 —— */}
              <section className="ecommerce-image-set-type-grid flex shrink-0 flex-col gap-2">
                <div className="ecommerce-image-set-type-grid-heading flex flex-wrap items-center justify-between gap-1">
                  <div className="ecommerce-image-set-type-grid-title-row flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="ecommerce-image-set-type-grid-title shrink-0 text-xs font-semibold text-foreground">
                      选择模块
                    </h3>
                  </div>
                  <span className="ecommerce-image-set-type-grid-summary text-[11px] tabular-nums text-muted">
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
                            "ecommerce-image-set-type-grid-example pointer-events-auto h-10 w-10 shrink-0 overflow-hidden rounded",
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
                                className={cn(
                                  "ecommerce-type-count-input h-5 w-7 min-w-0 px-1 text-xs font-semibold tabular-nums text-foreground disabled:opacity-40 max-sm:flex-1 cursor-pointer bg-transparent text-left",
                                  s.enabled && s.count > 0 && "max-sm:cursor-text"
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="ecommerce-type-count-step-buttons pointer-events-auto relative z-[1] invisible flex w-7 shrink-0 flex-col border-l border-[#ddd] bg-surface/70 opacity-0 transition-opacity max-sm:visible max-sm:opacity-100 group-hover:visible group-hover:opacity-100">
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
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            aria-hidden
                            data-slot="icon"
                            className="h-2.5 w-2.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m4.5 15.75 7.5-7.5 7.5 7.5"
                            />
                          </svg>
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
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            aria-hidden
                            data-slot="icon"
                            className="h-2.5 w-2.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m19.5 8.25-7.5 7.5-7.5-7.5"
                            />
                          </svg>
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
                  compact
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
                  compact
                  summary={
                    <>
                      <span className="pointer-events-none flex h-full shrink-0 items-center text-[11px] font-normal leading-none text-muted [&>svg]:block">
                        图片比例
                      </span>
                      <span className="pointer-events-none flex shrink-0 text-muted [&>svg]:block">
                        <span
                          className="aspect-ratio-mini-frame inline-flex shrink-0 items-center justify-center"
                          aria-hidden="true"
                          style={{ width: "14px", height: "14px" }}
                        >
                          <span
                            className="aspect-ratio-mini-frame-outline rounded-[1px] border-[1.35px] border-current"
                            style={{ width: "10.5px", height: "14px" }}
                          />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 truncate">{ratio}</span>
                    </>
                  }
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
                <div className="ecommerce-extra-instruction-editor flex flex-col overflow-hidden rounded-lg border bg-surface transition flex-1">
                  <MentionEditor
                    value={note}
                    onChange={(v) => setNote(v.slice(0, 1000))}
                    placeholder="补充说明(可选)：卖点方向、目标人群、禁用元素、希望呈现的风格"
                    hideSpeechSlot
                    rootClassName="markdown-mention-editor-root ui-markdown-mention-editor relative flex min-h-0 flex-1 flex-col"
                    placeholderClassName="pointer-events-none absolute z-[1] text-xs leading-6 text-muted"
                    className="milkdown-editor-root MilkdownMentionEditor_editor__JP4BW min-h-0 h-full w-full flex-1 cursor-text overflow-y-auto  px-2 py-2 text-xs leading-6 text-foreground [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden "
                  />
                  <div className="markdown-mention-editor-speech min-w-0 shrink-0 px-1 py-1">
                    <div
                      className="speech-input-controls flex min-h-[var(--toolbar-size,32px)] w-full min-w-0 shrink-0 items-center justify-end gap-2 text-foreground max-sm:min-h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:min-h-[var(--toolbar-size,44px)] pointer-events-none"
                      data-speech-active="false"
                      role="group"
                      aria-label="语音输入控制"
                    >
                      <span className="ui-hover-tooltip-trigger inline-flex items-center justify-center outline-none">
                        <button
                          type="button"
                          aria-label="语音输入"
                          onClick={() => push({ tone: "neutral", title: "正在聆听…（演示）" })}
                          className="speech-input-controls-microphone flex h-[var(--toolbar-size,32px)] w-[var(--toolbar-size,32px)] shrink-0 touch-manipulation items-center justify-center rounded-full max-sm:h-[var(--toolbar-size,44px)] max-sm:w-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:w-[var(--toolbar-size,44px)] pointer-events-auto text-muted hover:bg-[#f1f1f1] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            aria-hidden
                            data-slot="icon"
                            className="h-[var(--toolbar-icon-size,20px)] w-[var(--toolbar-icon-size,20px)]"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                            />
                          </svg>
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* —— 模型 / 图片设置 —— */}
              <div className="ecommerce-config-selectors relative z-[300] grid shrink-0 grid-cols-2 gap-2">
                <TallPopoverSelect
                  label="模型"
                  value={model}
                  onChange={setModel}
                  ariaLabel="模型"
                  className="generation-model-picker relative min-w-0"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      aria-hidden
                      data-slot="icon"
                      className="h-3.5 w-3.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
                      />
                    </svg>
                  }
                  summary={
                    <span className="model-summary-text mt-px flex min-w-0 items-baseline gap-1.5">
                      <span className="model-summary-title min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(8px,2.2vw,10px)] font-semibold leading-snug text-foreground">
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
                  className="generation-settings-picker relative min-w-0"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      aria-hidden
                      data-slot="icon"
                      className="h-3.5 w-3.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
                      />
                    </svg>
                  }
                  summary={
                    <span className="mt-px flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] font-semibold leading-snug tabular-nums text-foreground">
                      <span className="shrink-0 tabular-nums">{resolution}</span>
                      <span className="ecommerce-image-quality-summary shrink-0">高</span>
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
          </div>

          <div className="ecommerce-config-submit sticky bottom-0 z-[2] flex shrink-0 flex-col">
            <SubmitBar
              label={results.length ? "再次生成商品图" : "立即生成商品图"}
              credits={err ? null : total * 8}
              disabled={!!err}
              loading={busy}
              onClick={gen}
              bare
            />
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
                  descriptionNode={
                    <p className="result-example-description-line">
                      按{" "}
                      <strong className="result-example-description-emphasis font-bold text-foreground">
                        图片类型
                      </strong>{" "}
                      串联完整商详图结构，帮助你快速理解生成方向
                    </p>
                  }
                  images={EXAMPLES}
                  variant="carousel"
                />
              ),
            },
            {
              key: "favorites",
              label: "收藏",
              panel: (
                <div className="favorite-batch-login flex min-h-0 flex-1 flex-col items-center justify-center gap-3.5 rounded-[1.8rem]  px-6 py-10 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="favorite-batch-login-icon h-20 w-20 shrink-0 text-subtle opacity-[0.55]"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                    />
                  </svg>
                  <p className="favorite-batch-login-text text-sm font-normal text-subtle opacity-90">
                    请先登录再查看收藏任务。
                  </p>
                </div>
              ),
            },
          ]}
          activeTab={tab}
          onTabChange={setTab}
        />
      }
      queue={<QueuePanel />}
    />
      <AssetPickerModal
        open={slotPickerKey !== null}
        kind="image"
        title="选择图片参考"
        subtitle="参考图片会保存至资产库，处理期间始终可见。"
        maxSelect={slotPickerKey ? (SLOT_MAX[slotPickerKey] ?? 4) : 4}
        onClose={() => setSlotPickerKey(null)}
        onConfirm={(assets) => {
          if (slotPickerKey) {
            const key = slotPickerKey;
            const max = SLOT_MAX[key] ?? 4;
            setSlotAssets((p) => ({ ...p, [key]: assets.slice(0, max) }));
          }
        }}
      />
    </>
  );
}
