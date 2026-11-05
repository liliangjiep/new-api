import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastHost } from "@/components/features/ToastHost";
import "./globals.css";

/**
 * 原站 susu.da-ai.cc 实测（2026-10-30）：
 *   <title>老板娘苏苏AI，懂制造业的AI创作工具</title>
 *   <html lang="zh-CN" data-scroll-behavior="smooth" data-color-mode="light" data-site-tone="light">
 *   路由标题：/toolbox → AI 工具箱；/toolbox/image-generation → AI 图片；
 *            /toolbox/video-generation → AI 视频；/toolbox/ecommerce-image-set → AI 商详套图；
 *            /toolbox/depth-video-clone → 爆款复刻；/toolbox/digital-human → 数字人；
 *            /toolbox/hot-video-remix → 爆款裂变；/toolbox/video-quality-enhance → 视频画质增强；
 *            /toolbox/video-subtitle-erase → 视频字幕擦除；/toolbox/video-watermark-remove → 视频去水印；
 *            /canvas → 画布；/assets → 资产库；/account → 我的积分；/agent-cloud → Agent
 */
export const metadata: Metadata = {
  // ⚠️ 这里**不能**写 title：WorkspaceShell（客户端组件）会按路由渲染 <title>，
  // React 19 会把它 hoist 到 <head>；若 layout 再输出一个 title，
  // SSR 结果就是 2 个 <title>（实测 ours=2 / orig=1），
  // 且浏览器标签页会显示 layout 的那个（错误的名字）。
  // 路由标题统一由 lib/page-titles.ts + WorkspaceShell 提供；
  // 未使用 WorkspaceShell 的页面（如 404）各自 export metadata.title。
  description:
    "老板娘苏苏AI，懂制造业的AI创作工具。上传素材 → 选择工作流 → 生成 → 下载 → 投放的完整闭环。",
  keywords: ["AI 视频生成", "AI 图片生成", "数字人", "商品图", "视频创作"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#fcfcfc",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      data-theme="susu"
      data-scroll-behavior="smooth"
      data-color-mode="light"
      data-site-tone="light"
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <QueryProvider>
            <ToastHost>{children}</ToastHost>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
