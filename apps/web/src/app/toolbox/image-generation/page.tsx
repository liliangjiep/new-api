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
import { PopoverSelect, TallPopoverSelect } from "@/components/features/PopoverSelect";
import { SkillSelector, type SkillItem } from "@/components/features/SkillSelector";
import { useToast } from "@/components/features/ToastHost";

/* 原站 /toolbox/image-generation（实测）：
 *  面板头 h52：技能触发器(52px 渐变块) + 新建
 *  generation-root：
 *    prompt-reference-uploader (134px)：「0 / 9」计数 + 参考图位 + 「添加图片 (可选)」
 *    提示词编辑器（ProseMirror）：「/ 选择生成技能，@ 引用参考图」+ 「0 / 2000」计数
 *    底部 2 列：模型(52px) + 图片设置(52px)
 *  提交条：立即生成图片 预计 -- 积分
 */
const SKILLS: SkillItem[] = [
  { id: "face-three-view", label: "脸部三视图", description: "生成正脸、侧脸、半侧脸参考", category: { key: "person", label: "人物" }, imageUrl: "/images/gen/skill-image-face-three-view.jpg" },
  { id: "character-four-view", label: "人物四视图", description: "生成全身三视角与脸部特写", category: { key: "person", label: "人物" }, imageUrl: "/images/gen/skill-image-character-four-view.jpg" },
  { id: "model-face-swap", label: "模特换脸", description: "一键替换面部与发型", category: { key: "person", label: "人物" }, imageUrl: "/images/gen/skill-image-model-face-swap.jpg" },
  { id: "face-fusion", label: "人脸融合", description: "融合两张人脸生成全新虚拟头像资产", category: { key: "person", label: "人物" }, imageUrl: "/images/gen/skill-image-face-fusion.jpg" },
  { id: "person-background-swap", label: "人物入景", description: "替换模特图背景", category: { key: "person", label: "人物" }, imageUrl: "/images/gen/skill-image-person-background-swap.jpg" },
  { id: "human-realism", label: "人物真人感", description: "AI虚拟人添加真实感", category: { key: "person", label: "人物" }, imageUrl: "/images/gen/skill-image-human-realism.jpg" },
  { id: "clothing-tryon", label: "服装上身", description: "替换模特身上的服装衣物", category: { key: "product", label: "商品" }, imageUrl: "/images/gen/skill-image-clothing-tryon.jpg" },
  { id: "product-usage", label: "商品使用", description: "生成真人试用与使用场景", category: { key: "product", label: "商品" }, imageUrl: "/images/gen/skill-image-product-usage.jpg" },
  { id: "product-white-bg", label: "商品白底图", description: "生成高级白底商品图与多角度资产", category: { key: "product", label: "商品" }, imageUrl: "/images/gen/skill-image-product-white-bg.jpg" },
  { id: "garment-restyle", label: "服装改款", description: "替换服装的面料、印花等", category: { key: "product", label: "商品" }, imageUrl: "/images/gen/skill-image-garment-restyle.jpg" },
  { id: "general", label: "通用出图", description: "自由描述画面", category: { key: "scene", label: "场景" } },
  { id: "image-refine", label: "图片精修", description: "修复画质、光影和清晰度", category: { key: "enhance", label: "增强" }, imageUrl: "/images/gen/skill-image-image-refine.jpg" },
];

const MAX_REFS = 9;
const MAX_PROMPT = 2000;

export default function ImageGenerationPage() {
  const { push } = useToast();
  const [skill, setSkill] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [refs, setRefs] = useState(0);
  const [model, setModel] = useState("LC Image 2.5 Pro");
  const [setting, setSetting] = useState("自适应 · 1K 高 · PNG");
  const [tab, setTab] = useState("preview");
  const [results, setResults] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const gen = () => {
    if (!prompt.trim()) {
      push({ tone: "warning", title: "请先描述画面" });
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setResults(["/images/toapi/result-1.png", "/images/toapi/result-2.png"]);
      setBusy(false);
      setTab("preview");
      push({ tone: "success", title: "图片已生成" });
    }, 1500);
  };

  return (
    <ToolboxShell
      editor={
        <div className={PANEL}>
          <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            {/* —— 面板头：技能触发器 + 新建 —— */}
            <div className={`${PANEL_HEADER} !bg-transparent !backdrop-blur-none`}>
              <div className="flex items-center justify-between gap-2">
                <SkillSelector
                  items={SKILLS}
                  selectedId={skill}
                  onChange={setSkill}
                  ariaLabel="选择图片生成技能"
                  defaultLabel="图片创作"
                  className="min-w-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("");
                    setRefs(0);
                    setResults([]);
                  }}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold !text-accent disabled:opacity-40"
                  aria-label="新建"
                >
                  新建
                </button>
              </div>
            </div>

            <div className="generation-root generation-controller flex min-h-0 min-w-0 flex-1 flex-col gap-2">
              {/* —— 参考图区 —— */}
              <div className="prompt-reference-uploader flex min-w-0 shrink-0 flex-col gap-2">
                <div className="prompt-reference-header flex min-h-6 items-center justify-between gap-2">
                  <div className="ai-image-reference-header-leading flex min-w-0 items-center gap-1">
                    <span className="shrink-0 text-[11px] text-muted">
                      {refs} / {MAX_REFS}
                    </span>
                  </div>
                </div>
                <div className="prompt-reference-slot-content min-w-0 flex-1">
                  <div className="reference-slot-uploader relative flex w-full min-w-0 flex-1 items-start">
                    <button
                      type="button"
                      onClick={() => setRefs((n) => Math.min(MAX_REFS, n + 1))}
                      className="image-generation-reference-materials-button flex h-[84px] w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-surface text-[10px] text-muted"
                      aria-label="添加图片"
                    >
                      <span className="text-[18px] leading-none">+</span>
                      <span>添加图片</span>
                      <span className="text-[9px]">(可选)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* —— 提示词编辑器 —— */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-background">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT))}
                  placeholder="请输入图片内容；输入 / 选择生成技能，输入 @ 引用上方参考图片。"
                  className="min-h-[140px] w-full flex-1 resize-none bg-transparent p-3 text-sm outline-none placeholder:text-fg-subtle"
                />
                <div className="flex items-center justify-between gap-2 border-t border-line px-2 py-1.5">
                  <button type="button" className="text-[11px] text-muted">
                    语音输入
                  </button>
                  <span className="text-[11px] tabular-nums text-muted">
                    {prompt.length} / {MAX_PROMPT}
                  </span>
                </div>
              </div>

              {/* —— 底部 2 列：模型 / 图片设置 —— */}
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
                    { value: "LC Image 2.5 Pro", label: "LC Image 2.5 Pro", description: "画质优先" },
                    { value: "LC Image 2.5 Fast", label: "LC Image 2.5 Fast", description: "速度优先" },
                    { value: "LC Image 2.5", label: "LC Image 2.5", description: "标准" },
                  ]}
                />
                <TallPopoverSelect
                  label="图片设置"
                  value={setting}
                  onChange={setSetting}
                  ariaLabel="图片设置"
                  align="end"
                  className="min-w-0"
                  summary={
                    <span className="mt-px flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] font-semibold leading-snug tabular-nums text-foreground">
                      <span className="shrink-0">{setting.split(" · ")[0]}</span>
                      <span aria-hidden>·</span>
                      <span className="shrink-0">1K</span>
                      <span className="shrink-0">高</span>
                      <span aria-hidden>·</span>
                      <span className="shrink-0">PNG</span>
                    </span>
                  }
                  options={[
                    { value: "自适应 · 1K 高 · PNG", label: "自适应 · 1K 高 · PNG" },
                    { value: "1:1 · 1K 高 · PNG", label: "1:1 · 1K 高 · PNG" },
                    { value: "3:4 · 2K 高 · PNG", label: "3:4 · 2K 高 · PNG" },
                    { value: "16:9 · 1K 高 · JPEG", label: "16:9 · 1K 高 · JPEG" },
                  ]}
                />
              </div>
            </div>

            <div className="sticky bottom-0 z-[2] shrink-0">
              <SubmitBar
                label="立即生成图片"
                credits={prompt.trim() ? 4 : null}
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
                    <p className="text-center text-xs text-muted">暂无结果，提交后在这里预览</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                      {results.map((s, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={s} alt={`结果 ${i + 1}`} className="aspect-square w-full rounded-lg border border-line object-cover" />
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
              还没有任务。生成完成后，结果会出现在这里。
            </li>
          </ul>
        </QueuePanel>
      }
    />
  );
}
