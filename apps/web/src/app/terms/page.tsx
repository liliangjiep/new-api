import Link from "next/link";
export const metadata = { title: "用户服务协议" };
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">用户服务协议</h1>
      <p className="mt-2 text-xs text-fg-subtle">前端演示版本 · 正式法务文本以后端提供为准</p>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-fg-muted">
        <p>1. 服务内容：new-ai 提供 AI 创作工具，包括图片 / 视频 / 数字人等能力，按积分结算。</p>
        <p>2. 账号与积分：积分自到账起 2 年有效，不可提现 / 转赠；冻结与退回以流水为准。</p>
        <p>3. 内容合规：上传素材须拥有合法权利，涉侵权 / 敏感内容将进入人工复核并可能驳回。</p>
        <p>4. 免责：演示环境输出仅供预览，生产环境以正式合同与 SLA 为准。</p>
      </div>
      <Link href="/" className="mt-8 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent">回到首页</Link>
    </main>
  );
}
