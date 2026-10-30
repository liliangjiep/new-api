"use client";

import Link from "next/link";
import { WorkspaceRail } from "@/components/features/BenchWorkspace";

/*
 * 原站 /canvas（实测 1:1）：
 *   canvas-workspace-layout
 *    └── 滚动容器 pb-10
 *         └── max-w-shell px-4 sm:px-6 lg:px-10
 *              ├── section 画布视频教程（aria-label="画布视频教程"）
 *              │    header: h2「新手教程」+ 圆形折叠按钮
 *              │    grid grid-cols-4 gap-2.5 sm:gap-3，4 张 aspect-[2/1] 教程封面卡
 *              └── section#recent-projects「我的创作」
 *                   grid grid-cols-3 sm:4 lg:5 xl:6
 *                    └── 新建卡片（aspect-square，＋图标 + 「新建」/「开始创作」）
 */

const TUTORIALS = [
  { n: 1, cover: "/images/canvas/tutorial-step-01.jpg" },
  { n: 2, cover: "/images/canvas/tutorial-step-02.jpg" },
  { n: 3, cover: "/images/canvas/tutorial-step-03.jpg" },
  { n: 4, cover: "/images/canvas/tutorial-step-04.jpg" },
];

export default function CanvasPage() {
  return (
    <div className="workspace-shell relative flex h-[calc(100vh-var(--global-open-panel-height,0px))] min-h-0 min-w-0 flex-row bg-bg-subtle">
      <WorkspaceRail />
      <div className="workspace-main-shell relative flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden rounded-l-3xl bg-bg">
        <main className="workspace-main-content flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto max-lg:pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]">
          <div className="canvas-workspace-layout flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:h-full">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto pb-10 scrollbar-none">
              <div className="mx-auto w-full min-w-0 max-w-shell overflow-x-hidden px-4 scrollbar-none sm:px-6 lg:px-10">
                {/* —— 新手教程 —— */}
                <section
                  aria-label="画布视频教程"
                  className="canvas-video-tutorial-section w-full min-w-0 transform-gpu transition-all duration-300 ease-out mt-4 max-h-[28rem] translate-y-0 opacity-100 sm:mt-6"
                >
                  <header className="video-tutorial-header mb-4 flex items-center gap-2">
                    <h2 className="video-tutorial-title text-base font-semibold tracking-tight text-fg sm:text-lg">
                      新手教程
                    </h2>
                    <button
                      type="button"
                      aria-label="收起新手教程"
                      className="tutorial-collapse-action group relative inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-black/[0.045] text-muted transition hover:text-accent-deep"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.8}
                        stroke="currentColor"
                        aria-hidden
                        className="h-3.5 w-3.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 18.75 7.5-7.5 7.5 7.5" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 7.5-7.5 7.5 7.5" />
                      </svg>
                      <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-black/75 px-2 py-1 text-[11px] font-medium leading-none text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        收起
                      </span>
                    </button>
                  </header>
                  <div className="canvas-video-tutorial-grid grid grid-cols-4 gap-2.5 sm:gap-3">
                    {TUTORIALS.map((t) => (
                      <button
                        key={t.n}
                        type="button"
                        aria-label={`播放视频教程 ${t.n}`}
                        className="canvas-video-tutorial-card group relative isolate aspect-[2/1] min-w-0 overflow-hidden rounded-xl bg-surface shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.1)] sm:rounded-2xl"
                      >
                        <div className="tutorial-cover-frame absolute inset-0 overflow-hidden rounded-[inherit] border border-black/[0.05]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={t.cover}
                            alt={`视频教程 ${t.n}`}
                            className="tutorial-cover block h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <span className="tutorial-play-button absolute left-1/2 top-1/2 z-[3] flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 shadow-lg backdrop-blur-sm transition group-hover:bg-black/60 group-hover:opacity-100 sm:h-12 sm:w-12">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden
                            className="h-5 w-5 translate-x-0.5 sm:h-6 sm:w-6"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* —— 我的创作 —— */}
                <section id="recent-projects" className="mt-6 w-full min-w-0 sm:mt-8">
                  <header className="mb-4 flex items-center gap-2">
                    <h2 className="recent-project-title text-base font-semibold tracking-tight text-fg sm:text-lg">
                      我的创作
                    </h2>
                  </header>
                  <div className="canvas-recent-project-list flex min-h-0 flex-col pb-2">
                    <div
                      className="canvas-recent-project-grid grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5 lg:grid-cols-5 lg:gap-3 xl:grid-cols-6"
                      aria-busy="false"
                    >
                      <Link
                        href="/canvas?new=1"
                        className="canvas-start-create-card group/card relative flex w-full flex-col rounded-xl border-0 bg-transparent shadow-none ring-0"
                        role="button"
                        aria-disabled="false"
                      >
                        <div className="canvas-start-create-button relative flex aspect-square w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#fafafa] text-left shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.05] outline-none transition duration-300 ease-out group-hover/card:-translate-y-0.5 group-hover/card:shadow-[0_12px_28px_rgba(15,23,42,0.1)]">
                          <span className="inline-flex items-center justify-center text-muted transition group-hover/card:scale-105 group-hover/card:text-accent-deep">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.15}
                              stroke="currentColor"
                              aria-hidden
                              className="h-8 w-8"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4.5v15m7.5-7.5h-15"
                              />
                            </svg>
                          </span>
                          <span className="text-[11px] font-semibold text-fg">新建</span>
                        </div>
                        <div className="canvas-start-create-meta flex min-h-[2.25rem] flex-col justify-center border-t-0 bg-transparent px-2 py-1.5">
                          <p className="truncate text-[11px] font-semibold leading-snug text-fg">
                            开始创作
                          </p>
                        </div>
                      </Link>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
