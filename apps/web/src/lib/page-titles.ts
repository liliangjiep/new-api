/**
 * 原站 new-ai 各路由的 <title>（2026-10-30 实测）：
 *   /                                  → new-ai，懂制造业的AI创作工具
 *   /toolbox                           → AI 工具箱
 *   /toolbox/image-generation           → AI 图片
 *   /toolbox/video-generation           → AI 视频
 *   /toolbox/ecommerce-image-set        → AI 商详套图
 *   /toolbox/depth-video-clone          → 爆款复刻
 *   /toolbox/digital-human              → 数字人
 *   /toolbox/hot-video-remix            → 爆款裂变
 *   /toolbox/video-quality-enhance      → 视频画质增强
 *   /toolbox/video-subtitle-erase       → 视频字幕擦除
 *   /toolbox/video-watermark-remove     → 视频去水印
 *   /canvas                             → 画布
 *   /assets                             → 资产库
 *   /account                            → 我的积分
 *   /agent-cloud                        → Agent
 *
 * 注意：/toolbox/video-creator、/toolbox/editor、/toolbox/video-remix-viral、
 *      /toolbox/stone-effect、/toolbox/stone-materials 在原站是「未找到」（404）。
 */
export const PAGE_TITLES: Record<string, string> = {
  "/": "new-ai，懂制造业的AI创作工具",
  "/toolbox": "AI 工具箱",
  "/toolbox/image-generation": "AI 图片",
  "/toolbox/video-generation": "AI 视频",
  "/toolbox/ecommerce-image-set": "AI 商详套图",
  "/toolbox/depth-video-clone": "爆款复刻",
  "/toolbox/digital-human": "数字人",
  "/toolbox/hot-video-remix": "爆款裂变",
  "/toolbox/video-quality-enhance": "视频画质增强",
  "/toolbox/video-subtitle-erase": "视频字幕擦除",
  "/toolbox/video-watermark-remove": "视频去水印",
  "/canvas": "画布",
  "/assets": "资产库",
  "/account": "我的积分",
  "/agent-cloud": "Agent",
};

/** 石材行业新增能力（不在原站，标题按我们自己的产品命名） */
export const EXTRA_PAGE_TITLES: Record<string, string> = {
  "/toolbox/stone-effect": "石材效果图",
  "/toolbox/stone-materials": "石材素材库",
  "/toolbox/factory-video": "工厂视频",
};

export function titleForPath(pathname: string): string | undefined {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (EXTRA_PAGE_TITLES[pathname]) return EXTRA_PAGE_TITLES[pathname];
  return undefined;
}
