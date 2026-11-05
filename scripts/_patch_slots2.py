# -*- coding: utf-8 -*-
"""depth-video-clone 参考槽按原站 1:1 重写（data 属性 / var 尺寸 / cover 图 / label 样式）。"""
p = "apps/web/src/app/toolbox/depth-video-clone/page.tsx"
s = open(p, encoding="utf-8").read()

old_start = s.index('                {/* —— 参考槽位 —— */}')
old_end = s.index('                {/* —— 参考视频上传 —— */}')

new = '''                {/* —— 参考槽位 —— */}
                <section className="depth-video-clone-reference-slots min-w-0 px-3 pb-1 pt-2">
                  <div className="reference-slot-uploader relative flex w-full min-w-0 flex-1 items-start overflow-visible">
                    <div className="reference-slot-list flex w-fit max-w-full min-w-0 items-start">
                      {SLOTS.map((s, i) => (
                        <div key={s.key} className="flex items-start gap-3">
                          {i > 0 && (
                            <span className="reference-slot-divider mt-2 h-[calc(var(--reference-slot-card-size,64px)-16px)] w-px shrink-0 self-start bg-line" />
                          )}
                          <section
                            data-reference-slot-key={s.key}
                            data-reference-drop-target-id={`slot:${s.key}`}
                            data-reference-drop-solt-key={s.key}
                            className="reference-slot-card group/reference-slot relative flex w-[var(--reference-slot-card-size)] shrink-0 flex-col items-center hover:z-[80] cursor-pointer max-sm:w-fit"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setRefs((n) => Math.min(MAX_REFS, n + 1))
                              }
                              aria-label={`添加${s.label}`}
                              className="reference-slot-upload-hitarea absolute inset-0 z-0 disabled:cursor-default rounded-xl"
                            />
                            <div className="reference-slot-card-stage pointer-events-none relative z-[1] h-[var(--reference-slot-card-size)] w-[var(--reference-slot-card-size)] shrink-0">
                              <div className="reference-slot-trigger absolute inset-0 overflow-hidden border border-line bg-subtle shadow-sm transition-colors group-hover/reference-slot:border-[#999] rounded-xl ">
                                {s.cover ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    alt=""
                                    draggable={false}
                                    className="reference-slot-cover-image h-full w-full object-cover"
                                    src={s.cover}
                                  />
                                ) : null}
                                <span className="reference-slot-cover-upload-icon absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#5c5c5c] text-white shadow-sm" aria-hidden="true">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    aria-hidden="true"
                                    data-slot="icon"
                                    className="h-2.5 w-2.5 stroke-2"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                                    />
                                  </svg>
                                </span>
                              </div>
                            </div>
                            <span className="reference-slot-label mt-1 flex h-4 max-w-max shrink-0 items-center justify-center whitespace-nowrap bg-transparent text-[10px] font-medium leading-none">
                              <span className="reference-slot-title text-[#555]">
                                添加{s.label}
                              </span>
                              <span className="reference-slot-optional ml-0.5 text-[#888]">
                                (可选)
                              </span>
                            </span>
                          </section>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

'''

open(p, "w", encoding="utf-8").write(s[:old_start] + new + s[old_end:])
print("patched reference slots")
