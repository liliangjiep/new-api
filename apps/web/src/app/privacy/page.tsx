import Link from "next/link";
export const metadata = { title: "隐私政策" };
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">隐私政策</h1>
      <p className="mt-2 text-xs text-fg-subtle">前端演示版本 · 正式文本以后端提供为准</p>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-fg-muted">
        <p>1. 我们仅收集登录必需的手机号 / 邮箱与任务所需的生成素材，用于提供服务与对账。</p>
        <p>2. 素材默认仅自己可见；设为公共素材需单独授权。</p>
        <p>3. 日志保留 180 天用于安全审计，可在账户页申请注销与删除。</p>
      </div>
      <Link href="/" className="mt-8 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent">回到首页</Link>
    </main>
  );
}
