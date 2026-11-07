"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceShell } from "@/components/features/WorkspaceShell";
import { DiscoverWaterfall } from "@/components/features/DiscoverWaterfall";
import { LoginModal } from "@/components/features/LoginModal";
import { useToast } from "@/components/features/ToastHost";
import { speechErrorMessage, useSpeechInput } from "@/lib/useSpeechInput";
// import { useAuthStore } from "@/stores"; // 本地联调放行：首页不再读登录态
import { DISCOVER_ITEMS } from "@/app/discover-data";
import { cn } from "@/lib/cn";

/**
 * 原站 .page-home 内联主题变量（2026-11-01 实测逐字对齐）。
 * data-site-theme=minimal / data-site-tone=light / data-home-layout=spotlight
 */
const HOME_THEME_STYLE = {
  "--site-home-bg": "#fcfcfc",
  "--site-home-surface": "#ffffff",
  "--site-home-text": "#171717",
  "--site-home-text-muted": "#727272",
  "--site-home-accent": "#171717",
  "--site-home-on-accent": "#ffffff",
  "--color-accent": "#171717",
  "--color-accent-deep": "#171717",
  "--color-accent-muted": "color-mix(in srgb, #171717 10%, transparent)",
  "--color-on-accent": "#ffffff",
  "--color-brand": "#171717",
  "--color-brand-hover": "color-mix(in srgb, #171717 85%, black)",
  "--color-brand-muted": "color-mix(in srgb, #171717 10%, transparent)",
  "--color-home-hero-accent-text": "#0471fe",
  "--gradient-home-spotlight-bg": "none",
  "--gradient-home-glow":
    "radial-gradient(ellipse 50% 100% at center 8%, #fdfcfc 0%, #9dd2ff 50%, transparent 78%)",
  "--gradient-home-spotlight-mask": "linear-gradient(180deg, transparent 45%, #fcfcfc 100%)",
  "--color-bg-action":
    "color-mix(in srgb, var(--site-home-surface) 94%, var(--site-home-text))",
  "--color-home-tool-icon-hover-bg": "var(--color-bg-action)",
  "--color-home-card-bg": "var(--site-home-surface)",
  "--composer-send-bg": "#171717",
  "--composer-send-fg": "#ffffff",
  "--home-decoration-width": "0px",
  "--home-decoration-duration": "250ms",
  "--home-actions-width": "0px",
} as React.CSSProperties;

/*
 * 首页 1:1 复刻 new-ai（2026-10-30 实测逐字复刻）
 *
 * 原站 DOM 层级（1600×900 实测）：
 *  div.workspace-shell
 *   └─ main.workspace-main-content
 *      └─ div.page-home
 *         └─ div.home-scroll-content   px-[60px] pt-[96px] items-center
 *            └─ div.home-above-fold    gap-[64px]
 *               ├─ div.home-landing-blue-wash-center   （绝对定位辉光）
 *               ├─ div.home-header-title > div.home-hero-title > h1.home-hero-title-text
 *               └─ div.home-composer-tool-group        gap-12 max-w-[840px]
 *                  ├─ div.home-header-composer-wrap.home-header-composer
 *                  │    ├─ div.home-composer-input-row
 *                  │    │    ├─ div.composer-reference-rail-desktop
 *                  │    │    └─ div.home-composer-editor-wrap > div.home-composer-editor
 *                  │    │         └─ div.composer-prompt-input > div.mention-composer
 *                  │    └─ div.composer-toolbar > div.speech-input-toolbar
 *                  └─ section.home-entry-tool-section   （7 个常用工具）
 *            ├─ section.home-entry-scene-section        （6 个场景）
 *            └─ section.home-discover-section
 *
 * 唯一加戏：场景条追加 2 个石材模块（石材效果图 / 厂家介绍视频）。
 */

/* —— 原站常用工具（7 个，顺序固定） —— */
const TOOLS = [
  {
    key: "canvas",
    title: "画布",
    href: "/canvas",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="workspace-nav-icon pointer-events-none home-entry-tool-icon h-6 w-6 stroke-[1.2]"
      >
        <path d="M7 3.5v17M17 3.5v7M3 7h18M3 16h8" />
        <path d="M17 13c.5 2 1.5 3 3.5 3.5-2 .5-3 1.5-3.5 3.5-.5-2-1.5-3-3.5-3.5 2-.5 3-1.5 3.5-3.5Z" fill="none" />
      </svg>
    ),
  },
  {
    key: "editor",
    title: "剪辑台",
    href: "/toolbox/editor",
    icon: (
      <svg
        className="video-editor-workbench-icon home-entry-tool-icon h-6 w-6 stroke-[1.2]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 11h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7Z" />
        <path d="M3 8h18v3H3zM10 8l-3 3M16 8l-3 3M21 8l-3 3" />
        <g
          className="video-editor-workbench-clapper-top transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] rotate-0"
          style={{ transformBox: "view-box", transformOrigin: "3px 8px" }}
        >
          <path d="M3 5h18v3H3zM7 5l3 3M13 5l3 3M19 5l2 2" />
        </g>
        <path d="M7 16h10" />
      </svg>
    ),
  },
  {
    key: "video-quality-enhance",
    title: "画质增强",
    href: "/toolbox/video-quality-enhance",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden
        data-slot="icon"
        className="home-entry-tool-icon h-6 w-6 stroke-[1.2]"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423Z"
        />
      </svg>
    ),
  },
  {
    key: "video-watermark-remove",
    title: "水印擦除",
    href: "/toolbox/video-watermark-remove",
    icon: (
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="canvas-watermark-remove-icon home-entry-tool-icon h-6 w-6 stroke-[1.2]"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M12 5v14" />
        <path d="m4 10 4-4M4 15l8-8M7 18l5-5" />
      </svg>
    ),
  },
  {
    key: "video-subtitle-erase",
    title: "字幕擦除",
    href: "/toolbox/video-subtitle-erase",
    icon: (
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="canvas-subtitle-erase-icon home-entry-tool-icon h-6 w-6 stroke-[1.2]"
      >
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M6.5 14h4M13.5 14h4" />
        <path d="m14.5 18.5 5-5 2 2-5 5h-2Z" />
        <path d="m15.5 17.5 2 2" />
      </svg>
    ),
  },
  {
    key: "image-refine",
    title: "图片精修",
    href: "/toolbox/image-generation?skill_pack=product-refine",
    icon: (
      <svg
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        overflow="visible"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="home-entry-tool-icon h-6 w-6 stroke-[1.2]"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9.28027 7.62402C10.661 7.62402 11.7803 8.74331 11.7803 10.124C11.7803 11.5047 10.661 12.624 9.28027 12.624C7.89967 12.6239 6.78027 11.5047 6.78027 10.124C6.78027 8.74339 7.89967 7.62416 9.28027 7.62402ZM9.28027 9.12402C8.7281 9.12416 8.28027 9.57182 8.28027 10.124C8.28027 10.6762 8.7281 11.1239 9.28027 11.124C9.83256 11.124 10.2803 10.6763 10.2803 10.124C10.2803 9.57174 9.83256 9.12402 9.28027 9.12402Z"
          fill="var(--fill-0, #111111)"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M17.5 4.16797C19.433 4.16797 21 5.73497 21 7.66797V13.6514L21.0264 13.667L21 13.7139V15.668C21 17.601 19.433 19.168 17.5 19.168H6.5C4.567 19.168 3 17.601 3 15.668V7.66797C3 5.73497 4.567 4.16797 6.5 4.16797H17.5ZM6.5 5.66797C5.39543 5.66797 4.5 6.5634 4.5 7.66797V15.668L4.51074 15.8721C4.6062 16.8136 5.35435 17.5618 6.2959 17.6572L6.5 17.668H8.24316L14.0908 12.0381C14.9615 11.1997 16.2775 11.0281 17.334 11.6152L19.5 12.8184V7.66797C19.5 6.5634 18.6046 5.66797 17.5 5.66797H6.5ZM16.6055 12.9258C16.1253 12.659 15.5266 12.7371 15.1309 13.1182L10.4062 17.668H17.5L17.7041 17.6572C18.6457 17.5618 19.3938 16.8136 19.4893 15.8721L19.5 15.668V14.5352L16.6055 12.9258Z"
          fill="var(--fill-0, #111111)"
        />
      </svg>
    ),
  },
  {
    key: "ai-character",
    title: "AI 角色",
    href: "/assets#character",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="ai-character-icon home-entry-tool-icon h-6 w-6 stroke-[1.2]"
      >
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20v-1.5a6.5 6.5 0 0 1 13 0V20H2.5Z" />
        <path d="M18 2.5c.45 2.7 1.3 3.55 4 4-2.7.45-3.55 1.3-4 4-.45-2.7-1.3-3.55-4-4 2.7-.45 3.55-1.3 4-4Z" />
      </svg>
    ),
  },
];

/* —— 原站场景卡（6 个）+ 石材新增 2 个 —— */
const VIDEO_MEDIA_ICON = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    className="workspace-nav-icon pointer-events-none home-entry-scene-media-icon h-4 w-4 shrink-0 text-[var(--color-home-entry-text)]"
  >
    <path d="m16.5 10 4-3a.5.5 0 0 1 .8.4v9.2a.5.5 0 0 1-.8.4l-4-3" fill="none" />
    <rect x="2.5" y="5.5" width="14" height="13" rx="2.5" fill="none" />
    <rect x="6" y="9" width="6" height="3" rx="1.5" stroke="currentColor" />
  </svg>
);
const IMAGE_MEDIA_ICON = (
  <svg
    preserveAspectRatio="none"
    width="100%"
    height="100%"
    overflow="visible"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    className="home-entry-scene-media-icon h-4 w-4 shrink-0 text-[var(--color-home-entry-text)]"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.28027 7.62402C10.661 7.62402 11.7803 8.74331 11.7803 10.124C11.7803 11.5047 10.661 12.624 9.28027 12.624C7.89967 12.6239 6.78027 11.5047 6.78027 10.124C6.78027 8.74339 7.89967 7.62416 9.28027 7.62402ZM9.28027 9.12402C8.7281 9.12416 8.28027 9.57182 8.28027 10.124C8.28027 10.6762 8.7281 11.1239 9.28027 11.124C9.83256 11.124 10.2803 10.6763 10.2803 10.124C10.2803 9.57174 9.83256 9.12402 9.28027 9.12402Z"
      fill="var(--fill-0, #111111)"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.5 4.16797C19.433 4.16797 21 5.73497 21 7.66797V13.6514L21.0264 13.667L21 13.7139V15.668C21 17.601 19.433 19.168 17.5 19.168H6.5C4.567 19.168 3 17.601 3 15.668V7.66797C3 5.73497 4.567 4.16797 6.5 4.16797H17.5ZM6.5 5.66797C5.39543 5.66797 4.5 6.5634 4.5 7.66797V15.668L4.51074 15.8721C4.6062 16.8136 5.35435 17.5618 6.2959 17.6572L6.5 17.668H8.24316L14.0908 12.0381C14.9615 11.1997 16.2775 11.0281 17.334 11.6152L19.5 12.8184V7.66797C19.5 6.5634 18.6046 5.66797 17.5 5.66797H6.5ZM16.6055 12.9258C16.1253 12.659 15.5266 12.7371 15.1309 13.1182L10.4062 17.668H17.5L17.7041 17.6572C18.6457 17.5618 19.3938 16.8136 19.4893 15.8721L19.5 15.668V14.5352L16.6055 12.9258Z"
      fill="var(--fill-0, #111111)"
    />
  </svg>
);
const MOBILE_VIDEO_MEDIA_ICON = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    className="workspace-nav-icon pointer-events-none home-entry-mobile-scene-media-icon h-4 w-4 shrink-0 text-foreground"
  >
    <path d="m16.5 10 4-3a.5.5 0 0 1 .8.4v9.2a.5.5 0 0 1-.8.4l-4-3" fill="none" />
    <rect x="2.5" y="5.5" width="14" height="13" rx="2.5" fill="none" />
    <rect x="6" y="9" width="6" height="3" rx="1.5" stroke="currentColor" />
  </svg>
);
const MOBILE_IMAGE_MEDIA_ICON = (
  <svg
    preserveAspectRatio="none"
    width="100%"
    height="100%"
    overflow="visible"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    className="home-entry-mobile-scene-media-icon h-4 w-4 shrink-0 text-foreground"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.28027 7.62402C10.661 7.62402 11.7803 8.74331 11.7803 10.124C11.7803 11.5047 10.661 12.624 9.28027 12.624C7.89967 12.6239 6.78027 11.5047 6.78027 10.124C6.78027 8.74339 7.89967 7.62416 9.28027 7.62402ZM9.28027 9.12402C8.7281 9.12416 8.28027 9.57182 8.28027 10.124C8.28027 10.6762 8.7281 11.1239 9.28027 11.124C9.83256 11.124 10.2803 10.6763 10.2803 10.124C10.2803 9.57174 9.83256 9.12402 9.28027 9.12402Z"
      fill="var(--fill-0, #111111)"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.5 4.16797C19.433 4.16797 21 5.73497 21 7.66797V13.6514L21.0264 13.667L21 13.7139V15.668C21 17.601 19.433 19.168 17.5 19.168H6.5C4.567 19.168 3 17.601 3 15.668V7.66797C3 5.73497 4.567 4.16797 6.5 4.16797H17.5ZM6.5 5.66797C5.39543 5.66797 4.5 6.5634 4.5 7.66797V15.668L4.51074 15.8721C4.6062 16.8136 5.35435 17.5618 6.2959 17.6572L6.5 17.668H8.24316L14.0908 12.0381C14.9615 11.1997 16.2775 11.0281 17.334 11.6152L19.5 12.8184V7.66797C19.5 6.5634 18.6046 5.66797 17.5 5.66797H6.5ZM16.6055 12.9258C16.1253 12.659 15.5266 12.7371 15.1309 13.1182L10.4062 17.668H17.5L17.7041 17.6572C18.6457 17.5618 19.3938 16.8136 19.4893 15.8721L19.5 15.668V14.5352L16.6055 12.9258Z"
      fill="var(--fill-0, #111111)"
    />
  </svg>
);

const SCENES: {
  key: string;
  title: string;
  desc: string;
  media: "video" | "image";
  href: string;
  cover: string;
  video?: string;
  stone?: boolean;
}[] = [
  {
    key: "depth-video-clone",
    title: "爆款复刻",
    desc: "参考爆款视频，轻松创作专属爆款",
    media: "video" as const,
    href: "/toolbox/depth-video-clone",
    cover: "/images/bench/scene-entry-depth-video-clone-v2.jpg",
    video: undefined,
  },
  {
    key: "ecommerce-image-set",
    title: "商详套图",
    desc: "一键生成专业商品详情套图",
    media: "image" as const,
    href: "/toolbox/ecommerce-image-set",
    cover: "/images/bench/scene-entry-ecommerce-image-set.jpg",
    video: undefined,
  },
  {
    key: "ecommerce-video",
    title: "电商带货",
    desc: "快速生成商品展示与带货视频",
    media: "video" as const,
    href: "/toolbox/video-generation?skill=ecommerce-spoken-selling&skill_panel=open&skill_category=ecommerce",
    cover: "/images/bench/scene-entry-ecommerce-video.jpg",
    video: undefined,
  },
  {
    key: "local-store-video",
    title: "同城到店",
    desc: "轻松制作本地探店推广视频",
    media: "video" as const,
    href: "/toolbox/video-generation?skill=local-store-discovery&skill_panel=open&skill_category=local-store",
    cover: "/images/bench/scene-entry-local-store-video.jpg",
    video: undefined,
  },
  {
    key: "brand-advertising",
    title: "品牌广告",
    desc: "打造视听统一的品牌广告",
    media: "video" as const,
    href: "/toolbox/video-generation?skill=advertising-brand-proposition&skill_panel=open&skill_category=advertising-tvc",
    cover: "/images/bench/scene-entry-brand-advertising.jpg",
    video: undefined,
  },
  {
    key: "short-drama",
    title: "剧情短片",
    desc: "快速创作情节紧凑的剧情短片",
    media: "video" as const,
    href: "/toolbox/video-generation?skill=short-drama-dialogue&skill_panel=open&skill_category=short-drama",
    cover: "/images/bench/scene-entry-short-drama.jpg",
    video: undefined,
  },
  {
    key: "stone-effect",
    title: "石材效果图",
    desc: "传一块板，出整套空间效果图",
    media: "image" as const,
    href: "/toolbox/stone-effect",
    cover: "/images/bench/scene-entry-stone-effect.jpg",
    video: undefined,
    stone: true,
  },
  {
    key: "factory-video",
    title: "厂家介绍视频",
    desc: "探厂探展厅 + 数字人口播",
    media: "video" as const,
    href: "/toolbox/factory-video",
    cover: "/images/bench/scene-entry-factory-video.jpg",
    video: undefined,
    stone: true,
  },
];

/* —— Composer 生成模式（原站 home-style-dropdown） —— */
const MODES = [
  { value: "agent", label: "Agent 模式", icon: "sparkle" },
  { value: "video", label: "视频生成", icon: "video" },
  { value: "image", label: "图片生成", icon: "image" },
] as const;

const PLACEHOLDERS: Record<string, string> = {
  agent: "结合参考、输入文字或 @ 主体，说说今天想做什么。",
  video: "上传参考素材并输入文字，或使用 @ 引用已添加的素材。可自由组合图、文、音、视频。",
  image: "可上传参考图并输入文字，或使用 @ 引用已添加的素材。可自由组合图、文。",
};

/* —— 发现流（1:1 复刻原站瀑布流；封面为本地重新生成的素材） —— */
const DISCOVER_TABS = ["发现", "视频", "图片", "画布"] as const;

function ModeIcon({ kind }: { kind: (typeof MODES)[number]["icon"] }) {
  if (kind === "video") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden
        data-slot="icon"
        className="h-5 w-5"
      >
        <path d="m16.5 10 4-3a.5.5 0 0 1 .8.4v9.2a.5.5 0 0 1-.8.4l-4-3" fill="none" />
        <rect x="2.5" y="5.5" width="14" height="13" rx="2.5" fill="none" />
        <rect x="6" y="9" width="6" height="3" rx="1.5" stroke="currentColor" />
      </svg>
    );
  }
  if (kind === "image") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden
        data-slot="icon"
        className="h-5 w-5"
      >
        <rect x="3.5" y="5" width="17" height="14" rx="2.5" fill="none" />
        <circle cx="9" cy="10" r="1.5" stroke="currentColor" />
        <path d="m8 19 6.5-6.5a1.5 1.5 0 0 1 1.8-.25l4.2 2.25" stroke="currentColor" />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
      data-slot="icon"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423Z"
      />
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { push } = useToast();
  const sceneRef = useRef<HTMLDivElement>(null);
  // 行内注释1：首页语音输入走真实闭环 —— 录音 → 上传资产 → 后端转写。
  //             此前是 toast 占位，后端 /speech-input/transcribe 从未被调用。
  const speech = useSpeechInput();
  const [sceneEnds, setSceneEnds] = useState({ left: false, right: true });
  const updateSceneEnds = () => {
    const el = sceneRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setSceneEnds({
      left: el.scrollLeft > 8,
      right: el.scrollLeft < max - 8,
    });
  };
  useEffect(() => {
    updateSceneEnds();
    const el = sceneRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateSceneEnds, { passive: true });
    window.addEventListener("resize", updateSceneEnds);
    return () => {
      el.removeEventListener("scroll", updateSceneEnds);
      window.removeEventListener("resize", updateSceneEnds);
    };
  }, []);
  const scrollScene = (dir: number) => {
    const el = sceneRef.current;
    if (el) {
      el.scrollBy({ left: dir * Math.max(560, el.clientWidth * 0.8), behavior: "smooth" });
      // 兜底：smooth 动画结束后刷新箭头显隐
      window.setTimeout(updateSceneEnds, 450);
    }
    else push({ tone: "neutral", title: dir > 0 ? "向右滑动（演示）" : "向左滑动（演示）" });
  };
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<string>("agent");
  const [modeOpen, setModeOpen] = useState(false);
  const [tab, setTab] = useState<(typeof DISCOVER_TABS)[number]>("发现");
  const editorRef = useRef<HTMLDivElement>(null);

  const canSubmit = prompt.trim().length > 0;

  // 原站实测：未登录时点击首页工具 / 场景卡片不会跳转，而是弹出登录弹窗（.modal-login-shell）
  // —— 本地联调放行（无后端）：直接跳转，不弹登录；恢复时删掉下一行、取消注释即可 ——
  // const user = useAuthStore((s) => s.user);
  const requireAuth = (href: string) => {
    // if (!user) {
    //   setLoginOpen(true);
    //   return;
    // }
    router.push(href);
  };

  const submit = () => {
    if (!canSubmit) return;
    const q = encodeURIComponent(prompt.trim());
    if (mode === "video") requireAuth(`/toolbox/video-generation?q=${q}`);
    else if (mode === "image") requireAuth(`/toolbox/image-generation?q=${q}`);
    else requireAuth("/agent-cloud");
  };

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const onInput = () => setPrompt(el.innerText);
    el.addEventListener("input", onInput);
    return () => el.removeEventListener("input", onInput);
  }, []);

  // 原站实测：/login → / ；/register → /?login=1 ；/admin → /?login=1&next=%2Fadmin
  // 所以登录/注册是**首页弹窗**，不是独立页面。
  // —— 本地联调放行（无后端）：?login=1 不再自动弹登录；恢复时取消注释即可 ——
  const [loginOpen, setLoginOpen] = useState(false);
  // useEffect(() => {
  //   const sp = new URLSearchParams(window.location.search);
  //   if (sp.get("login") === "1") {
  //     setLoginOpen(true);
  //     const next = sp.get("next");
  //     if (next) router.replace(`/?login=1&next=${encodeURIComponent(next)}`);
  //   }
  // }, [router]);

  const visible = useMemo(() => {
    const base = DISCOVER_ITEMS;
    if (tab === "发现") return base;
    if (tab === "视频") return base.filter((d) => d.kind === "video");
    if (tab === "图片") return base.filter((d) => d.kind === "image");
    return base.filter((d) => d.kind === "canvas");
  }, [tab]);

  return (
    <WorkspaceShell>
      {/* 原站层级：page-home 的父级是 .home-decoration-workspace，
          后者还有 .home-decoration-sidebar-shell（宽 0，占位）。 */}
      <div className="home-decoration-workspace flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div
          className="page-home relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-[var(--color-home-page-bg)] text-foreground"
          data-site-theme="minimal"
          data-site-tone="light"
          data-home-layout="spotlight"
          style={HOME_THEME_STYLE}
        >
        <div
          className="home-scroll-content [--home-composer-editor-height:82px] [--home-composer-input-min-height:70px] [&>.home-discover-section]:mt-[var(--home-discover-margin,40px)] max-md:[&>.home-discover-section]:mt-8 scroll-content relative flex min-h-0 w-full min-w-0 flex-1 flex-col items-center px-[60px] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-[96px] [html[data-home-layout=compact]_&]:pt-[64px] max-sm:px-6"
          style={{ "--home-discover-margin": "40px" } as React.CSSProperties}
        >
          <div className="home-above-fold relative flex w-full min-w-0 flex-col items-center gap-[64px] max-md:gap-8 [html[data-home-layout=compact]_&]:gap-10">
            {/* —— 辉光 —— 原站层级：.home-spotlight-backdrop > .home-spotlight-halo —— */}
            <div className="home-spotlight-backdrop pointer-events-none absolute inset-x-[-60px] top-[-96px] z-0 h-[520px] overflow-hidden bg-[image:var(--gradient-home-spotlight-bg)] max-sm:inset-x-[-24px]">
              <div className="home-spotlight-halo pointer-events-none absolute left-1/2 top-0 z-[1] h-[210px] w-full max-w-[860px] -translate-x-1/2 -translate-y-1/2 bg-[image:var(--gradient-home-glow)] blur-[98px]" />
            </div>

            {/* —— 标题 —— */}
            <div className="home-header-title relative z-[1] w-fit min-w-0 max-w-full">
              <div className="home-hero-title relative flex w-full min-w-0 flex-col items-center text-center">
                <h1 className="home-hero-title-text inline-block max-w-full whitespace-normal break-words text-[28px] font-semibold not-italic leading-9 text-[var(--color-home-hero-title)] max-sm:text-[24px] max-sm:leading-8 [html[data-home-layout=compact]_&]:text-[24px] [html[data-home-layout=compact]_&]:leading-8">
                  <span className="home-hero-title-brand text-[var(--color-home-hero-accent-text)]">
                    new-ai
                  </span>
                  <span className="home-hero-title-separator">，</span>
                  <span className="home-hero-title-tagline">
                    <span className="home-hero-custom-title-part ">
                      懂制造业的AI创作工具
                    </span>                  </span>
                </h1>
              </div>
            </div>

            {/* —— Composer + 常用工具 —— */}
            <div className="home-composer-tool-group relative z-[1] flex w-full max-w-[840px] flex-col gap-12">
              <div className="home-header-composer-wrap home-header-composer relative z-[2] box-border flex w-full min-w-0 shrink-0 flex-col justify-between gap-0 rounded-[20px] border-2 border-[var(--color-home-composer-border)] bg-[var(--color-home-composer-bg)] p-2 [box-shadow:var(--shadow-home-composer)] transition-[box-shadow,border-color,background-color,margin] duration-200 ease-out motion-reduce:transition-none">
                <div className="home-composer-input-row flex min-h-0 flex-1 items-start [&>.composer-reference-rail-desktop]:!h-[var(--home-composer-editor-height)]">
                    <div className="composer-reference-rail-desktop relative z-20 flex h-[108px] w-[104px] min-h-0 shrink-0 transform-gpu flex-col items-center justify-center transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform [backface-visibility:hidden]">
                      <div className="composer-reference-upload-group relative z-10 flex shrink-0 origin-center">
                        <div className="composer-reference-upload-attachment relative h-16 w-14 origin-center">
                          <div className="composer-reference-upload-slot relative left-0 top-0 h-16 w-14 origin-center -rotate-[8deg] shadow-[-4px_8px_20px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-in-out hover:rotate-0">
                            <button type="button" aria-label="添加参考素材" onClick={() => requireAuth("/assets")} className="composer-reference-upload-button group relative flex h-16 w-14 shrink-0 transform-none origin-center items-center justify-center overflow-hidden rounded-[10px] bg-surface text-[#222529] shadow-none hover:transform-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:rotate-[-8deg]">
                              <span aria-hidden="true" className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(136.6deg,#d7ecff_20.9%,#67e6ff_98.9%)] opacity-30 transition-opacity duration-200 group-hover:opacity-40" />
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden data-slot="icon" className="relative z-[1] h-[18px] w-[18px] stroke-[2] origin-center"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="home-composer-editor-wrap relative min-w-0 flex-1 px-2 py-1">
                      <div
                        data-home-editor-root="true"
                        className="home-composer-editor relative z-0 flex h-[var(--home-composer-editor-height)] min-h-0 min-w-0 flex-col overflow-hidden"
                      >
                      <div className="composer-prompt-input relative flex min-h-0 flex-auto flex-col home-composer-input-field min-h-0 w-full flex-1">
                        <div className="mention-composer relative flex flex-auto flex-col min-h-7 min-w-0">
                          <div className="mention-composer-shell relative flex min-h-0 flex-auto flex-col min-h-[var(--home-composer-input-min-height)] max-h-[var(--home-composer-editor-height)] rounded-none border-0 bg-transparent shadow-none cursor-text">
                            <div
                              data-mention-placeholder="true"
                              className="mention-composer-placeholder pointer-events-none absolute z-[1] text-[14px] font-normal leading-[26px] text-[#00000040]"
                              style={{ left: "0.5rem", right: "0.5rem", top: "0.5rem" }}
                            >
                              {PLACEHOLDERS[mode]}
                            </div>
                            <div
                              ref={editorRef}
                              data-mention-editor="true"
                              contentEditable
                              suppressContentEditableWarning
                              role="textbox"
                              aria-multiline="true"
                              className="mention-composer-editor min-h-0 h-full w-full flex-auto cursor-text overflow-y-auto whitespace-pre-wrap break-words px-2 py-2 text-[14px] font-normal leading-[26px] text-[#1f2937]"
                            />
                          </div>
                          <div className="mention-composer-speech min-w-0 shrink-0 contents" />
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>

                  {/* 工具条 */}
                  <div className="home-composer-toolbar-wrap w-full shrink-0 mt-2">
                    <div
                      style={
                        {
                          "--toolbar-size": "32px",
                          "--toolbar-font-size": "12px",
                          "--toolbar-icon-size": "18px",
                        } as React.CSSProperties
                      }
                      className="composer-toolbar w-full min-w-0 shrink-0"
                    >
                      <div className="speech-input-toolbar flex min-h-[var(--toolbar-size,32px)] w-full min-w-0 shrink-0 flex-nowrap items-end gap-2 max-sm:min-h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:min-h-[var(--toolbar-size,44px)]">
                        <div className="speech-input-toolbar-main relative min-h-[var(--toolbar-size,32px)] min-w-0 flex-1 max-sm:min-h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:min-h-[var(--toolbar-size,44px)]">
                          <div className="speech-input-toolbar-details flex min-h-[var(--toolbar-size,32px)] min-w-0 flex-wrap items-center gap-1.5 pr-10 max-sm:min-h-[var(--toolbar-size,44px)] max-sm:pr-14 [@media(pointer:coarse)]:min-h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:pr-14 transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none visible translate-y-0 opacity-100 delay-0">
                            <div className="home-mode-selector home-style-dropdown relative inline-flex min-h-[var(--toolbar-size,36px)] items-center">
                              <button
                                type="button"
                                role="combobox"
                                aria-haspopup="listbox"
                                aria-controls="home-mode-listbox"
                                aria-expanded={modeOpen}
                                aria-label="生成模式"
                                onClick={() => setModeOpen((v) => !v)}
                                className="home-mode-combobox home-style-dropdown-combobox inline-flex h-[var(--toolbar-size,36px)] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-transparent px-2 text-[length:var(--toolbar-font-size,14px)] text-foreground transition-colors hover:bg-action aria-[expanded=true]:bg-action disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                <span className="home-style-dropdown-value inline-flex min-w-0 items-center gap-1.5">
                                  <span className="home-style-dropdown-value-icon flex h-[var(--toolbar-icon-size,20px)] w-[var(--toolbar-icon-size,20px)] shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full">
                                    <ModeIcon kind={MODES.find((m) => m.value === mode)?.icon ?? "sparkle"} />
                                  </span>
                                  <span className="home-style-dropdown-value-label truncate">
                                    {MODES.find((m) => m.value === mode)?.label}
                                  </span>
                                </span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden data-slot="icon" className="home-style-dropdown-chevron h-[var(--toolbar-font-size,14px)] w-[var(--toolbar-font-size,14px)] shrink-0 text-foreground transition-transform duration-150">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                              </button>
                              {modeOpen ? (
                                <div id="home-mode-listbox" role="listbox" aria-label="生成模式" className="home-style-dropdown-popover absolute left-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-line bg-surface shadow-[0_18px_56px_rgba(15,23,42,0.18)]">
                                  {MODES.map((m) => {
                                    const on = m.value === mode;
                                    return (
                                      <button
                                        key={m.value}
                                        type="button"
                                        role="option"
                                        aria-selected={on}
                                        onClick={() => {
                                          setMode(m.value);
                                          setModeOpen(false);
                                        }}
                                        className="home-style-dropdown-option flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-action data-[selected=true]:bg-action"
                                        data-selected={on}
                                      >
                                        <span className="home-style-dropdown-value-icon flex h-5 w-5 shrink-0 items-center justify-center">
                                          <ModeIcon kind={m.icon} />
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">{m.label}</span>
                                        {on ? (
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-3.5 w-3.5 shrink-0 text-accent-deep"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                                        ) : null}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          </div>

                      <div className="speech-input-toolbar-slot pointer-events-none absolute inset-x-0 bottom-0 flex h-[var(--toolbar-size,32px)] min-w-0 items-center max-sm:h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:h-[var(--toolbar-size,44px)]">
                        <div
                          className="speech-input-controls flex min-h-[var(--toolbar-size,32px)] w-full min-w-0 shrink-0 items-center justify-end gap-2 text-foreground max-sm:min-h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:min-h-[var(--toolbar-size,44px)] pointer-events-none"
                          data-speech-active="false"
                          role="group"
                          aria-label="语音输入控制"
                        >
                          <span className="ui-hover-tooltip-trigger inline-flex items-center justify-center outline-none ">
                            <button
                              type="button"
                              aria-label="语音输入"
                              disabled={!speech.supported || speech.phase === "uploading" || speech.phase === "transcribing"}
                              onClick={async () => {
                                if (speech.phase === "recording") {
                                  try {
                                    await speech.stop((text) => {
                                      push({ tone: "success", title: "语音已识别", description: text.slice(0, 60) });
                                    });
                                  } catch (e) {
                                    push({ tone: "warning", title: "语音识别失败", description: speechErrorMessage(e) });
                                  }
                                  return;
                                }
                                try {
                                  await speech.start();
                                  push({ tone: "neutral", title: "正在聆听…", description: "再次点击麦克风结束并转写" });
                                } catch (e) {
                                  push({ tone: "warning", title: "无法录音", description: speechErrorMessage(e) });
                                }
                              }}
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

                    <div className="speech-input-toolbar-trailing flex h-[var(--toolbar-size,32px)] shrink-0 items-center justify-center max-sm:h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:h-[var(--toolbar-size,44px)]">
                      <button
                        type="button"
                        aria-label="发送"
                        data-home-composer-send="true"
                        onClick={submit}
                        disabled={!canSubmit}
                        className="composer-toolbar-send flex h-[var(--toolbar-size)] w-[var(--toolbar-size)] shrink-0 items-center justify-center rounded-full bg-foreground text-background disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          aria-hidden
                          data-slot="icon"
                          className="composer-toolbar-send-icon h-[var(--toolbar-icon-size)] w-[var(--toolbar-icon-size)]"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              {/* 常用工具 */}
              <section
                className="home-entry-tool-section relative w-full max-md:hidden"
                aria-label="常用工具入口"
              >
                <div className="home-entry-tool-viewport w-full">
                  <div className="home-entry-tool-list flex w-full items-start px-4 justify-between">
                    {TOOLS.map((t) => (
                      <Link
                        key={t.key}
                        href={t.href}
                        className="home-entry-tool-card group flex w-[88px] shrink-0 flex-col items-center gap-4 rounded-[16px] text-center disabled:pointer-events-none disabled:opacity-50"
                      >
                        <span className="home-entry-tool-icon-box inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl border border-[color:var(--color-home-tool-icon-border)] bg-[var(--color-home-tool-icon-bg)] text-[color:var(--color-home-tool-icon-fg)] [box-shadow:var(--shadow-home-tool-icon)] transition-colors group-hover:bg-[var(--color-home-tool-icon-hover-bg)]">
                          {t.icon}
                        </span>
                        <span className="home-entry-tool-name block w-full truncate text-sm font-base leading-5 text-[color:var(--color-home-tool-name)]">
                          {t.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* —— 你想做什么？ —— */}
            <section
            className="home-entry-scene-section relative z-[1] w-full min-w-0 max-w-[1744px] max-3xl:max-w-none max-md:hidden"
            aria-label="创作场景入口"
          >
            <header className="home-entry-scene-header mb-4 flex items-center justify-between gap-4">
              <div className="home-entry-scene-heading flex min-w-0 items-baseline gap-2">
                <h2 className="home-entry-scene-title text-xl font-semibold text-foreground">
                  你想做什么？
                </h2>
                <p className="home-entry-scene-desc text-xs text-[var(--color-home-entry-description)]">
                  选择创作目标快速开始
                </p>
              </div>
            </header>
            <div className="home-entry-scene-viewport-shell group/scene relative w-full min-w-0">
              <div ref={sceneRef}
              className="home-entry-scene-perspective w-full overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-[18px] pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="home-entry-scene-list flex w-full gap-6">
                  {SCENES.map((s) => (
                    <Link
                      key={s.key}
                      href={s.href}
                      className="home-entry-scene-card group flex w-[calc(22.222222%_-_21.333333px)] min-w-[240px] shrink-0 flex-col overflow-hidden rounded-[12px] border border-[var(--color-home-scene-card-border)] bg-[var(--color-home-scene-card-bg)] text-left [box-shadow:var(--shadow-home-scene-card)]"
                    >
                      <span className="home-entry-scene-image-box relative block aspect-video w-full overflow-hidden bg-[var(--color-home-scene-media-bg)]">
                        <span className="home-creative-entry-scene-cover relative block h-full w-full overflow-hidden transition-transform duration-500 ease-out group-hover:scale-[1.02]">
                          {s.media === "video" && !!s.video ? (
                            <div className="interactive-video-cover relative h-full w-full overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={s.cover}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="interactive-video-cover-poster absolute inset-0 h-full w-full object-cover"
                              />
                              <video
                                src={s.video}
                                loop
                                playsInline
                                preload="auto"
                                aria-hidden
                                className="interactive-video-cover-player pointer-events-none absolute inset-0 h-full w-full object-cover invisible"
                              />
                            </div>
                          ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={s.cover}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="home-creative-entry-scene-cover-image h-full w-full object-cover"
                            />
                          )}
                        </span>
                        {s.media === "video" ? (
                          <span
                            className="home-entry-scene-play-badge pointer-events-none absolute right-2 top-2 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/30 text-white/60 transition-opacity duration-150 group-hover:opacity-0"
                            aria-hidden="true"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              aria-hidden
                              data-slot="icon"
                              className="home-entry-scene-play-badge-icon h-3 w-3 translate-x-px"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        ) : null}
                      </span>
                      <span className="home-entry-scene-content relative flex h-10 w-full items-center gap-2 px-4">
                        {s.media === "video" ? VIDEO_MEDIA_ICON : IMAGE_MEDIA_ICON}
                        <span className="home-entry-scene-text flex w-full min-w-0 items-center gap-4">
                          <span className="home-entry-scene-title shrink-0 text-md font-[12px] font-medium text-[var(--color-home-entry-text)]">
                            {s.title}
                          </span>
                          <span className="home-entry-scene-description min-w-0 flex-1 overflow-hidden whitespace-nowrap text-[11px] text-muted">
                            {s.desc}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className="home-entry-scene-action-mask pointer-events-none absolute inset-y-0 right-8 z-10 w-5 bg-[linear-gradient(to_right,transparent_0px,var(--color-home-scene-card-bg)_100%)] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100"
                        />
                        <span className="home-entry-scene-action absolute inset-y-0 right-4 z-20 my-auto inline-flex h-8 w-5 translate-x-2 items-center justify-center pl-1 bg-[var(--color-home-scene-card-bg)] text-foreground opacity-0 transition-[transform,opacity] duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            aria-hidden
                            data-slot="icon"
                            className="home-entry-scene-action-icon h-4 w-4 stroke-[1.8]"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                            />
                          </svg>
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
              {/* —— 左右滚动手柄：按可滚方向常显，滚到头自动隐藏 —— */}
              <div className={`home-entry-scene-handle-left absolute inset-y-0 left-0 z-10 w-[60px] ${sceneEnds.left ? "" : "pointer-events-none"}`}>
                <span className={`home-entry-scene-mask-left absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent transition-opacity duration-200 ${sceneEnds.left ? "opacity-100" : "opacity-0"}`} />
                <button
                  type="button"
                  aria-label="向左滑动场景"
                  aria-hidden={!sceneEnds.left}
                  tabIndex={sceneEnds.left ? 0 : -1}
                  onClick={() => scrollScene(-1)}
                  className={`home-entry-scene-handle-left-action group/scene-handle absolute inset-0 z-[1] flex items-center justify-center transition-[visibility,opacity] duration-200 ${sceneEnds.left ? "visible opacity-100" : "invisible pointer-events-none opacity-0"}`}
                >
                  <span className="home-entry-scene-handle-left-visual inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface/70 text-[#444] shadow-sm backdrop-blur-sm transition-[color,background-color] duration-200 group-hover/scene-handle:bg-surface/90 group-hover/scene-handle:text-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      aria-hidden
                      data-slot="icon"
                      className="home-entry-scene-handle-left-icon h-4 w-4 stroke-[1.8]"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5 6 12l7.5 7.5M6 12h15"
                      />
                    </svg>
                  </span>
                </button>
              </div>
              <div className={`home-entry-scene-handle-right absolute inset-y-0 right-0 z-10 w-[60px] ${sceneEnds.right ? "" : "pointer-events-none"}`}>
                <span className={`home-entry-scene-mask-right absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent transition-opacity duration-200 ${sceneEnds.right ? "opacity-100" : "opacity-0"}`} />
                <button
                  type="button"
                  aria-label="向右滑动场景"
                  aria-hidden={!sceneEnds.right}
                  tabIndex={sceneEnds.right ? 0 : -1}
                  onClick={() => scrollScene(1)}
                  className={`home-entry-scene-handle-right-action group/scene-handle absolute inset-0 z-[1] flex items-center justify-center transition-[visibility,opacity] duration-200 ${sceneEnds.right ? "visible opacity-100" : "invisible pointer-events-none opacity-0"} group-hover/scene:visible group-hover/scene:opacity-100`}
                >
                  <span className="home-entry-scene-handle-right-visual inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface/70 text-[#444] shadow-sm backdrop-blur-sm transition-[color,background-color] duration-200 group-hover/scene-handle:bg-surface/90 group-hover/scene-handle:text-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      aria-hidden
                      data-slot="icon"
                      className="home-entry-scene-handle-right-icon h-4 w-4 stroke-[1.8]"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.5 4.5 18 12l-7.5 7.5M18 12H3"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* —— 移动端入口（max-md 显示） —— */}
          <div className="home-entry-mobile max-md:gap-8 hidden w-full min-w-0 flex-col gap-10 max-md:flex">
            <section className="home-entry-mobile-scene-section min-w-0" aria-label="创作场景入口">
              <header className="home-entry-mobile-scene-header mb-3">
                <h2 className="home-entry-mobile-scene-title text-lg font-semibold text-foreground max-sm:text-sm">
                  你想做什么？
                </h2>
              </header>
              <div className="home-entry-mobile-scene-list flex w-full gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {SCENES.map((s) => (
                  <Link
                    key={s.key}
                    href={s.href}
                    className="home-entry-mobile-scene-card group flex w-[82%] min-w-[240px] max-w-[320px] shrink-0 flex-col overflow-hidden rounded-[18px] border border-[var(--color-home-scene-card-border)] bg-[var(--color-home-mobile-scene-card-bg)] text-left [box-shadow:var(--shadow-home-scene-card)]"
                  >
                    <span className="home-entry-mobile-scene-image-box relative block aspect-[5/2] w-full overflow-hidden bg-[var(--color-home-mobile-scene-media-bg)]">
                      <span className="home-creative-entry-scene-cover relative block h-full w-full overflow-hidden transition-transform duration-500 ease-out group-hover:scale-[1.02]">
                        {s.media === "video" && !!s.video ? (
                          <div className="interactive-video-cover relative h-full w-full overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={s.cover}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="interactive-video-cover-poster absolute inset-0 h-full w-full object-cover"
                            />
                            <video
                              src={s.video}
                              loop
                              playsInline
                              preload="auto"
                              aria-hidden
                              className="interactive-video-cover-player pointer-events-none absolute inset-0 h-full w-full object-cover invisible"
                            />
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={s.cover}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="home-creative-entry-scene-cover-image h-full w-full object-cover"
                          />
                        )}
                      </span>
                      {s.media === "video" ? (
                        <span
                          className="home-entry-scene-play-badge pointer-events-none absolute right-2 top-2 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/30 text-white/60 transition-opacity duration-150 group-hover:opacity-0"
                          aria-hidden="true"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden
                            data-slot="icon"
                            className="home-entry-scene-play-badge-icon h-3 w-3 translate-x-px"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      ) : null}
                    </span>
                    <span className="home-entry-mobile-scene-content flex h-14 w-full items-center justify-between gap-3 px-4 text-foreground">
                      <span className="home-entry-mobile-scene-summary flex min-w-0 flex-1 items-center gap-2">
                        {s.media === "video" ? MOBILE_VIDEO_MEDIA_ICON : MOBILE_IMAGE_MEDIA_ICON}
                        <span className="home-entry-mobile-scene-text flex min-w-0 items-baseline gap-1.5">
                          <span className="home-entry-mobile-scene-name shrink-0 text-base font-semibold leading-5">
                            {s.title}
                          </span>
                          <span className="home-entry-mobile-scene-description min-w-0 truncate text-[11px] leading-4 text-muted">
                            {s.desc}
                          </span>
                        </span>
                      </span>
                      <span className="home-entry-mobile-scene-action inline-flex h-8 w-8 shrink-0 translate-y-2 items-center justify-center text-foreground opacity-0 transition-[transform,opacity] duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          aria-hidden
                          data-slot="icon"
                          className="home-entry-mobile-scene-action-icon h-4 w-4 stroke-[1.8]"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                          />
                        </svg>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="home-entry-mobile-tool-section min-w-0" aria-label="常用工具入口">
              <header className="home-entry-mobile-tool-header mb-3">
                <h2 className="home-entry-mobile-tool-title text-lg font-semibold text-foreground max-sm:text-sm">
                  常用工具
                </h2>
              </header>
              <div className="home-entry-mobile-tool-viewport w-full overflow-x-auto overflow-y-visible overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="home-entry-mobile-tool-list flex w-max gap-3">
                  {TOOLS.map((t) => (
                    <Link
                      key={t.key}
                      href={t.href}
                      className="home-entry-tool-card group flex w-[88px] shrink-0 flex-col items-center gap-4 rounded-[16px] text-center disabled:pointer-events-none disabled:opacity-50"
                    >
                      <span className="home-entry-tool-icon-box inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl border border-[color:var(--color-home-tool-icon-border)] bg-[var(--color-home-tool-icon-bg)] text-[color:var(--color-home-tool-icon-fg)] [box-shadow:var(--shadow-home-tool-icon)] transition-colors group-hover:bg-[var(--color-home-tool-icon-hover-bg)]">
                        {t.icon}
                      </span>
                      <span className="home-entry-tool-name block w-full truncate text-sm font-base leading-5 text-[color:var(--color-home-tool-name)]">
                        {t.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </div>
          </div>

          {/* —— 发现 —— */}
          <section
            className="home-discover-section w-full max-w-[1744px] max-3xl:max-w-none"
            aria-label="发现"
          >
            <div className="home-discover-content w-full">
              <header className="home-discover-header sticky top-0 z-50 -mx-[60px] bg-background pb-3 pl-[60px] pt-5 pr-[max(60px,calc(var(--home-actions-width,0px)+36px))] max-sm:-mx-6 max-sm:pl-6 max-sm:pr-[max(24px,calc(var(--home-actions-width,0px)+28px))]">
                <span className="home-discover-scroll-corner-left pointer-events-none absolute left-[60px] top-full size-4 max-sm:left-6 bg-[radial-gradient(circle_at_bottom_right,transparent_16px,var(--color-bg)_16px)]" />
                <span className="home-discover-scroll-corner-right pointer-events-none absolute right-[60px] top-full size-4 max-sm:right-6 bg-[radial-gradient(circle_at_bottom_left,transparent_16px,var(--color-bg)_16px)]" />
                <div
                  role="tablist"
                  aria-label="发现内容类型"
                  className="home-discover-filters flex h-9 min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {DISCOVER_TABS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={tab === t}
                      onClick={() => setTab(t)}
                      className={cn(
                        "home-discover-filter-tab inline-flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-[14px] font-medium leading-none transition-colors",
                        tab === t
                          ? "bg-[#EBEBEB] text-[#1a1a1a]"
                          : "bg-transparent text-[#999999] hover:text-[#666666]"
                      )}
                    >
                      <span>{t}</span>
                    </button>
                  ))}
                </div>
              </header>
              <DiscoverWaterfall items={visible} />
            </div>
          </section>

          {/* —— 页脚 —— */}
          <p className="site-legal-footer-bar m-0 flex flex-wrap items-center justify-center gap-y-0.5 text-[12px] leading-relaxed text-[#999999] transition-colors home-copyright mt-10 max-md:mt-8 shrink-0">
            <span className="site-legal-footer-copyright">
              Copyright <span aria-hidden="true">©</span> 蓝色矩阵
            </span>
            <span aria-hidden="true" className="select-none px-1.5 text-[#cccccc]">
              |
            </span>
            <span className="site-legal-footer-icp">
              网站备案号：
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] leading-relaxed text-[#999999] transition-colors hover:text-[#666666]"
              >
                浙ICP备2024085888号-4
              </a>
            </span>
            <span aria-hidden="true" className="select-none px-1.5 text-[#cccccc]">
              |
            </span>
            <button
              type="button"
              onClick={() => push({ tone: "neutral", title: "联系我们（演示）", description: "商务合作请发送邮件至 hello@example.com" })}
              className="site-legal-footer-contact text-[12px] leading-relaxed text-[#999999] transition-colors hover:text-[#666666] cursor-pointer border-0 bg-transparent p-0"
            >
              联系我们
            </button>
          </p>
        </div>
        {/* 原站：.home-account-actions 是 .page-home 的直接子元素（不在 .home-scroll-content 内） */}
        <div className="home-account-actions fixed right-[calc(var(--home-decoration-width,0px)+1.5rem)] top-[calc(var(--global-operation-notice-height,0px)+20px)] z-[60] flex flex-row items-center gap-3 transition-[right] duration-[var(--home-decoration-duration,0ms)] motion-reduce:transition-none max-sm:right-[calc(var(--home-decoration-width,0px)+1rem)]" />
        </div>
        <div
          className="home-decoration-sidebar-shell relative shrink-0 transition-[width] duration-[250ms] ease-out motion-reduce:transition-none"
          style={{ width: 0 }}
        />
      </div>
      {loginOpen ? <LoginModal onClose={() => setLoginOpen(false)} /> : null}
    </WorkspaceShell>
  );
}
