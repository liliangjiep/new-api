# -*- coding: utf-8 -*-
"""ExampleCarousel 改为支持单帧/轮播两种模式（按原站逐页实测）。"""
p = "apps/web/src/components/features/BenchWorkspace.tsx"
s = open(p, encoding="utf-8").read()
start = s.index("/** 参考示例（原站 result-example-display —— 单帧静态，非轮播） */")
end = s.index("/** 客户端副作用安全包装 */")

new = '''/**
 * 参考示例（原站 result-example-display）
 *
 * 原站逐页实测（2026-10-31）：
 *   /toolbox/image-generation  /toolbox/video-generation
 *   /toolbox/depth-video-clone  → 单帧 .result-example-single
 *   /toolbox/ecommerce-image-set → 轮播 .result-example-carousel + .result-example-track
 */
export function ExampleCarousel({
  title,
  description,
  images,
  descriptionNode,
  variant = "single",
}: {
  title: string;
  description: string;
  images: { src: string; alt: string }[];
  descriptionNode?: React.ReactNode;
  variant?: "single" | "carousel";
}) {
  const [idx, setIdx] = useState(0);
  const go = (d: number) =>
    setIdx((i) => (i + d + images.length) % images.length);
  const isCarousel = variant === "carousel" && images.length > 1;

  return (
    <div className="result-example-display flex h-full min-h-0 w-full flex-col items-center justify-center gap-5 overflow-y-auto px-4 py-6 text-center">
      <div className="result-example-heading flex max-w-2xl flex-col items-center gap-3">
        <h2 className="result-example-title text-xl font-bold leading-none text-foreground max-2xl:text-lg/none">
          {title}
        </h2>
        <div className="result-example-description text-sm leading-none text-muted max-xl:text-xs/none">
          {descriptionNode ?? (
            <p className="result-example-description-line">{description}</p>
          )}
        </div>
      </div>
      <div className="result-example-content relative aspect-video min-h-0 max-h-[70%] w-full max-w-5xl shrink-0">
        <div className="result-example-stage absolute inset-0 flex min-h-0 flex-col gap-3">
          {isCarousel ? (
            <div
              role="region"
              aria-roledescription="carousel"
              aria-label="结果示例轮播"
              className="result-example-carousel group/example-carousel relative flex min-h-0 w-full flex-1 flex-col items-center justify-center"
            >
              <button
                type="button"
                aria-label="上一个示例"
                onClick={() => go(-1)}
                className="result-example-prev group/example-handle invisible absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center opacity-0 transition-[visibility,opacity] duration-200 group-hover/example-carousel:visible group-hover/example-carousel:opacity-100"
              >
                <span className="result-example-prev-visual inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface/70 text-[#444] shadow-sm backdrop-blur-sm transition-[color,background-color] duration-200 group-hover/example-handle:bg-surface/90 group-hover/example-handle:text-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="result-example-prev-icon h-5 w-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </span>
              </button>

              <div className="result-example-viewport flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-2xl">
                <div
                  className="result-example-track flex h-full min-h-0 transition-transform duration-500 ease-out"
                  style={{ transform: `translate3d(-${idx * 100}%, 0px, 0px)` }}
                >
                  {images.map((im, i) => (
                    <div
                      key={im.src}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${i + 1} / ${images.length}`}
                      className={cn(
                        "result-example-slide flex min-h-0 min-w-0 shrink-0 grow-0 basis-full items-center justify-center",
                        i !== idx && "pointer-events-none"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={im.src}
                        alt={im.alt}
                        loading={i === idx ? "eager" : "lazy"}
                        className="result-example-image min-h-0 max-h-full max-w-full rounded-2xl object-contain"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                aria-label="下一个示例"
                onClick={() => go(1)}
                className="result-example-next group/example-handle invisible absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center opacity-0 transition-[visibility,opacity] duration-200 group-hover/example-carousel:visible group-hover/example-carousel:opacity-100"
              >
                <span className="result-example-next-visual inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface/70 text-[#444] shadow-sm backdrop-blur-sm transition-[color,background-color] duration-200 group-hover/example-handle:bg-surface/90 group-hover/example-handle:text-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="result-example-next-icon h-5 w-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 19.5 15.75 12l-7.5-7.5" />
                  </svg>
                </span>
              </button>
            </div>
          ) : (
            <div className="result-example-single flex h-full min-h-0 w-full items-center justify-center">
              {images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[0].src}
                  alt={images[0].alt}
                  loading="eager"
                  className="result-example-image min-h-0 max-h-full max-w-full rounded-2xl object-contain"
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
      {isCarousel ? (
        <div className="result-example-dots flex items-center justify-center gap-2">
          {images.map((im, i) => (
            <button
              key={im.src}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`查看示例 ${i + 1}`}
              aria-current={i === idx ? "true" : undefined}
              className={cn(
                "rounded-full transition-colors",
                i === idx ? "h-1.5 w-1.5 bg-foreground" : "h-1.5 w-1.5 bg-line-strong"
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

'''

open(p, "w", encoding="utf-8").write(s[:start] + new + s[end:])
print("patched ExampleCarousel with single/carousel variants")
