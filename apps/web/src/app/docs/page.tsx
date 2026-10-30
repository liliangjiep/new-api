"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/layout/TopNav";
import { Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/primitives";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui/surfaces";
import { useToast } from "@/components/features/ToastHost";
import { Search, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

// M1-28c 文档页：客户使用指南 —— 对齐逆向 §2.3 原站 6 大场景 + 石材新增，只讲操作不讲通道
// 行内注释1：左侧锚点目录 + 右侧内容，搜索过滤章节
const SECTIONS = [
  { id: "quickstart", title: "快速开始", body: "注册 → 充值体验包 → 进工具箱选工作流 → 报价确认 → 生成 → 下载。全链路积分计费，失败全额退回。", code: "1. 注册并登录\n2. 充值体验包（99 元 / 100 积分）\n3. 工具箱选「商详套图」→ 上传 1 张商品图\n4. 点「重新报价」确认 45 积分\n5. 生成 → 任务中心查看 → 下载" },
  { id: "clone", title: "爆款复刻", body: "贴上爆款视频链接或上传原片，系统拆解动作轮廓与分镜，替换人物与商品后重新生成。走「深度复刻」工作流，报价按视频档位（时长×分辨率×模型折扣）计算。", code: "工具箱 → 爆款复刻\n1. 粘贴爆款链接 / 上传原片\n2. 选替换人物与商品图\n3. 报价确认 → 生成" },
  { id: "ecommerce-set", title: "商详套图", body: "上传 1 张商品图，自动做卖点分析后批量出 6 张套图（主图/细节/场景/对比/规格/包装），支持单行重生成。套图 45 积分 / 6 张，单张重生成 8 积分。", code: "工具箱 → 商详套图\n1. 上传商品图\n2. 点「卖点分析」\n3. 报价确认 → 批量生成" },
  { id: "seller", title: "电商带货", body: "口播带货 / 促销转化 / 场景种草 / 痛点解决 / 功能演示 5 套技能包。上传商品图与卖点文案，选技能包后按 15 秒 / 30 秒出成片。", code: "工具箱 → 视频创意 → 电商类\n1. 选技能包（如口播带货）\n2. 上传商品图 + 写卖点\n3. 报价确认 → 生成" },
  { id: "local", title: "同城到店", body: "门店发现 / 到店实录 / 招牌体验 / 同城团购 4 套技能包。上传门店实拍，按探店动线（门店→后厨→仓储）出片，挂团购转化口令。", code: "工具箱 → 视频创意 → 本地门店类\n1. 选技能包（如到店实录）\n2. 上传门店实拍\n3. 报价确认 → 生成" },
  { id: "brand", title: "品牌广告", body: "品牌主张 / 品牌故事 / 生活方式 / 创意概念 4 套 TVC 技能包。适合门店、展会、招商，支持落版语自定义。", code: "工具箱 → 视频创意 → 品牌 TVC 类\n1. 选技能包（如品牌故事）\n2. 上传门店/产品素材\n3. 报价确认 → 生成" },
  { id: "drama", title: "剧情短片", body: "对话 / 反转 / 悬念 / 情绪 / 产品植入 5 套短剧技能包。选反转点与人物数，剧情里自然带出产品。", code: "工具箱 → 视频创意 → 短剧类\n1. 选技能包（如反转短剧）\n2. 写一句话剧情要求\n3. 报价确认 → 生成" },
  { id: "stone", title: "石材效果图（新增）", body: "本店新增：上传石材样板图，选空间模板（大堂/宴会厅/前台/电梯厅/客房/庭院/会所/展厅等 14 类），生成 2K 效果图。单张 8 积分，含 2 次重试。", code: "工具箱 → 石材效果图\n1. 上传石材样板图\n2. 选空间模板 + 风格\n3. 报价确认 → 生成" },
  { id: "human", title: "数字人口播", body: "上传形象照 → 准备音频（生成/录音/上传）→ 确认素材 → 开始生成。图片口播 60 秒内，支持讲美妆产品介绍与新品宣发话术。", code: "工具箱 → 数字人 → 图片口播\n1. 上传形象照\n2. 准备音频\n3. 勾选授权 → 报价确认 → 生成" },
  { id: "billing", title: "计费说明", body: "1 积分锚定 ¥1。生成前先报价，你确认后才冻结积分，成功结算、失败全额退回。余额不足会引导充值。", code: "下单前必看：报价 → 确认 → 冻结 → 成功结算 / 失败退回" },
  { id: "assets", title: "素材与任务", body: "图片/视频/音频统一进资产库，分组管理、跨任务引用。任务提交后在「任务中心」看进度，失败任务显示已退回。", code: "资产库：分组 / 收藏 / 引用\n任务中心：排队中 / 生成中 / 已完成 / 已失败" },
];

const FAQ = [
  { q: "积分不足怎么办？", a: "去账户中心充值，充值后回到工具箱重新报价即可。" },
  { q: "生成失败扣费吗？", a: "不扣。失败任务积分全额退回，任务中心会显示“已退回”。" },
  { q: "报价多久有效？", a: "超过 15 分钟需要重新点一下报价，再确认生成。" },
  { q: "数字人提示缺授权？", a: "勾选形象与声音授权后重新提交，平台会留存授权记录。" },
  { q: "想给石材出效果图？", a: "走「石材效果图（新增）」：传样板图 → 选空间模板 → 报价确认 → 生成。" },
];

export default function DocsPage() {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [active, setActive] = useState("quickstart");

  // 行内注释2：搜索同时过滤指南章节与常见问题
  const secs = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return SECTIONS;
    return SECTIONS.filter((x) => `${x.title}${x.body}${x.code}`.toLowerCase().includes(s));
  }, [q]);
  const faqs = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return FAQ;
    return FAQ.filter((f) => `${f.q}${f.a}`.toLowerCase().includes(s));
  }, [q]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* noop */ }
    push({ tone: "success", title: "已复制", description: "步骤已复制到剪贴板" });
  };

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">使用指南</h1>
        <p className="mt-2 text-sm text-fg-muted">爆款复刻 / 商详套图 / 带货 / 到店 / 广告 / 剧情 + 石材新增，跟着点就能跑</p>
        <div className="relative mt-6 max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索指南：如 复刻 / 商详 / 带货 / 到店" aria-label="搜索使用指南" className="pl-8" />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="指南目录" className="hidden lg:block">
            <div className="sticky top-20 space-y-0.5">
              {SECTIONS.map((s) => (
                <a key={s.id} href={`#${s.id}`} onClick={() => setActive(s.id)} className={cn("block rounded-xs px-2.5 py-1.5 text-sm", active === s.id ? "bg-surface-3 text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg")}>{s.title}</a>
              ))}
              <a href="#faq" className="block rounded-xs px-2.5 py-1.5 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg">常见问题</a>
            </div>
          </nav>
          <div className="min-w-0 space-y-4">
            {secs.length === 0 && <Card><CardBody><p className="text-sm text-fg-muted">没有匹配的章节，换个关键词试试。</p></CardBody></Card>}
            {secs.map((s) => (
              <Card key={s.id} id={s.id}>
                <CardHeader><CardTitle>{s.title}</CardTitle><Badge tone="neutral">{s.id}</Badge></CardHeader>
                <CardBody className="space-y-3">
                  <p className="text-sm leading-relaxed text-fg-muted">{s.body}</p>
                  <div className="overflow-hidden rounded-sm border border-line bg-surface-2">
                    <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
                      <span className="tabular text-[11px] text-fg-subtle">操作步骤</span>
                      <Button variant="ghost" size="sm" onClick={() => copy(s.code)}><Copy className="size-3" aria-hidden />复制</Button>
                    </div>
                    <pre className="overflow-x-auto p-3 text-xs leading-relaxed text-fg"><code>{s.code}</code></pre>
                  </div>
                </CardBody>
              </Card>
            ))}
            <Card id="faq">
              <CardHeader><CardTitle>常见问题</CardTitle><Badge tone="neutral">{faqs.length} 条</Badge></CardHeader>
              <CardBody className="space-y-3">
                {faqs.map((f) => (
                  <div key={f.q} className="rounded-sm border border-line bg-surface-2 p-3">
                    <p className="text-sm font-medium text-fg">{f.q}</p>
                    <p className="mt-1 text-sm leading-relaxed text-fg-muted">{f.a}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
            <p className="text-sm text-fg-muted">需要 API Key？去 <Link href="/account" className="text-accent underline-offset-4 hover:underline">账户中心 → API 密钥</Link> 创建。</p>
          </div>
        </div>
      </main>
    </div>
  );
}
