import io, os, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
os.chdir(r"D:\code\xin-ai")

MODELS = {
    "video-generation": [
        ("Seedance-2.5", "视频模型", "画质与动态平衡"),
        ("Seedance-2.0", "视频模型", "性价比"),
        ("Seedance-2.0 Mini", "视频模型", "极速低成本"),
    ],
    "image-generation": [
        ("LC Image 2.5 Pro", "图片模型", "画质优先"),
        ("LC Image 2.5 Fast", "图片模型", "速度优先"),
        ("LC Image 2.5", "图片模型", "标准"),
    ],
    "depth-video-clone": [
        ("Seedance-2.5", "视频模型", "画质与动态平衡"),
        ("Seedance-2.0", "视频模型", "性价比"),
    ],
}

for slug, models in MODELS.items():
    p = rf"apps\web\src\app\toolbox\{slug}\page.tsx"
    s = open(p, encoding="utf-8").read()
    if "PopoverSelect" not in s:
        s = s.replace(
            'import { useToast } from "@/components/features/ToastHost";',
            'import { PopoverSelect, TallPopoverSelect } from "@/components/features/PopoverSelect";\nimport { useToast } from "@/components/features/ToastHost";',
        )
    # 模型按钮 -> TallPopoverSelect
    pat = re.compile(
        r'<button\s+type="button"\s+onClick=\{\(\) => setModel\([\s\S]{0,400}?</button>',
    )
    m = pat.search(s)
    if not m:
        print(slug, "model button not found")
        continue
    opts = ",\n".join(
        '                    { value: "%s", label: "%s", description: "%s" }' % (v, v, d)
        for v, _l, d in models
    )
    new = f'''<TallPopoverSelect
                  label="模型"
                  value={{model}}
                  onChange={{setModel}}
                  ariaLabel="模型"
                  className="min-w-0"
                  summary={{
                    <span className="model-summary-title block truncate text-[10px] font-semibold leading-snug text-foreground">
                      {{model}}
                    </span>
                  }}
                  options={{[
{opts},
                  ]}}
                />'''
    s = s[: m.start()] + new + s[m.end():]

    # 视频/图片设置按钮 -> TallPopoverSelect
    pat2 = re.compile(
        r'<button\s+type="button"\s+onClick=\{\(\) =>\s*\n?\s*setSpec\([\s\S]{0,400}?</button>',
    )
    m2 = pat2.search(s)
    if m2:
        new2 = '''<TallPopoverSelect
                  label="视频设置"
                  value={spec}
                  onChange={setSpec}
                  ariaLabel="视频设置"
                  align="end"
                  className="min-w-0"
                  summary={
                    <span className="block truncate text-[10px] font-semibold leading-snug text-foreground">
                      {spec}
                    </span>
                  }
                  options={[
                    { value: "视频比例、分辨率与时长", label: "视频比例、分辨率与时长" },
                    { value: "9:16 · 1080P · 5 秒", label: "9:16 · 1080P · 5 秒" },
                    { value: "16:9 · 1080P · 10 秒", label: "16:9 · 1080P · 10 秒" },
                    { value: "1:1 · 720P · 8 秒", label: "1:1 · 720P · 8 秒" },
                  ]}
                />'''
        s = s[: m2.start()] + new2 + s[m2.end():]
    else:
        # image-generation: setting 按钮
        pat3 = re.compile(
            r'<button\s+type="button"\s+onClick=\{\(\) => setSetting\([\s\S]{0,400}?</button>',
        )
        m3 = pat3.search(s)
        if m3:
            new3 = '''<TallPopoverSelect
                  label="图片设置"
                  value={setting}
                  onChange={setSetting}
                  ariaLabel="图片设置"
                  align="end"
                  className="min-w-0"
                  summary={
                    <span className="block truncate text-[10px] font-semibold leading-snug text-foreground">
                      {setting}
                    </span>
                  }
                  options={[
                    { value: "自适应 1K 高 PNG", label: "自适应 1K 高 PNG" },
                    { value: "1:1 1K 高 PNG", label: "1:1 1K 高 PNG" },
                    { value: "3:4 2K 高 PNG", label: "3:4 2K 高 PNG" },
                    { value: "16:9 1K 高 JPEG", label: "16:9 1K 高 JPEG" },
                  ]}
                />'''
            s = s[: m3.start()] + new3 + s[m3.end():]
    open(p, "w", encoding="utf-8").write(s)
    print(slug, "patched")
