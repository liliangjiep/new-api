/**
 * 原站工作台全局导航配置（new-ai 实测，2026-10-30）
 *
 * 实测：所有页面（首页 / 工具箱 / 画布 / 资产 / 账户 / 技能页 / 对话页）
 * 左侧图标轨 hover 后都会弹出同样 3 块浮动导航，顺序固定：
 *   1. Agent      —— 新任务 + 最近（对话列表）
 *   2. AI 视频    —— 技能分类（电商带货 / 同城到店 / 品牌广告 / 剧情短片）
 *   3. AI 图片    —— 技能分类（人物 / 商品 / 场景 / 增强）
 *
 * 另外，移动端底部栏在所有页面常驻（首页 / AI视频 / AI图片 / 资产 / 我的）。
 */

import { IMAGE_NAV, VIDEO_NAV, type NavSection } from "@/lib/skills";

export type { NavSection };

export interface FloatingNavConfig {
  id: string;
  title: string;
  sections: NavSection[];
  variant?: "skills" | "agent";
}

/* ================================================================== *
 * 52px 图标轨（实测逐字复刻：6 个入口，顺序固定）
 * ================================================================== */
export const RAIL_ITEMS = [
  {
    href: "/",
    label: "首页",
    panel: null,
    svg: (
      <>
        <path d="M3.5 10.5a2 2 0 0 1 .8-1.6l6.5-4.875a2 2 0 0 1 2.4 0L19.7 8.9a2 2 0 0 1 .8 1.6V18a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18Z" fill="currentColor" />
        <path d="M12 14v4" stroke="var(--color-bg)" />
      </>
    ),
  },
  {
    href: "/agent-cloud",
    label: "Agent",
    panel: "agentCloud",
    svg: (
      <>
        <path d="M18 9.5h.5A2.5 2.5 0 0 1 21 12v8.5l-2.7-2H11a2 2 0 0 1-2-2" />
        <path d="M5.5 4h10A2.5 2.5 0 0 1 18 6.5v7a2.5 2.5 0 0 1-2.5 2.5H7l-4 3V6.5A2.5 2.5 0 0 1 5.5 4Z" fill="none" />
        <path d="M8 8v3m5-3v3" stroke="currentColor" />
      </>
    ),
  },
  {
    href: "/toolbox/video-generation",
    label: "AI视频",
    panel: "video",
    svg: (
      <>
        <path d="m16.5 10 4-3a.5.5 0 0 1 .8.4v9.2a.5.5 0 0 1-.8.4l-4-3" fill="none" />
        <rect x="2.5" y="5.5" width="14" height="13" rx="2.5" fill="none" />
        <rect x="6" y="9" width="6" height="3" rx="1.5" stroke="currentColor" />
      </>
    ),
  },
  {
    href: "/toolbox/image-generation",
    label: "AI图片",
    panel: "image",
    svg: (
      <>
        <rect x="3.5" y="5" width="17" height="14" rx="2.5" fill="none" />
        <circle cx="9" cy="10" r="1.5" stroke="currentColor" />
        <path d="m8 19 6.5-6.5a1.5 1.5 0 0 1 1.8-.25l4.2 2.25" stroke="currentColor" />
      </>
    ),
  },
  {
    href: "/canvas",
    label: "画布",
    panel: null,
    svg: (
      <>
        <path d="M7 3.5v17M17 3.5v7M3 7h18M3 16h8" />
        <path d="M17 13c.5 2 1.5 3 3.5 3.5-2 .5-3 1.5-3.5 3.5-.5-2-1.5-3-3.5-3.5 2-.5 3-1.5 3.5-3.5Z" fill="none" />
      </>
    ),
  },
] as const;

export const ASSETS_ICON = (
  <>
    <path d="M10.5 6h7a2 2 0 0 1 2 2v.5" />
    <path d="M3.5 7A2.5 2.5 0 0 1 6 4.5h2a2 2 0 0 1 1.4.6l3 2.8a2 2 0 0 0 1.4.6H18a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17Z" fill="none" />
    <path d="M7 16h4.5" stroke="currentColor" />
  </>
);

/** 与图标轨 hover 顺序一一对应 */
export const FLOATING_NAV: FloatingNavConfig[] = [
  { id: "agentCloud", title: "Agent", sections: [], variant: "agent" },
  { id: "video", title: "AI 视频", sections: VIDEO_NAV },
  { id: "image", title: "AI 图片", sections: IMAGE_NAV },
];
