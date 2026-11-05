"use client";

import Link from "next/link";
import { WorkspaceShell } from "@/components/features/WorkspaceShell";

/*
 * 原站 /toolbox（实测 1:1，2026-10-30）
 *
 *  main.workspace-main-content
 *   └─ div.page-toolbox  flex h-full min-h-0 min-w-0 flex-1 flex-col bg-[#f4f4f4]
 *      └─ section.toolbox-content  relative z-[1] box-border h-full w-full flex-1 p-10
 *         └─ div.toolbox-sections  flex flex-col gap-6 sm:gap-8
 *            ├─ section.toolbox-section
 *            │   ├─ h3.toolbox-section-title  mb-3 text-[16px] font-medium leading-none text-black
 *            │   └─ ul.toolbox-section-list  grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-2
 *            │       └─ li.toolbox-card-item
 *            │           └─ a.toolbox-card  aspect-[81/32] / aspect-[20/9] rounded-[16px]
 *            │               ├─ 背景图（background-size / position）
 *            │               └─ div.toolbox-card-copy  absolute inset-y-0 left-0 z-[1]
 *            │                   ├─ h2.toolbox-card-title  text-[22px] font-medium leading-none text-[#111]
 *            │                   ├─ p.toolbox-card-desc   text-[15px] leading-[2] text-[#555] mt-4
 *            │                   └─ span.toolbox-card-action  size-12 圆形箭头 mt-auto
 *            └─ （石材行业：我们的新增分组，样式与原站一致）
 *
 * 分组列数：AI创作 = lg:grid-cols-2，视频处理 = xl:grid-cols-4。
 */

type Card = {
  href: string;
  title: string;
  desc: string;
  cover: string;
  /** 背景图定位（cover / 50% auto right 20px center / 58% auto right bottom） */
  bgSize?: string;
  bgPosition?: string;
};

const SECTIONS: { title: string; cols: string; cards: Card[] }[] = [
  {
    title: "AI创作",
    cols: "lg:grid-cols-2",
    cards: [
      {
        href: "/toolbox/ecommerce-image-set",
        title: "商详套图",
        desc: "上传商品图，自动分析卖点并批量生成详情套图。",
        cover: "/images/toolbox/ai-product-image.jpg",
      },
      {
        href: "/toolbox/digital-human",
        title: "数字人",
        desc: "上传形象和音频，生成口型同步的口播视频。",
        cover: "/images/toolbox/digital-human.jpg",
      },
    ],
  },
  {
    title: "视频处理",
    cols: "xl:grid-cols-4",
    cards: [
      {
        href: "/toolbox/depth-video-clone",
        title: "爆款复刻",
        desc: "参考爆款视频，轻松创作专属爆款",
        cover: "/images/toolbox/ai-video.jpg",
        bgSize: "50% auto",
        bgPosition: "right 20px center",
      },
      {
        href: "/toolbox/hot-video-remix",
        title: "爆款裂变",
        desc: "一键裂变多条爆款视频",
        cover: "/images/toolbox/hot-video-remix.jpg",
        bgSize: "58% auto",
        bgPosition: "right bottom",
      },
      {
        href: "/toolbox/video-subtitle-erase",
        title: "字幕擦除",
        desc: "智能擦除字幕与文字",
        cover: "/images/toolbox/subtitle-erase.jpg",
        bgSize: "50% auto",
        bgPosition: "right 20px center",
      },
      {
        href: "/toolbox/video-watermark-remove",
        title: "去水印",
        desc: "精准去除水印",
        cover: "/images/toolbox/watermark-remove.jpg",
        bgSize: "50% auto",
        bgPosition: "right 20px center",
      },
      {
        href: "/toolbox/video-quality-enhance",
        title: "画质增强",
        desc: "提升清晰度，智能补帧",
        cover: "/images/toolbox/video-enhance.jpg",
        bgSize: "50% auto",
        bgPosition: "right 20px center",
      },
    ],
  },
];

/* 石材行业：我们的新增模块（原站没有），单独分组放在最后 */
const STONE_SECTION = {
  title: "石材行业",
  cols: "lg:grid-cols-2",
  cards: [
    {
      href: "/toolbox/stone-effect",
      title: "石材效果图",
      desc: "传一块板，出整套空间效果图。",
      cover: "/images/bench/scene-entry-stone-effect.jpg",
    },
    {
      href: "/toolbox/factory-video",
      title: "厂家介绍视频",
      desc: "探厂探展厅 + 数字人口播。",
      cover: "/images/bench/scene-entry-factory-video.jpg",
    },
  ] as Card[],
};

export default function ToolboxPage() {
  return (
    <WorkspaceShell>
      <div className="page-toolbox flex h-full min-h-0 min-w-0 flex-1 flex-col bg-[#f4f4f4]">
        <section className="toolbox-content relative z-[1] box-border h-full w-full flex-1 p-10">
          <div className="toolbox-sections flex flex-col gap-6 sm:gap-8">
            {SECTIONS.map((s) => (
              <ToolboxSection key={s.title} {...s} />
            ))}
            <ToolboxSection {...STONE_SECTION} />
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}

function ToolboxSection({
  title,
  cols,
  cards,
}: {
  title: string;
  cols: string;
  cards: Card[];
}) {
  const wide = cols.includes("grid-cols-2");
  return (
    <section className="toolbox-section">
      <h3 className="toolbox-section-title mb-3 text-[16px] font-medium leading-none text-black">
        {title}
      </h3>
      <ul className={`toolbox-section-list grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 ${cols}`}>
        {cards.map((c) => (
          <li key={c.href} className="toolbox-card-item">
            <Link
              href={c.href}
              className={`toolbox-card group relative block w-full overflow-hidden rounded-[16px] border border-transparent bg-surface text-left transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(15,23,42,0.1)] active:translate-y-0 ${
                wide ? "aspect-[81/32] w-full max-sm:aspect-[16/10]" : "aspect-[20/9] w-full"
              } bg-neutral-100`}
              style={{
                backgroundImage: `url(${c.cover})`,
                backgroundSize: c.bgSize ?? "cover",
                backgroundPosition: c.bgPosition ?? "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              <div
                className={`toolbox-card-copy absolute inset-y-0 left-0 z-[1] flex flex-col items-start text-left ${
                  wide
                    ? "max-w-[min(100%,24rem)] pb-10 pl-10 pr-0 pt-10 md:max-w-[62%] lg:max-w-[58%]"
                    : "max-w-[min(58%,14rem)] pb-10 pl-10 pr-0 pt-10"
                }`}
              >
                <h2
                  className={`toolbox-card-title whitespace-nowrap font-medium leading-none text-[#111] ${
                    wide ? "text-[22px] sm:text-[24px]" : "text-[20px] sm:text-[20px]"
                  }`}
                >
                  {c.title}
                </h2>
                <p
                  className={`toolbox-card-desc text-left text-[#555] ${
                    wide
                      ? "mt-4 max-w-[15rem] text-[15px] leading-[2] sm:text-[16px]"
                      : "mt-3 max-w-[13rem] text-[14px] leading-[1.8]"
                  }`}
                >
                  {c.desc}
                </p>
                <span
                  className={`toolbox-card-action mt-auto inline-flex shrink-0 items-center justify-center rounded-full border border-[#111] text-[#111] transition group-hover:bg-[#111] group-hover:text-white ${
                    wide ? "size-12" : "size-[30px]"
                  }`}
                  aria-hidden
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    className={wide ? "h-5 w-5" : "h-3.5 w-3.5"}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
