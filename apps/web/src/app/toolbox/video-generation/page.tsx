"use client";

import { useState } from "react";
import {
  PANEL,
  PANEL_CONTENT,
  PANEL_HEADER,
  PreviewPanel,
  QueuePanel,
  SubmitBar,
  ToolboxShell,
} from "@/components/features/BenchWorkspace";
import { TallPopoverSelect } from "@/components/features/PopoverSelect";
import { SkillSelector, type SkillItem } from "@/components/features/SkillSelector";
import { useToast } from "@/components/features/ToastHost";

/* 原站 /toolbox/video-generation（实测）：
 *  面板头 h52：技能触发器(52px) + 新建
 *  素材区：「0 / 40」+ 三张 64×84 卡（添加图片/添加角色/添加声音，均「(可选)」）
 *  提示词：「输入视频提示词，使用 @ 指定参考素材，或「帮我写」」+「0 / 12000」+「超级编导」
 *  底部：模型(52px) + 视频设置(52px：9:16 · 480P · 25s)
 *  提交：立即生成视频 预计 -- 积分
 */
const SKILLS: SkillItem[] = [
  { id: "ecommerce-spoken-selling", label: "口播带货", description: "真人推荐，建立购买信任", category: { key: "ecommerce", label: "电商带货" }, isRecommended: true, imageUrl: "/images/gen/skill-video-ecommerce-spoken-selling.jpg" },
  { id: "ecommerce-promotion-conversion", label: "促销转化", description: "放大优惠，推动立即下单", category: { key: "ecommerce", label: "电商带货" }, isRecommended: true, imageUrl: "/images/gen/skill-video-ecommerce-promotion-conversion.jpg" },
  { id: "ecommerce-scene-seeding", label: "场景种草", description: "植入场景，激发使用需求", category: { key: "ecommerce", label: "电商带货" }, imageUrl: "/images/gen/skill-video-ecommerce-scene-seeding.jpg" },
  { id: "ecommerce-pain-point-solution", label: "痛点解决", description: "直击痛点，展示解决效果", category: { key: "ecommerce", label: "电商带货" }, imageUrl: "/images/gen/skill-video-ecommerce-pain-point-solution.jpg" },
  { id: "ecommerce-function-demo", label: "功能演示", description: "演示功能，证明产品价值", category: { key: "ecommerce", label: "电商带货" }, imageUrl: "/images/gen/skill-video-ecommerce-function-demo.jpg" },
  { id: "local-store-discovery", label: "门店发现", description: "突出特色，制造到店理由", category: { key: "local", label: "同城到店" }, imageUrl: "/images/gen/skill-video-local-store-discovery.jpg" },
  { id: "local-store-visit-record", label: "到店实录", description: "真实体验，建立消费信任", category: { key: "local", label: "同城到店" }, imageUrl: "/images/gen/skill-video-local-store-visit-record.jpg" },
  { id: "local-store-signature-experience", label: "招牌体验", description: "聚焦招牌，证明门店价值", category: { key: "local", label: "同城到店" }, imageUrl: "/images/gen/skill-video-local-store-signature-experience.jpg" },
  { id: "local-store-group-buy-conversion", label: "同城团购", description: "突出优惠，推动到店核销", category: { key: "local", label: "同城到店" }, imageUrl: "/images/gen/skill-video-local-store-group-buy-conversion.jpg" },
  { id: "advertising-brand-proposition", label: "品牌主张", description: "传递理念，建立价值认同", category: { key: "brand", label: "品牌广告" }, imageUrl: "/images/gen/skill-video-advertising-brand-proposition.jpg" },
  { id: "advertising-brand-story", label: "品牌故事", description: "讲述故事，强化品牌信任", category: { key: "brand", label: "品牌广告" }, imageUrl: "/images/gen/skill-video-advertising-brand-story.jpg" },
  { id: "advertising-lifestyle", label: "生活方式", description: "塑造场景，建立品牌向往", category: { key: "brand", label: "品牌广告" }, imageUrl: "/images/gen/skill-video-advertising-lifestyle.jpg" },
  { id: "advertising-creative-concept", label: "创意概念", description: "创意表达，强化品牌记忆", category: { key: "brand", label: "品牌广告" }, imageUrl: "/images/gen/skill-video-advertising-creative-concept.jpg" },
  { id: "short-drama-dialogue", label: "对话短剧", description: "人物冲突，推动剧情发展", category: { key: "drama", label: "剧情短片" }, imageUrl: "/images/gen/skill-video-short-drama-dialogue.jpg" },
  { id: "short-drama-reversal", label: "反转短剧", description: "剧情反转，制造传播记忆", category: { key: "drama", label: "剧情短片" }, imageUrl: "/images/gen/skill-video-short-drama-reversal.jpg" },
  { id: "short-drama-suspense", label: "悬念短剧", description: "设置悬念，持续吸引观看", category: { key: "drama", label: "剧情短片" }, imageUrl: "/images/gen/skill-video-short-drama-suspense.jpg" },
  { id: "short-drama-emotional", label: "情绪短片", description: "情绪共鸣，强化内容感染", category: { key: "drama", label: "剧情短片" }, imageUrl: "/images/gen/skill-video-short-drama-emotional.jpg" },
  { id: "short-drama-product-placement", label: "产品植入", description: "融入剧情，自然传递价值", category: { key: "drama", label: "剧情短片" }, imageUrl: "/images/gen/skill-video-short-drama-product-placement.jpg" },
  { id: "default-director", label: "默认导演", description: "通用导演视角编排", category: { key: "default", label: "默认" } },
];

const MAX_MATERIALS = 40;
const MAX_PROMPT = 12000;

const MATERIAL_SLOTS = [
  { key: "image", label: "添加图片", cover: "/toolboxs/depth-video-clone/product.png" },
  { key: "character", label: "添加角色", cover: "/toolboxs/depth-video-clone/person.png" },
  { key: "audio", label: "添加声音", cover: null },
];

export default function VideoGenerationPage() {
  const { push } = useToast();
  const [skill, setSkill] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(0);
  const [model, setModel] = useState("Seedance-2.5");
  const [spec, setSpec] = useState("9:16 · 480P · 25s");
  const [tab, setTab] = useState("preview");
  const [results, setResults] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const gen = () => {
    if (!prompt.trim()) {
      push({ tone: "warning", title: "请先描述分镜" });
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setResults(["/images/toapi/result-1.png", "/images/toapi/result-2.png"]);
      setBusy(false);
      setTab("preview");
      push({ tone: "success", title: "视频已生成", description: "在右侧队列查看进度" });
    }, 1800);
  };

  return (
    <ToolboxShell
      editor={
        <div className={PANEL}>
          <div className="video-generation-panel-content relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            {/* —— 面板头 —— */}
            <div className={PANEL_HEADER}>
              <div className="video-generation-header-actions flex items-center justify-between gap-2">
                <SkillSelector
                  items={SKILLS}
                  selectedId={skill}
                  onChange={setSkill}
                  ariaLabel="选择视频生成技能"
                  defaultLabel="视频创作"
                  panelSubtitle="让每一个想法，都能成为影像"
                  className="min-w-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("");
                    setCount(0);
                    setResults([]);
                  }}
                  className="video-generation-new-button inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold !text-accent disabled:opacity-40"
                  aria-label="清空配置并新建"
                >
                  新建
                </button>
              </div>
            </div>

            <div className="generation-root generation-controller flex min-h-0 min-w-0 flex-1 flex-col gap-2">
              {/* —— 素材区 —— */}
              <div className="prompt-reference-uploader flex min-w-0 shrink-0 flex-col gap-2">
                <div className="prompt-reference-header flex min-h-6 items-center justify-between gap-2">
                  <span className="shrink-0 text-[11px] text-muted">
                    {count} / {MAX_MATERIALS}
                  </span>
                </div>
                <div className="prompt-reference-slot-content min-w-0 flex-1">
                  <div className="reference-slot-list flex w-fit max-w-full min-w-0 items-start">
                    {MATERIAL_SLOTS.map((s, i) => (
                      <div key={s.key} className="reference-slot-card group/reference-slot relative flex w-16 flex-col items-center">
                        {i > 0 && (
                          <span className="reference-slot-divider absolute right-0 top-1 h-12 w-px bg-line" aria-hidden />
                        )}
                        <button
                          type="button"
                          onClick={() => setCount((n) => Math.min(MAX_MATERIALS, n + 1))}
                          aria-label={s.label}
                          className="reference-slot-card-stage pointer-events-none relative z-[1] flex size-16 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-line bg-surface text-muted"
                        >
                          {s.cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.cover} alt="" className="reference-slot-cover-image h-full w-full object-cover" />
                          ) : (
                            <span className="text-[16px] leading-none">♪</span>
                          )}
                        </button>
                        <div className="reference-slot-label mt-1 flex h-4 max-w-max shrink-0 items-center gap-0.5">
                          <span className="reference-slot-title text-[10px] text-[#555]">{s.label}</span>
                          <span className="reference-slot-optional ml-0.5 text-[10px] text-[#888]">(可选)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* —— 提示词编辑器 —— */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-background">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT))}
                  placeholder="输入视频提示词，使用 @ 指定参考素材，或「帮我写」"
                  className="min-h-[140px] w-full flex-1 resize-none bg-transparent p-3 text-sm outline-none placeholder:text-fg-subtle"
                />
                <div className="flex items-center justify-between gap-2 border-t border-line px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <button type="button" className="text-[11px] text-muted">
                      语音输入
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPrompt(
                          (p) =>
                            p ||
                            "一位女性主播在明亮的家居场景中面对镜头介绍产品，手持产品特写，镜头缓慢推进，浅景深，暖色调商业质感。",
                        )
                      }
                      className="text-[11px] text-muted"
                    >
                      「帮我写」
                    </button>
                  </div>
                  <span className="text-[11px] tabular-nums text-muted">
                    {prompt.length} / {MAX_PROMPT}
                  </span>
                </div>
              </div>

              {/* —— 底部 2 列：模型 / 视频设置 —— */}
              <div className="relative z-[300] grid shrink-0 grid-cols-2 gap-2">
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
                    { value: "Seedance-2.5", label: "Seedance-2.5", description: "画质与动态平衡" },
                    { value: "Seedance-2.0", label: "Seedance-2.0", description: "性价比" },
                    { value: "Seedance-2.0 Mini", label: "Seedance-2.0 Mini", description: "极速低成本" },
                  ]}
                />
                <TallPopoverSelect
                  label="视频设置"
                  value={spec}
                  onChange={setSpec}
                  ariaLabel="视频设置"
                  align="end"
                  className="min-w-0"
                  summary={
                    <span className="mt-px flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] font-semibold leading-snug tabular-nums text-foreground">
                      {spec.split(" · ").map((p, i) => (
                        <span key={p} className="flex items-center gap-1">
                          {i > 0 && <span aria-hidden>·</span>}
                          {p}
                        </span>
                      ))}
                    </span>
                  }
                  options={[
                    { value: "9:16 · 480P · 25s", label: "9:16 · 480P · 25s" },
                    { value: "9:16 · 1080P · 10s", label: "9:16 · 1080P · 10s" },
                    { value: "16:9 · 1080P · 10s", label: "16:9 · 1080P · 10s" },
                    { value: "1:1 · 720P · 8s", label: "1:1 · 720P · 8s" },
                  ]}
                />
              </div>
            </div>

            <div className="sticky bottom-0 z-[2] shrink-0">
              <SubmitBar
                label="立即生成视频"
                credits={prompt.trim() ? 14 : null}
                disabled={!prompt.trim()}
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
              key: "preview",
              label: "预览",
              panel: (
                <div className="flex h-full min-h-0 flex-col justify-center overflow-y-auto p-4">
                  {results.length === 0 ? (
                    <p className="text-center text-xs text-muted">暂无结果，提交后在这里预览成片</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                      {results.map((s, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={s} alt={`结果 ${i + 1}`} className="aspect-video w-full rounded-lg border border-line object-cover" />
                      ))}
                    </div>
                  )}
                </div>
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
              还没有任务。生成完成后，成片会出现在这里。
            </li>
          </ul>
        </QueuePanel>
      }
    />
  );
}
