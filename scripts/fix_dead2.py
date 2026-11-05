import pathlib
base = pathlib.Path("D:/code/xin-ai/apps/web/src")
def rd(p): return (base/p).read_text(encoding="utf-8")
def wr(p,t): (base/p).write_text(t, encoding="utf-8"); print("patched",p)

# ---------- account ----------
p="app/account/page.tsx"; t=rd(p)
t=t.replace('import Link from "next/link";\nimport { WorkspaceShell } from "@/components/features/WorkspaceShell";',
 'import Link from "next/link";\nimport { useState } from "react";\nimport { WorkspaceShell } from "@/components/features/WorkspaceShell";\nimport { useToast } from "@/components/features/ToastHost";',1)
t=t.replace("export default function AccountPage() {",
 'export default function AccountPage() {\n  const { push } = useToast();\n  const [selType, setSelType] = useState(0);\n  const [selTool, setSelTool] = useState(0);',1)
t=t.replace('className="account-redeem-action inline-flex h-9 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold text-foreground"',
 'onClick={() => push({ tone: "neutral", title: "请输入兑换码（演示）", description: "前端复刻演示：弹窗/跳转无需后端。" })}\n                    className="account-redeem-action inline-flex h-9 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold text-foreground"',1)
t=t.replace('className="account-recharge-action inline-flex h-9 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-60"',
 'onClick={() => push({ tone: "neutral", title: "订阅 / 充值（演示）", description: "前端复刻演示：收银台跳转无需后端。" })}\n                    className="account-recharge-action inline-flex h-9 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-60"',1)
# type pills
t=t.replace("{LEDGER_TYPES.map((t, i) => (",
              "{LEDGER_TYPES.map((t, i) => (\n                    <span key={t} className=\"contents\" onClick={() => setSelType(i)}>",1)
# careful: original structure is button directly; wrap approach breaks. Instead simpler: add onClick via replacing '<button\n                      key={t}\n                      type="button"\n                      className={\n                        i === 0'
# do two occurrences separately (type then tool)
old_btn = '                      key={t}\n                      type="button"\n                      className={\n                        i === 0'
assert t.count(old_btn)==2, t.count(old_btn)
t=t.replace(old_btn,
 '                      key={t}\n                      type="button"\n                      onClick={() => setSelType(i)}\n                      aria-pressed={selType === i}\n                      className={\n                        selType === i',1)
t=t.replace(old_btn,
 '                      key={t}\n                      type="button"\n                      onClick={() => setSelTool(i)}\n                      aria-pressed={selTool === i}\n                      className={\n                        selTool === i',1)
# remove the wrapper spans we accidentally added
t=t.replace('{LEDGER_TYPES.map((t, i) => (\n                    <span key={t} className="contents" onClick={() => setSelType(i)}>', '{LEDGER_TYPES.map((t, i) => (',1)
wr(p,t)

# ---------- home page ----------
p="app/page.tsx"; t=rd(p)
t=t.replace('import { LoginModal } from "@/components/features/LoginModal";',
 'import { LoginModal } from "@/components/features/LoginModal";\nimport { useToast } from "@/components/features/ToastHost";',1)
t=t.replace("export default function HomePage() {\n  const router = useRouter();",
 "export default function HomePage() {\n  const router = useRouter();\n  const { push } = useToast();\n  const sceneRef = useRef<HTMLDivElement>(null);\n  const scrollScene = (dir: number) => {\n    const el = sceneRef.current;\n    if (el) el.scrollBy({ left: dir * 560, behavior: \"smooth\" });\n    else push({ tone: \"neutral\", title: dir > 0 ? \"向右滑动（演示）\" : \"向左滑动（演示）\" });\n  };",1)
# mic button (home composer): anchor on aria-label + class combo is mojibake; use class anchor once — only home mic has data-home-composer-send sibling? Safer: add onClick to the mic button by matching the exact class string occurrence in page.tsx (only mic uses speech-input-controls-microphone there)
t=t.replace('aria-label="',
 'aria-label="',1)  # no-op keep encoding stable
mic_old='className="speech-input-controls-microphone flex h-[var(--toolbar-size,32px)] w-[var(--toolbar-size,32px)] shrink-0 touch-manipulation items-center justify-center rounded-full max-sm:h-[var(--toolbar-size,44px)] max-sm:w-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:w-[var(--toolbar-size,44px)] pointer-events-auto text-muted hover:bg-[#f1f1f1] disabled:cursor-not-allowed disabled:opacity-40"'
assert mic_old in t
t=t.replace(mic_old,
 'onClick={() => push({ tone: "neutral", title: "正在聆听…（演示）", description: "前端复刻演示，无需后端即可交互。" })}\n                              className="speech-input-controls-microphone flex h-[var(--toolbar-size,32px)] w-[var(--toolbar-size,32px)] shrink-0 touch-manipulation items-center justify-center rounded-full max-sm:h-[var(--toolbar-size,44px)] max-sm:w-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:w-[var(--toolbar-size,44px)] pointer-events-auto text-muted hover:bg-[#f1f1f1] disabled:cursor-not-allowed disabled:opacity-40"',1)
# scene viewport ref
t=t.replace('className="home-entry-scene-perspective w-full overflow-x-auto',
 'ref={sceneRef}\n              className="home-entry-scene-perspective w-full overflow-x-auto',1)
# left/right handles
t=t.replace('className="home-entry-scene-handle-left-action group/scene-handle absolute inset-0 z-[1] flex items-center justify-center transition-[visibility,opacity] duration-200 invisible opacity-0"',
 'onClick={() => scrollScene(-1)}\n                  className="home-entry-scene-handle-left-action group/scene-handle absolute inset-0 z-[1] flex items-center justify-center transition-[visibility,opacity] duration-200 invisible opacity-0"',1)
t=t.replace('className="home-entry-scene-handle-right-action group/scene-handle absolute inset-0 z-[1] flex items-center justify-center transition-[visibility,opacity] duration-200 invisible opacity-0 group-hover/scene:visible group-hover/scene:opacity-100"',
 'onClick={() => scrollScene(1)}\n                  className="home-entry-scene-handle-right-action group/scene-handle absolute inset-0 z-[1] flex items-center justify-center transition-[visibility,opacity] duration-200 invisible opacity-0 group-hover/scene:visible group-hover/scene:opacity-100"',1)
# legal contact
t=t.replace('className="site-legal-footer-contact text-[12px] leading-relaxed text-[#999999] transition-colors hover:text-[#666666] cursor-pointer border-0 bg-transparent p-0"',
 'onClick={() => push({ tone: "neutral", title: "联系我们（演示）", description: "商务合作请发送邮件至 hello@example.com" })}\n              className="site-legal-footer-contact text-[12px] leading-relaxed text-[#999999] transition-colors hover:text-[#666666] cursor-pointer border-0 bg-transparent p-0"',1)
wr(p,t)

# ---------- depth-video-clone ----------
p="app/toolbox/depth-video-clone/page.tsx"; t=rd(p)
t=t.replace('className="depth-video-clone-fullscreen-toggle inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:text-foreground"',
 'onClick={() => push({ tone: "neutral", title: "已展开编辑（演示）", description: "全屏编辑态前端演示，无需后端。" })}\n                        className="depth-video-clone-fullscreen-toggle inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:text-foreground"',1)
t=t.replace('className="speech-input-controls-microphone flex h-[var(--toolbar-size,32px)] w-[var(--toolbar-size,32px)] shrink-0 touch-manipulation items-center justify-center rounded-full max-sm:h-[var(--toolbar-size,44px)] max-sm:w-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:w-[var(--toolbar-size,44px)] pointer-events-auto text-muted hover:bg-[#f1f1f1] disabled:cursor-not-allowed disabled:opacity-40"',
 'onClick={() => push({ tone: "neutral", title: "正在聆听…（演示）" })}\n                                  className="speech-input-controls-microphone flex h-[var(--toolbar-size,32px)] w-[var(--toolbar-size,32px)] shrink-0 touch-manipulation items-center justify-center rounded-full max-sm:h-[var(--toolbar-size,44px)] max-sm:w-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:w-[var(--toolbar-size,44px)] pointer-events-auto text-muted hover:bg-[#f1f1f1] disabled:cursor-not-allowed disabled:opacity-40"',1)
t=t.replace('className="toolbox-queue-clear-drafts inline-flex h-6 shrink-0 items-center bg-transparent p-0 text-[10px] leading-none text-muted transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-40"',
 'onClick={() => push({ tone: "neutral", title: "草稿已清空（演示）" })}\n              className="toolbox-queue-clear-drafts inline-flex h-6 shrink-0 items-center bg-transparent p-0 text-[10px] leading-none text-muted transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-40"',1)
wr(p,t)

# ---------- ecommerce mic ----------
p="app/toolbox/ecommerce-image-set/page.tsx"; t=rd(p)
old='className="speech-input-controls-microphone flex h-[var(--toolbar-size,32px)] w-[var(--toolbar-size,32px)] shrink-0 touch-manipulation items-center justify-center rounded-full max-sm:h-[var(--toolbar-size,44px)] max-sm:w-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:w-[var(--toolbar-size,44px)] pointer-events-auto text-muted hover:bg-[#f1f1f1] disabled:cursor-not-allowed disabled:opacity-40"'
assert old in t
t=t.replace(old,
 'onClick={() => push({ tone: "neutral", title: "正在聆听…（演示）" })}\n                          className="speech-input-controls-microphone flex h-[var(--toolbar-size,32px)] w-[var(--toolbar-size,32px)] shrink-0 touch-manipulation items-center justify-center rounded-full max-sm:h-[var(--toolbar-size,44px)] max-sm:w-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:h-[var(--toolbar-size,44px)] [@media(pointer:coarse)]:w-[var(--toolbar-size,44px)] pointer-events-auto text-muted hover:bg-[#f1f1f1] disabled:cursor-not-allowed disabled:opacity-40"',1)
wr(p,t)

# ---------- video-generation helpers ----------
p="app/toolbox/video-generation/page.tsx"; t=rd(p)
old_ph='className="milkdown-mention-editor-placeholder-action pointer-events-auto ml-1 inline cursor-pointer whitespace-nowrap p-0 font-normal transition-colors text-foreground hover:text-foreground"'
assert t.count(old_ph)==2, t.count(old_ph)
t=t.replace(old_ph,
 'onClick={() => { setPrompt("一位宇航员在霓虹城市中漫步，电影感，THE SUPER DIRECTOR 风格"); push({ tone: "success", title: "已填入示例提示词" }); }}\n                      className="milkdown-mention-editor-placeholder-action pointer-events-auto ml-1 inline cursor-pointer whitespace-nowrap p-0 font-normal transition-colors text-foreground hover:text-foreground"')
t=t.replace('className="video-generation-prompt-helper-button inline-flex h-7 items-center justify-center rounded-md bg-transparent px-2 text-xs font-semibold leading-none text-[#0471fe] shadow-none transition-colors hover:text-[#005bd3] disabled:pointer-events-none disabled:!text-muted disabled:opacity-60 disabled:hover:!text-muted"',
 'onClick={() => { setPrompt((v) => v || "城市夜景，雨后倒影，缓慢推镜，电影质感"); push({ tone: "success", title: "超级编导已润色（演示）" }); }}\n                      className="video-generation-prompt-helper-button inline-flex h-7 items-center justify-center rounded-md bg-transparent px-2 text-xs font-semibold leading-none text-[#0471fe] shadow-none transition-colors hover:text-[#005bd3] disabled:pointer-events-none disabled:!text-muted disabled:opacity-60 disabled:hover:!text-muted"',1)
t=t.replace('className="result-example-description-action inline cursor-pointer border-0 bg-transparent p-0 text-[#0471fe] [&_strong]:text-[#0471fe]"',
 'onClick={() => { setPrompt("城市夜景，雨后倒影，缓慢推镜，电影质感"); setTab("examples"); push({ tone: "success", title: "超级编导已填入提示词" }); }}\n                          className="result-example-description-action inline cursor-pointer border-0 bg-transparent p-0 text-[#0471fe] [&_strong]:text-[#0471fe]"',1)
wr(p,t)
print("done2")
