import type { Metadata } from "next";
import Link from "next/link";

/**
 * 原站 new-api 404 页（实测 1:1，2026-10-31）
 *   <title>未找到</title>
 *   <section class="relative z-[1] mx-auto w-full max-w-shell bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6 flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
 *     <p class="eyebrow">404</p>
 *     <h1 class="text-3xl font-semibold text-foreground sm:text-4xl">页面未找到</h1>
 *     <p class="mt-4 max-w-md text-muted">请检查链接，或返回首页。</p>
 *     <a class="mt-10 rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-on-accent transition-colors " href="/">回到首页</a>
 *   </section>
 */
export const metadata: Metadata = {
  title: "未找到",
};

export default function NotFound() {
  return (
    <section className="relative z-[1] mx-auto w-full max-w-shell bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6 flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">页面未找到</h1>
      <p className="mt-4 max-w-md text-muted">请检查链接，或返回首页。</p>
      <Link
        className="mt-10 rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-on-accent transition-colors "
        href="/"
      >
        回到首页
      </Link>
    </section>
  );
}
