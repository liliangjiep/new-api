import io, os, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
os.chdir(r"D:\code\xin-ai")
p = r"apps\web\src\app\toolbox\ecommerce-image-set\page.tsx"
s = open(p, encoding="utf-8").read()

# 1) import PopoverSelect
s = s.replace(
    'import { useToast } from "@/components/features/ToastHost";',
    'import { PopoverSelect, TallPopoverSelect } from "@/components/features/PopoverSelect";\nimport { useToast } from "@/components/features/ToastHost";'
)

# 2) 图片文案 / 图片比例 -> PopoverSelect
old_lang = '''              <div className="ecommerce-generation-config grid shrink-0 grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-label="图片文案"
                  onClick={() => setLang(lang === "none" ? "zh" : "none")}
                  className="ecommerce-text-language min-w-0 rounded-lg border border-line px-2.5 py-2 text-left text-xs"
                >
                  <span className="text-muted">图片文案</span>
                  <span className="ml-1 font-semibold text-foreground">
                    {lang === "none" ? "无文案" : "中文"}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="图片比例"
                  onClick={() => setRatio(ratio === "3:4" ? "1:1" : ratio === "1:1" ? "4:3" : "3:4")}
                  className="ecommerce-aspect-ratio min-w-0 rounded-lg border border-line px-2.5 py-2 text-left text-xs"
                >
                  <span className="text-muted">图片比例</span>
                  <span className="ml-1 font-semibold text-foreground">{ratio}</span>
                </button>
              </div>'''
new_lang = '''              <div className="ecommerce-generation-config grid shrink-0 grid-cols-2 gap-2">
                <PopoverSelect
                  label="图片文案"
                  value={lang}
                  onChange={setLang}
                  ariaLabel="图片文案"
                  className="ecommerce-text-language min-w-0"
                  options={[
                    { value: "none", label: "无文案" },
                    { value: "zh", label: "中文" },
                    { value: "en", label: "英文" },
                  ]}
                />
                <PopoverSelect
                  label="图片比例"
                  value={ratio}
                  onChange={setRatio}
                  ariaLabel="图片比例"
                  className="ecommerce-aspect-ratio min-w-0"
                  options={[
                    { value: "3:4", label: "3:4" },
                    { value: "1:1", label: "1:1" },
                    { value: "4:3", label: "4:3" },
                    { value: "9:16", label: "9:16" },
                    { value: "16:9", label: "16:9" },
                  ]}
                />
              </div>'''
assert old_lang in s
s = s.replace(old_lang, new_lang)

# 3) 模型 / 图片设置 -> TallPopoverSelect
old_sel = '''              <div className="ecommerce-config-selectors relative z-[300] grid shrink-0 grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModel(model.includes("Pro") ? "LC Image 2.5 Fast" : "LC Image 2.5 Pro")}
                  className="min-w-0 rounded-lg border border-line px-2.5 py-2 text-left"
                >
                  <span className="text-[10px] text-muted">模型</span>
                  <span className="model-summary-title block truncate text-[11px] font-semibold text-foreground">
                    {model}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setResolution(resolution === "1K" ? "2K" : "1K")}
                  className="min-w-0 rounded-lg border border-line px-2.5 py-2 text-left"
                >
                  <span className="text-[10px] text-muted">图片设置</span>
                  <span className="block text-[11px] font-semibold tabular-nums text-foreground">
                    {resolution} 高 · {format}
                  </span>
                </button>
              </div>'''
new_sel = '''              <div className="ecommerce-config-selectors relative z-[300] grid shrink-0 grid-cols-2 gap-2">
                <TallPopoverSelect
                  label="模型"
                  value={model}
                  onChange={setModel}
                  ariaLabel="模型"
                  className="min-w-0"
                  summary={
                    <span className="model-summary-text mt-px flex min-w-0 items-baseline gap-1.5">
                      <span className="model-summary-title min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold leading-snug text-foreground">
                        {model}
                      </span>
                    </span>
                  }
                  options={[
                    { value: "LC Image 2.5 Pro", label: "LC Image 2.5 Pro", description: "画质优先" },
                    { value: "LC Image 2.5 Fast", label: "LC Image 2.5 Fast", description: "速度优先" },
                    { value: "LC Image 2.5", label: "LC Image 2.5", description: "标准" },
                  ]}
                />
                <TallPopoverSelect
                  label="图片设置"
                  value={`${resolution}|${format}`}
                  onChange={(v) => {
                    const [r, f] = v.split("|");
                    setResolution(r);
                    setFormat(f);
                  }}
                  ariaLabel="图片设置"
                  align="end"
                  className="min-w-0"
                  summary={
                    <span className="mt-px flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] font-semibold leading-snug tabular-nums text-foreground">
                      <span className="shrink-0 tabular-nums">{resolution}</span>
                      <span className="shrink-0">高</span>
                      <span aria-hidden>·</span>
                      <span className="shrink-0">{format}</span>
                    </span>
                  }
                  options={[
                    { value: "1K|PNG", label: "1K 高 · PNG" },
                    { value: "2K|PNG", label: "2K 高 · PNG" },
                    { value: "1K|JPEG", label: "1K 高 · JPEG" },
                    { value: "2K|JPEG", label: "2K 高 · JPEG" },
                  ]}
                />
              </div>'''
assert old_sel in s
s = s.replace(old_sel, new_sel)

open(p, "w", encoding="utf-8").write(s)
print("patched ecommerce selectors")
