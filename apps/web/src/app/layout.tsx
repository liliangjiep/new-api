import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastHost } from "@/components/features/ToastHost";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "xin.ai · AI 视频与商品图生产平台",
    template: "%s · xin.ai",
  },
  description:
    "上传素材 → 选择工作流 → 生成 → 下载 → 投放的完整闭环。13 个能力域，覆盖图片、视频、数字人与电商品牌通用链路。",
  keywords: ["AI 视频生成", "AI 图片生成", "数字人", "商品图", "视频创作"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#111317" },
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" data-theme="dawn" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <QueryProvider>
            <ToastHost>{children}</ToastHost>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
