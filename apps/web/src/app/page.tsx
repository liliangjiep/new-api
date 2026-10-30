"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  Clapperboard,
  Droplets,
  Eraser,
  Heart,
  ImageIcon,
  ImagePlus,
  LayoutDashboard,
  Plus,
  Sparkles,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { WorkspaceRail } from "@/components/features/BenchWorkspace";

/*
 * 首页：严格按 F:/wct/rea-daai 逆向结果（chunk_39）复刻 susu.da-ai.cc，
 * 只换我们自己的 UI 风格。布局 / 功能 / 跳转与原站一致：
 *  居中 Hero → Composer（素材+输入+模式+发送）→ 常用工具 7 个 →
 *  “你想做什么？”场景条 → 发现流（过滤+卡片墙）。
 * 唯一加戏：场景条里追加 2 个石材模块（石材效果图 / 厂家介绍视频）。
 *
 * 原站精确配置（勿改跳转）：
 *  TOOLS 默认顺序 a.mi，共 7 个；标题 b3；href 见 c（video-editor 为站内剪辑台动作）。
 *  SCENES e4，共 6 个；电商/到店/广告/短剧走 wW() 即
 *  /toolbox/video-generation?skill=xxx&skill_panel=open&skill_category=yyy。
 *  Composer 模式 eF：agent / video / image。
 */

const TOOLS = [
  { key: "canvas", title: "画布", desc: "自由编排创作流程", href: "/canvas", Icon: LayoutDashboard, tint: "bg-[#eef1ff] text-[#596be8]" },
  { key: "video-editor", title: "剪辑台", desc: "剪辑视频与音频", href: "/toolbox/editor", Icon: Clapperboard, tint: "bg-[#eef1ff] text-[#596be8]" },
  { key: "video-quality-enhance", title: "画质增强", desc: "提升清晰度与质感", href: "/toolbox/video-quality-enhance", Icon: Sparkles, tint: "bg-[#fff1e8] text-[#d66d2e]" },
  { key: "video-watermark-remove", title: "水印擦除", desc: "去除水印与遮挡", href: "/toolbox/video-watermark-remove", Icon: Droplets, tint: "bg-[#eaf3ff] text-[#347fe8]" },
  { key: "video-subtitle-erase", title: "字幕擦除", desc: "去除字幕与文字", href: "/toolbox/video-subtitle-erase", Icon: Eraser, tint: "bg-[#f1ecff] text-[#7657df]" },
  { key: "image-retouching", title: "图片精修", desc: "精修细节纹理", href: "/toolbox/image-generation?skill_pack=product-refine", Icon: ImagePlus, tint: "bg-[#e8f8f2] text-[#248866]" },
  { key: "create-character", title: "AI 角色", desc: "创建专属 AI 角色", href: "/assets#character", Icon: UserRound, tint: "bg-[#eef1ff] text-[#596be8]" },
];

const SCENES = [
  { key: "depth-video-clone", title: "爆款复刻", desc: "参考爆款视频，轻松创作专属爆款", media: "video", href: "/toolbox/depth-video-clone", cover: "/images/bench/scene-entry-depth-video-clone-v2.jpg", stone: false },
  { key: "ecommerce-image-set", title: "商详套图", desc: "一键生成专业商品详情套图", media: "image", href: "/toolbox/ecommerce-image-set", cover: "/images/bench/scene-entry-ecommerce-image-set.jpg", stone: false },
  { key: "ecommerce-video", title: "电商带货", desc: "快速生成商品展示与带货视频", media: "video", href: "/toolbox/video-generation?skill=ecommerce-spoken-selling&skill_panel=open&skill_category=ecommerce", cover: "/images/bench/scene-entry-ecommerce-video.jpg", stone: false },
  { key: "local-store-video", title: "同城到店", desc: "轻松制作本地探店推广视频", media: "video", href: "/toolbox/video-generation?skill=local-store-discovery&skill_panel=open&skill_category=local-store", cover: "/images/bench/scene-entry-local-store-video.jpg", stone: false },
  { key: "brand-advertising", title: "品牌广告", desc: "打造视听统一的品牌广告", media: "video", href: "/toolbox/video-generation?skill=advertising-brand-proposition&skill_panel=open&skill_category=advertising-tvc", cover: "/images/bench/scene-entry-brand-advertising.jpg", stone: false },
  { key: "short-drama", title: "剧情短片", desc: "快速创作情节紧凑的剧情短片", media: "video", href: "/toolbox/video-generation?skill=short-drama-dialogue&skill_panel=open&skill_category=short-drama", cover: "/images/bench/scene-entry-short-drama.jpg", stone: false },
  // —— 石材新增：并入“你想做什么？”，同卡片样式 ——
  { key: "stone-effect", title: "石材效果图", desc: "传一块板，出整套空间效果图", media: "image", href: "/toolbox/stone-effect", cover: "/images/toapi/result-5.png", stone: true },
  { key: "factory-video", title: "厂家介绍视频", desc: "探厂探展厅 + 数字人口播", media: "video", href: "/toolbox/factory-video", cover: "/images/toapi/result-6.png", stone: true },
];

/* Composer 生成模式（原站 eF）：agent / video / image */
const MODES = [
  { value: "agent", label: "Agent 模式" },
  { value: "video", label: "视频生成" },
  { value: "image", label: "图片生成" },
];

const PLACEHOLDERS: Record<string, string> = {
  agent: "结合参考、输入文字或 @ 主体，说说今天想做什么。",
  video: "上传参考素材并输入文字，或使用 @ 引用已添加的素材。可自由组合图、文、音、视频。",
  image: "可上传参考图并输入文字，或使用 @ 引用已添加的素材。可自由组合图、文。",
};

/* 发现流：取自 rea-daai/api/api_v1_discover_home.json（标题/作者/点赞为原站真实数据，封面用本地图避免盗链失效） */
const DISCOVER = [
  { title: "剧情带货", desc: "茂隆掌柜", likes: 321, type: "video", cover: "/images/toapi/asset-1.png" },
  { title: "大码服饰（信息密度）", desc: "茂隆掌柜", likes: 157, type: "video", cover: "/images/toapi/asset-2.png" },
  { title: "人物三视图", desc: "告别人脸ai感", likes: 139, type: "image", cover: "/images/toapi/asset-3.png" },
  { title: "红木家具（情绪留人）", desc: "茂隆掌柜", likes: 107, type: "video", cover: "/images/toapi/asset-4.png" },
  { title: "自建人脸（模特库）", desc: "秒做人脸资产", likes: 107, type: "canvas", cover: "/images/toapi/asset-5.png" },
  { title: "服饰1:1复刻", desc: "爆款工作流", likes: 60, type: "canvas", cover: "/images/toapi/asset-6.png" },
  { title: "文生图教程", desc: "提示词模版", likes: 31, type: "image", cover: "/images/toapi/result-2.png" },
  { title: "2.5｜服装 分镜复刻", desc: "学习分镜复刻，可以解决大部分你遇到的问题", likes: 70, type: "canvas", cover: "/images/toapi/result-1.png" },
];

const DISCOVER_TABS = ["发现", "视频", "图片", "画布"] as const;

export default function HomePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState("agent");
  const [modeOpen, setModeOpen] = useState(false);
  const [tab, setTab] = useState<(typeof DISCOVER_TABS)[number]>("发现");

  const canSubmit = prompt.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    const q = encodeURIComponent(prompt.trim());
    if (mode === "video") router.push(`/toolbox/video-generation?q=${q}`);
    else if (mode === "image") router.push(`/toolbox/image-generation?q=${q}`);
    else router.push("/agent-cloud");
  };

  const visible = DISCOVER.filter((d) => {
    if (tab === "发现") return true;
    if (tab === "视频") return d.type === "video";
    if (tab === "图片") return d.type === "image";
    return d.type === "canvas";
  });

  return (
    <div className="min-h-screen bg-bg-subtle text-fg">
      <div className="flex min-h-screen">
        {/* 左侧 52px 导航轨（原站 workspace-sidebar） */}
        <WorkspaceRail />
        <div className="min-w-0 flex-1">
      <main className="page-home relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <div className="home-scroll-content relative flex min-h-0 w-full min-w-0 flex-1 flex-col items-center px-[60px] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-[96px] max-sm:px-6">
        {/* —— Hero：居中标题（原站 home-hero-title） —— */}
        <section className="home-above-fold relative flex w-full min-w-0 flex-col items-center gap-8">
          {/* 蓝色辉光（原站 home-landing-blue-wash-center） */}
          <div
            aria-hidden
            className="home-landing-blue-wash-center pointer-events-none absolute left-1/2 top-0 z-0 h-[210px] w-full max-w-[860px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_50%_100%_at_center_8%,#fdfcfc_0%,#9dd2ff_50%,rgba(157,210,255,0)_78%)] blur-[98px]"
          />
          <h1 className="home-hero-title-text relative z-[1] mx-auto max-w-full break-words whitespace-normal text-[28px] font-semibold not-italic leading-9 text-fg max-sm:text-[24px] max-sm:leading-8">
            <span className="home-hero-title-brand text-[#0471fe]">xin.ai</span>
            <span className="home-hero-title-separator">，</span>
            <span className="home-hero-title-tagline">懂制造业的AI创作工具</span>
          </h1>

          {/* —— Composer：素材 + 输入 + 模式 + 发送（原站 home-header-composer） —— */}
          <div className="home-header-composer relative z-[2] mx-auto mt-6 flex w-full max-w-[840px] flex-col justify-between gap-0 rounded-[20px] border-2 border-line bg-surface p-2 text-left shadow-premium transition-[box-shadow,border-color,background-color,margin] duration-200 ease-out">
            <div className="home-composer-input-row flex min-h-0 flex-1 items-start">
              <Link
                href="/assets"
                title="添加参考素材"
                aria-label="添加参考素材"
                className="composer-reference-upload-button group relative flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-surface text-[#222529]"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(136.6deg,#d7ecff_20.9%,#67e6ff_98.9%)] opacity-30 transition-opacity duration-200 group-hover:opacity-40"
                />
                <Plus className="relative z-[1] h-[18px] w-[18px] stroke-[2]" aria-hidden />
              </Link>
              <div className="home-composer-editor-wrap relative min-w-0 flex-1 px-2 py-1">
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                  placeholder={PLACEHOLDERS[mode]}
                  aria-label="创作需求输入"
                  className="min-h-[70px] w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setModeOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={modeOpen}
                  aria-label="生成模式"
                  className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 text-sm text-fg transition-colors hover:bg-surface-2"
                >
                  {MODES.find((m) => m.value === mode)?.label}
                  <ChevronDown className={cn("size-3.5 transition-transform", modeOpen && "rotate-180")} aria-hidden />
                </button>
                {modeOpen && (
                  <div role="listbox" aria-label="创作类型" className="absolute left-0 top-9 z-20 min-w-[156px] rounded-xl border border-line bg-surface p-2 shadow-xl">
                    {MODES.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        role="option"
                        aria-selected={mode === m.value}
                        onClick={() => {
                          setMode(m.value);
                          setModeOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center rounded-lg px-2 py-2 text-left text-sm transition-colors",
                          mode === m.value ? "bg-surface-3 text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                aria-label="发送"
                className="flex size-8 items-center justify-center rounded-full bg-fg text-bg transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp className="size-4" aria-hidden />
              </button>
            </div>
          </div>

          {/* —— 常用工具：7 个横排（原站 home-entry-tool-list，≥7 项 justify-between） —— */}
          <section aria-label="常用工具入口" className="mt-12">
            <div className="flex w-full items-start justify-between gap-2 overflow-x-auto px-4 pb-1 max-sm:justify-start max-sm:gap-5">
              {TOOLS.map((t) => (
                <Link
                  key={t.key}
                  href={t.href}
                  title={t.desc}
                  className="group flex w-[88px] shrink-0 flex-col items-center gap-4 rounded-[16px] text-center"
                >
                  <span className={cn("inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl border border-line/60 shadow-sm transition-colors group-hover:brightness-95", t.tint)}>
                    <t.Icon className="size-6" strokeWidth={1.2} aria-hidden />
                  </span>
                  <span className="block w-full truncate text-sm leading-5 text-fg">{t.title}</span>
                </Link>
              ))}
            </div>
          </section>
        </section>

        {/* —— 你想做什么：原站 6 场景 + 石材 2 模块，同横滑条 —— */}
        <section
          aria-label="创作场景入口"
          className="home-entry-scene-section relative z-[1] mt-10 w-full min-w-0 max-w-[1744px] max-3xl:max-w-none max-md:hidden"
        >
          <header className="home-entry-scene-header mb-4 flex items-center justify-between gap-4">
            <div className="home-entry-scene-heading flex min-w-0 items-baseline gap-2">
              <h2 className="home-entry-scene-title text-xl font-semibold text-fg">你想做什么？</h2>
              <p className="home-entry-scene-desc text-xs text-fg-muted">选择创作目标快速开始</p>
            </div>
          </header>
          <div className="home-entry-scene-viewport-shell group/scene relative w-full min-w-0">
            <div className="home-entry-scene-perspective w-full overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-[18px] pb-2 scrollbar-none">
              <div className="home-entry-scene-list flex w-full gap-6">
                {SCENES.map((s) => (
                  <Link
                    key={s.key}
                    href={s.href}
                    className="home-entry-scene-card group flex w-[calc(22.222222%_-_21.333333px)] min-w-[240px] shrink-0 flex-col overflow-hidden rounded-[12px] border border-line bg-bg text-left"
                  >
                    <span className="home-entry-scene-image-box relative block aspect-video w-full overflow-hidden bg-surface-2">
                      <span className="home-creative-entry-scene-cover relative block h-full w-full overflow-hidden transition-transform duration-500 ease-out group-hover:scale-[1.02]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.cover}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </span>
                      {s.media === "video" && (
                        <span className="home-entry-scene-play-badge pointer-events-none absolute right-2 top-2 z-10 inline-flex size-5 items-center justify-center rounded-full bg-black/30 text-white/60 transition-opacity duration-150 group-hover:opacity-0" aria-hidden>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden
                            className="home-entry-scene-play-badge-icon h-3 w-3 translate-x-px"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </span>
                    <span className="relative flex h-10 w-full items-center gap-2 px-4">
                      {s.media === "video" ? (
                        <Clapperboard className="size-4 shrink-0 text-fg-muted" aria-hidden />
                      ) : (
                        <ImageIcon className="size-4 shrink-0 text-fg-muted" aria-hidden />
                      )}
                      <span className="flex w-full min-w-0 items-center gap-4">
                        <span className="shrink-0 text-[12px] font-medium text-fg">{s.title}</span>
                        <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-[11px] text-fg-muted">
                          {s.desc}
                        </span>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* —— 发现：过滤 tabs + 卡片墙（原站 home-discover-section） —— */}
        <section aria-label="发现" className="home-discover-section mt-10 w-full max-w-[1744px] max-3xl:max-w-none">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">发现</h2>
            <Link href="/discover" className="text-[13px] text-fg-muted hover:text-fg">
              更多 →
            </Link>
          </div>
          <div className="mt-3 flex gap-2">
            {DISCOVER_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-sm font-medium leading-none transition-colors",
                  tab === t ? "bg-surface-3 text-fg" : "bg-transparent text-fg-subtle hover:text-fg-muted"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 pb-4 lg:grid-cols-4">
            {visible.map((d) => (
              <Link
                key={d.title}
                href="/discover"
                aria-label={d.desc ? `${d.title} | ${d.desc}` : d.title}
                className="group relative overflow-hidden rounded-2xl border border-line bg-surface-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.cover}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <span className="absolute inset-x-0 bottom-0 flex min-w-0 items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-2.5 pt-8 text-left text-[11px] leading-none text-white">
                  <span className="min-w-0 flex-1 truncate">
                    {d.title} | {d.desc}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-0.5 font-medium tabular-nums">
                    <Heart className="size-3" aria-hidden />
                    {d.likes}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:px-6">
          <span className="text-sm font-semibold">xin.ai</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-muted">
            <Link href="/toolbox" className="hover:text-fg">工具箱</Link>
            <Link href="/pricing" className="hover:text-fg">定价</Link>
            <Link href="/docs" className="hover:text-fg">使用指南</Link>
            <Link href="/account" className="hover:text-fg">账户</Link>
          </nav>
          <p className="text-xs text-fg-subtle sm:ml-auto">© 2026 xin.ai</p>
        </div>
      </footer>
        </div>
      </div>
    </div>
  );
}
