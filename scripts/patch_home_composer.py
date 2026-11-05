# -*- coding: utf-8 -*-
"""把首页 composer 重构成 1:1 原站结构。
原站实测（1600×900）：
  home-composer-tool-group [406,196,840,262]
    home-header-composer-wrap [406,196,840,130]  padding 12px / border 1px rgba(0,0,0,.06) / radius 20px
      home-composer-content [419,209,814,104]
        home-composer-editor [419,209,814,64]   （flex-1，高度由 shell min-h-[64px] 决定）
        home-composer-toolbar-wrap (mt-2) [419,281,814,32]
          composer-toolbar [419,281,814,32]
            speech-input-toolbar-main [419,281,774,32]
              speech-input-toolbar-details [419,281,774,32]
                button.composer-add-button [419,281,32,32]  「+ 添加素材」
原站**无**左侧素材轨、**无**模式选择器。
用法: python scripts/patch_home_composer.py
"""
import io, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PATH = "apps/web/src/app/page.tsx"
src = io.open(PATH, encoding="utf-8").read()
orig = src

# ---------- 1) composer 头部 + 输入区 ----------
OLD1 = '''              <div className="home-header-composer-wrap home-header-composer relative z-[2] box-border flex w-full min-w-0 shrink-0 flex-col justify-between gap-0 rounded-[20px] border-2 border-[var(--color-home-composer-border)] bg-[var(--color-home-composer-bg)] p-2 [box-shadow:var(--shadow-home-composer)] transition-[box-shadow,border-color,background-color,margin] duration-200 ease-out motion-reduce:transition-none">
                {/* 输入区 */}
                <div className="home-composer-input-row flex min-h-0 flex-1 items-start [&>.composer-reference-rail-desktop]:!h-[var(--home-composer-editor-height)]">
                  <div className="composer-reference-rail-desktop relative z-20 flex min-h-0 shrink-0 transform-gpu flex-col items-center justify-center transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform [backface-visibility:hidden] h-[108px] w-[104px]">
                    <div className="composer-reference-upload-group relative z-10 flex shrink-0 origin-center">
                      <div className="composer-reference-upload-attachment relative h-16 w-14 origin-center">
                        <div className="composer-reference-upload-slot relative left-0 top-0 h-16 w-14 -rotate-[8deg] shadow-[-4px_8px_20px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-in-out hover:rotate-0 origin-center">
                          <button
                            type="button"
                            className="composer-reference-upload-button group relative flex h-16 w-14 rounded-[10px] shrink-0 transform-none items-center justify-center overflow-hidden bg-surface text-[#222529] shadow-none hover:transform-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:rotate-[-8deg] origin-center"
                            aria-label="添加参考素材"
                          >
                            <span
                              aria-hidden="true"
                              className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(136.6deg,#d7ecff_20.9%,#67e6ff_98.9%)] opacity-30 transition-opacity duration-200 group-hover:opacity-40"
                            />
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              aria-hidden
                              data-slot="icon"
                              className="relative z-[1] h-[18px] w-[18px] stroke-[2] origin-center"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4.5v15m7.5-7.5h-15"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="home-composer-editor-wrap relative min-w-0 flex-1 px-2 py-1">
                    <div
                      data-home-editor-root="true"
                      className="home-composer-editor relative z-0 flex h-[var(--home-composer-editor-height)] min-h-0 min-w-0 flex-col overflow-hidden"
                    >
                      <div className="composer-prompt-input relative flex min-h-0 flex-auto flex-col home-composer-input-field min-h-0 w-full flex-1">'''

NEW1 = '''              <div className="home-header-composer-wrap relative z-[2] box-border flex w-full min-w-0 shrink-0 flex-col border border-line bg-[var(--color-home-composer-bg)] p-3 [box-shadow:var(--shadow-home-composer)] [&_.composer-add-button:hover]:bg-action [&_.speech-input-controls-microphone:hover]:bg-action rounded-[20px]">
                {/* 输入区 */}
                <div className="home-composer-content flex min-h-0 min-w-0 flex-auto flex-col">
                  <div
                    data-home-editor-root="true"
                    className="home-composer-editor relative z-[1] min-h-0 min-w-0 flex-1 overflow-clip"
                  >
                    <div className="home-composer-input-viewport h-full">
                      <div className="composer-prompt-input relative flex min-h-0 flex-auto flex-col home-composer-input-field min-h-0 w-full flex-1">'''

assert OLD1 in src, "OLD1"
src = src.replace(OLD1, NEW1, 1)

# ---------- 2) shell 高度变量 ----------
OLD2 = '''                          <div className="mention-composer-shell relative flex min-h-0 flex-auto flex-col min-h-[var(--home-composer-input-min-height)] max-h-[var(--home-composer-editor-height)] rounded-none border-0 bg-transparent shadow-none cursor-text">'''
NEW2 = '''                          <div className="mention-composer-shell relative flex min-h-0 flex-auto flex-col min-h-[64px] max-h-[234px] rounded-none border-0 bg-transparent shadow-none cursor-text">'''
assert OLD2 in src, "OLD2"
src = src.replace(OLD2, NEW2, 1)

# ---------- 3) 关闭输入区 + 打开工具条 ----------
OLD3 = '''                          <div className="mention-composer-speech min-w-0 shrink-0 contents" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 工具条 */}
                <div
                  style={
                    {
                      "--toolbar-size": "32px",
                      "--toolbar-font-size": "12px",
                      "--toolbar-icon-size": "18px",
                    } as React.CSSProperties
                  }
                  className="composer-toolbar w-full min-w-0 shrink-0"
                >
                  <div className="speech-input-toolbar flex min-h-[var(--toolbar-size,32px)] w-full min-w-0 shrink-0 flex-nowrap items-end gap-2 max-sm:min-h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:min-h-[var(--toolbar-size,44px)]">
                    <div className="speech-input-toolbar-main relative min-h-[var(--toolbar-size,32px)] min-w-0 flex-1 max-sm:min-h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:min-h-[var(--toolbar-size,44px)]">
                      <div className="speech-input-toolbar-details flex min-h-[var(--toolbar-size,32px)] min-w-0 flex-wrap items-center gap-1.5 pr-10 max-sm:min-h-[var(--toolbar-size,44px)] max-sm:pr-14 [@media(pointer:coarse)]:min-h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:pr-14 transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none visible translate-y-0 opacity-100 delay-0">
'''

NEW3 = '''                          <div className="mention-composer-speech min-w-0 shrink-0 contents" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 工具条 */}
                  <div className="home-composer-toolbar-wrap w-full shrink-0 mt-2">
                    <div
                      style={
                        {
                          "--toolbar-size": "32px",
                          "--toolbar-font-size": "12px",
                          "--toolbar-icon-size": "18px",
                        } as React.CSSProperties
                      }
                      className="composer-toolbar w-full min-w-0 shrink-0"
                    >
                      <div className="speech-input-toolbar flex min-h-[var(--toolbar-size,32px)] w-full min-w-0 shrink-0 flex-nowrap items-end gap-2 max-sm:min-h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:min-h-[var(--toolbar-size,44px)]">
                        <div className="speech-input-toolbar-main relative min-h-[var(--toolbar-size,32px)] min-w-0 flex-1 max-sm:min-h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:min-h-[var(--toolbar-size,44px)]">
                          <div className="speech-input-toolbar-details flex min-h-[var(--toolbar-size,32px)] min-w-0 flex-wrap items-center gap-1.5 pr-10 max-sm:min-h-[var(--toolbar-size,44px)] max-sm:pr-14 [@media(pointer:coarse)]:min-h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:pr-14 transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none visible translate-y-0 opacity-100 delay-0">
'''
assert OLD3 in src, "OLD3"
src = src.replace(OLD3, NEW3, 1)

# ---------- 4) 模式选择器 → 「+ 添加素材」 ----------
OLD4 = '''                        <div className="home-mode-selector home-style-dropdown relative inline-flex min-h-[var(--toolbar-size,36px)] items-center">
                          <button
                            type="button"
                            role="combobox"
                            aria-haspopup="listbox"
                            aria-expanded={modeOpen}
                            aria-label="生成模式"
                            onClick={() => setModeOpen((v) => !v)}
                            className="home-mode-combobox home-style-dropdown-combobox inline-flex h-[var(--toolbar-size,36px)] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-transparent px-2 text-[length:var(--toolbar-font-size,14px)] text-foreground transition-colors hover:bg-action aria-[expanded=true]:bg-action disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <span className="home-style-dropdown-value inline-flex min-w-0 items-center gap-1.5">
                              <span className="home-style-dropdown-value-icon flex h-[var(--toolbar-icon-size,20px)] w-[var(--toolbar-icon-size,20px)] shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full">
                                <ModeIcon kind={activeMode.icon} />
                              </span>
                              <span className="home-style-dropdown-value-label truncate">
                                {activeMode.label}
                              </span>
                            </span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              aria-hidden
                              data-slot="icon"
                              className="home-style-dropdown-chevron h-[var(--toolbar-font-size,14px)] w-[var(--toolbar-font-size,14px)] shrink-0 text-foreground transition-transform duration-150"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m19.5 8.25-7.5 7.5-7.5-7.5"
                              />
                            </svg>
                          </button>
                          {modeOpen ? (
                            <div
                              role="listbox"
                              aria-label="生成模式"
                              className="absolute left-0 top-full z-50 mt-1 min-w-[156px] rounded-xl border border-line bg-surface p-1 shadow-lg"
                            >
                              {MODES.map((m) => (
                                <button
                                  key={m.value}
                                  type="button"
                                  role="option"
                                  aria-selected={m.value === mode}
                                  onClick={() => {
                                    setMode(m.value);
                                    setModeOpen(false);
                                  }}
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                                    m.value === mode
                                      ? "bg-action text-foreground"
                                      : "text-muted hover:bg-action"
                                  )}
                                >
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                                    <ModeIcon kind={m.icon} />
                                  </span>
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
'''

NEW4 = '''                            <button
                              type="button"
                              aria-label="添加素材"
                              onClick={() => requireAuth("/assets")}
                              className="composer-add-button flex h-[var(--toolbar-size,32px)] w-[var(--toolbar-size,32px)] shrink-0 items-center justify-center rounded-full bg-transparent text-foreground transition-colors hover:bg-muted"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                aria-hidden
                                data-slot="icon"
                                className="h-4 w-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 4.5v15m7.5-7.5h-15"
                                />
                              </svg>
                            </button>
                          </div>
'''
assert OLD4 in src, "OLD4"
src = src.replace(OLD4, NEW4, 1)

# ---------- 5) 关闭标签层级 ----------
OLD5 = '''                    </div>
                  </div>
                </div>
              </div>

              {/* 常用工具 */}'''
NEW5 = '''                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 常用工具 */}'''
assert OLD5 in src, "OLD5"
src = src.replace(OLD5, NEW5, 1)

# ---------- 6) 清理不再使用的 mode state ----------
OLD6 = '''  const [mode, setMode] = useState<string>("agent");
  const [modeOpen, setModeOpen] = useState(false);
'''
NEW6 = '''  const [mode] = useState<string>("agent");
'''
assert OLD6 in src, "OLD6"
src = src.replace(OLD6, NEW6, 1)

OLD7 = '''  const activeMode = MODES.find((m) => m.value === mode) ?? MODES[0];
'''
assert OLD7 in src, "OLD7"
src = src.replace(OLD7, "", 1)

io.open(PATH, "w", encoding="utf-8").write(src)
print("OK, changed:", len(orig) != len(src))
