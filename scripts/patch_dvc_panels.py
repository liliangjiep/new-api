# -*- coding: utf-8 -*-
"""补齐「深度复刻」页原站缺失的两块 UI：新增功能引导弹层 + 复刻方式面板。

原站实测（.recon/orig9/toolbox__depth-video-clone.json）：
  · div.depth-video-clone-guide  全屏覆盖 [0,0,1600,900]
      └─ div.feature-guide-popover  [556,228,340,204]
          ├─ svg  箭头 [545,395,12,20]
          ├─ div [577,245,298,28] → h3「上传参考视频」+ button「跳过」36×28
          ├─ p.mt-2「建议上传 4-60 秒视频，...」[577,281,298,40]
          ├─ div.mt-3 [577,333,298,28] → span「动作与镜头参考」(icon 16×16)
          └─ div.mt-5 [577,381,298,34] → span「1 / 4」+ button「下一步」82×34
  · div.generation-skill-panel  [99,95,442,227]（编辑区内、覆盖输入区之上）
      ├─ div.generation-skill-panel-header  [100,96,440,37]
      │   └─ div.generation-skill-panel-title-row [116,110,408,23]
      │       └─ div.generation-skill-panel-title-copy [116,110,195,23]
      │           ├─ h3.generation-skill-panel-title「选择复刻方式」[116,110,88,23]
      │           └─ p.generation-skill-panel-subtitle「延续精彩，演绎不同」[212,114,99,16]
      └─ 3 × div.generation-skill-card  204×78（2 列 + 换行）
          └─ button.generation-skill-card-select 202×76
              ├─ span.generation-skill-card-layout [..,52,52]
              │   ├─ span.generation-skill-card-image 52×52
              │   └─ span.generation-skill-card-content
              │       ├─ span.generation-skill-card-title
              │       └─ span.generation-skill-card-desc.line-clamp-2
              └─ span.generation-skill-card-check 覆盖整卡

三张卡片：
  深度复刻 / 参考动作轮廓，替换人物、商品或背景
  分镜复刻 / 参考原片分镜与节奏，用你的素材重新演绎
  元素替换 / 精准替换原视频中的元素
"""
import io, os, sys

PATH = "apps/web/src/app/toolbox/depth-video-clone/page.tsx"

GUIDE_COMPONENT = '''
/* ==================================================================
 * 原站：新增功能引导弹层（.depth-video-clone-guide / .feature-guide-popover）
 * 实测几何：guide 全屏 [0,0,1600,900]；popover [556,228,340,204]
 * 箭头在左下 [545,395,12,20]
 * ================================================================== */
const GUIDE_STEPS = [
  {
    title: "上传参考视频",
    body: "建议上传 4-60 秒视频，系统将分析原视频的动作、镜头与节奏，为你复刻。",
    hint: "动作与镜头参考",
  },
  {
    title: "添加参考素材",
    body: "上传商品图、人物图或背景图，复刻时将自动替换进原视频的对应位置。",
    hint: "素材替换参考",
  },
  {
    title: "选择复刻方式",
    body: "可选择深度复刻、分镜复刻或元素替换，决定原视频的复用程度。",
    hint: "复刻方式选择",
  },
  {
    title: "生成并下载",
    body: "生成完成后可在右侧最近任务中查看进度与结果。",
    hint: "任务与结果",
  },
];

function FeatureGuidePopover({
  step,
  total,
  onSkip,
  onNext,
}: {
  step: number;
  total: number;
  onSkip: () => void;
  onNext: () => void;
}) {
  const s = GUIDE_STEPS[Math.min(step, GUIDE_STEPS.length - 1)];
  return (
    <div className="depth-video-clone-guide pointer-events-none fixed inset-0 z-[400]">
      <div className="feature-guide-popover pointer-events-auto absolute left-1/2 top-[228px] z-10 w-[340px] -translate-x-1/2 rounded-xl border border-line bg-surface p-5 shadow-dialog">
        <svg
          aria-hidden
          viewBox="0 0 12 20"
          className="absolute -left-[11px] bottom-[11px] h-5 w-3 text-surface"
          fill="none"
        >
          <path
            d="M11.5 0.5 0.5 10l11 9.5V0.5Z"
            fill="currentColor"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        </svg>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold leading-6 text-foreground">{s.title}</h3>
          <button
            type="button"
            onClick={onSkip}
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-muted transition hover:bg-muted hover:text-foreground"
          >
            跳过
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">{s.body}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-[11px] text-fg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3.5v8m0 0 3-3m-3 3-3-3M4.5 17.5v1.25A1.75 1.75 0 0 0 6.25 20.5h11.5a1.75 1.75 0 0 0 1.75-1.75V17.5"
              />
            </svg>
            {s.hint}
          </span>
        </div>
        <div className="mt-5 flex items-center justify-between gap-2">
          <span className="pb-1 tabular-nums text-xs text-muted">
            {step + 1} / {total}
          </span>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-[34px] items-center justify-center rounded-lg bg-accent px-5 text-xs font-semibold text-on-accent transition hover:bg-accent/90"
          >
            下一步
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================================================================
 * 原站：复刻方式面板（.generation-skill-panel）
 * 实测几何 [99,95,442,227]；标题行含副标题「延续精彩，演绎不同」
 * 3 张卡片 204×78，2 列栅格 + 换行
 * ================================================================== */
function GenerationSkillPanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="generation-skill-panel absolute left-0 top-0 z-[320] w-[442px] origin-top rounded-xl border border-line bg-surface p-1 shadow-dialog ease-out">
      <div className="generation-skill-panel-header shrink-0 pb-0">
        <div className="generation-skill-panel-title-row flex items-center gap-3 px-4 py-3">
          <div className="generation-skill-panel-title-copy flex min-w-0 items-center gap-3">
            <h3 className="generation-skill-panel-title text-sm font-semibold leading-[23px] text-foreground">
              选择复刻方式
            </h3>
            <p className="generation-skill-panel-subtitle text-xs leading-4 text-muted">
              延续精彩，演绎不同
            </p>
          </div>
        </div>
      </div>
      <div className="generation-skill-panel-body grid grid-cols-2 gap-2 p-2 pt-1">
        {MODES.map((m) => {
          const on = value === m.key;
          return (
            <div key={m.key} className="generation-skill-card relative">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onChange(m.key)}
                className={cn(
                  "generation-skill-card-select relative flex w-full items-center gap-2 rounded-lg border p-2 text-left",
                  on
                    ? "border-accent bg-bg-action"
                    : "border-line bg-surface hover:bg-bg-action"
                )}
              >
                <span className="generation-skill-card-layout flex min-w-0 items-center gap-2">
                  <span className="generation-skill-card-image inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-subtle-action">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.4}
                      stroke="currentColor"
                      aria-hidden
                      className="h-6 w-6 text-muted"
                    >
                      {m.key === "depth" ? (
                        <path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5v-9Zm8-3.5v16M4 7.5l8 3.5 8-3.5" />
                      ) : m.key === "storyboard" ? (
                        <path d="M4 5.5h16v13H4v-13Zm0 4.5h16M9 10v8.5" />
                      ) : (
                        <path d="M4.5 12h15M12 4.5v15M8 8l-3.5 4L8 16m8-8 3.5 4L16 16" />
                      )}
                    </svg>
                  </span>
                  <span className="generation-skill-card-content flex min-w-0 flex-col">
                    <span className="generation-skill-card-title truncate text-xs font-semibold text-foreground">
                      {m.label}
                    </span>
                    <span className="generation-skill-card-desc line-clamp-2 text-[10px] leading-4 text-muted">
                      {m.desc}
                    </span>
                  </span>
                </span>
              </button>
              <span
                className={cn(
                  "generation-skill-card-check pointer-events-none absolute inset-0 rounded-lg",
                  on ? "opacity-100" : "opacity-0"
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
'''


def main():
    s = open(PATH, encoding="utf-8").read()

    if "FeatureGuidePopover" in s:
        print("已存在，跳过")
        return

    # 1) 插入组件定义（在 MODES/SLOTS 常量之后、组件之前）
    anchor = "const MAX_REFS = 18;"
    if anchor not in s:
        print("! 找不到锚点 MAX_REFS")
        sys.exit(1)
    s = s.replace(anchor, anchor + "\n" + GUIDE_COMPONENT, 1)

    # 2) 加 state
    s = s.replace(
        '  const [modeOpen, setModeOpen] = useState(false);',
        '  const [modeOpen, setModeOpen] = useState(false);\n'
        '  const [guideStep, setGuideStep] = useState(0);\n'
        '  const [guideOpen, setGuideOpen] = useState(true);',
        1,
    )

    # 3) 用新面板替换旧的 modeOpen 面板
    old_start = "                  {modeOpen && (\n"
    old_end = "                  )}\n"
    i = s.find(old_start)
    if i == -1:
        print("! 找不到旧面板")
        sys.exit(1)
    j = s.find(old_end, i)
    if j == -1:
        print("! 找不到旧面板结束")
        sys.exit(1)
    s = s[:i] + "                  {modeOpen && (\n                    <GenerationSkillPanel\n                      value={mode}\n                      onChange={(k) => {\n                        setMode(k);\n                        setModeOpen(false);\n                      }}\n                    />\n                  )}\n" + s[j + len(old_end):]

    # 4) 渲染引导弹层（放在 ToolboxShell 之后）
    k = s.rfind("    />\n  );\n}")
    if k == -1:
        print("! 找不到返回结尾")
        sys.exit(1)
    guide_render = """    />
      {guideOpen ? (
        <FeatureGuidePopover
          step={guideStep}
          total={GUIDE_STEPS.length}
          onSkip={() => setGuideOpen(false)}
          onNext={() => {
            if (guideStep + 1 >= GUIDE_STEPS.length) {
              setGuideOpen(false);
            } else {
              setGuideStep((v) => v + 1);
            }
          }}
        />
      ) : null}
  );
}"""
    s = s[:k] + guide_render + s[k + len("    />\n  );\n}"):]

    open(PATH, "w", encoding="utf-8").write(s)
    print("已写入深度复刻引导弹层 + 复刻方式面板")


if __name__ == "__main__":
    main()
