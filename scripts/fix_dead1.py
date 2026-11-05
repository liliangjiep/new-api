import pathlib
def patch(path, pairs):
    p = pathlib.Path(path)
    t = p.read_text(encoding='utf-8')
    for old, new in pairs:
        assert old in t, f"NOT FOUND in {path}: {old[:80]!r}"
        t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print("patched", path)

base = "D:/code/xin-ai/apps/web/src"

# 1. PromptComposer: fullscreen + mic + myOpen panel
patch(f"{base}/components/features/PromptComposer.tsx", [
  ('  const [myOpen, setMyOpen] = useState(false);\n  const [saved, setSaved] = useState<string[]>([]);',
   '  const [myOpen, setMyOpen] = useState(false);\n  const [saved, setSaved] = useState<string[]>([]);\n  const [expanded, setExpanded] = useState(false);\n  const [speechOn, setSpeechOn] = useState(false);'),
  ('''              <button
                type="button"
                aria-label="展开编辑"
                className={''',
   '''              <button
                type="button"
                aria-label="展开编辑"
                onClick={() => setExpanded(true)}
                className={'''),
  ('''              <button
                type="button"
                aria-label="语音输入"
                className="speech-input-controls-microphone''',
   '''              <button
                type="button"
                aria-label="语音输入"
                onClick={() => {
                  setSpeechOn((v) => !v);
                  push({ tone: "neutral", title: speechOn ? "语音输入已停止（演示）" : "正在聆听…（演示）", description: "前端复刻演示，无需后端即可交互。" });
                }}
                data-speech-active={speechOn}
                className="speech-input-controls-microphone'''),
  ('''    <>
    <AssetPickerModal''',
   '''    <>
    {expanded ? (
      <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="展开编辑">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-xl border border-line bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <span className="text-sm font-semibold">展开编辑（演示）</span>
            <button type="button" aria-label="关闭展开编辑" onClick={() => setExpanded(false)} className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-muted hover:text-foreground">关闭</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 text-sm text-muted">提示词编辑器全屏演示。全屏态可正常关闭，无需后端。</div>
        </div>
      </div>
    ) : null}
    {myOpen ? (
      <div className="absolute right-0 top-9 z-[90] w-64 rounded-xl border border-line bg-background p-2 shadow-xl" role="dialog" aria-label="我的提示词">
        <p className="px-2 py-1 text-xs font-semibold text-muted">我的提示词（演示）</p>
        {saved.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted">暂无保存，点击左侧下载图标即可保存一条演示。</p>
        ) : saved.map((s) => (
          <p key={s} className="truncate px-2 py-1 text-xs">{s}</p>
        ))}
        <button type="button" onClick={() => setMyOpen(false)} className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs font-semibold text-muted hover:bg-muted hover:text-foreground">关闭</button>
      </div>
    ) : null}
    <AssetPickerModal'''),
])
# save action also records an entry
patch(f"{base}/components/features/PromptComposer.tsx", [
  ('''                onClick={() => {
                  push({ tone: "success", title: "已保存到我的提示词" });
                }}''',
   '''                onClick={() => {
                  setSaved((p) => [`提示词 ${p.length + 1} · ${new Date().toLocaleTimeString()}`, ...p].slice(0, 5));
                  push({ tone: "success", title: "已保存到我的提示词" });
                }}'''),
])
print("done1")
