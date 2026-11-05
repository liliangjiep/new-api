import pathlib, re
base = pathlib.Path("D:/code/xin-ai/apps/web/src")
def rd(p): return (base/p).read_text(encoding="utf-8")
def wr(p,t): (base/p).write_text(t, encoding="utf-8"); print("patched",p)

# ---------- WorkspaceShell ----------
p="components/features/WorkspaceShell.tsx"; t=rd(p)
t=t.replace('import { LoginModal } from "@/components/features/LoginModal";',
 'import { LoginModal } from "@/components/features/LoginModal";\nimport { useToast } from "@/components/features/ToastHost";',1)
t=t.replace('export function AgentNavigationContent() {\n  return (',
 'export function AgentNavigationContent() {\n  const { push } = useToast();\n  const [recentOpen, setRecentOpen] = useState(true);\n  return (',1)
t=t.replace('className="option-item-action flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left cursor-pointer"\n          >',
 'onClick={() => push({ tone: "neutral", title: "已新建对话（演示）", description: "前端复刻演示，无需后端即可交互。" })}\n            className="option-item-action flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left cursor-pointer"\n          >',1)
t=t.replace('aria-expanded={true}\n              className="workspace-navigation-section-toggle',
 'aria-expanded={recentOpen}\n              onClick={() => setRecentOpen((v) => !v)}\n              className="workspace-navigation-section-toggle',1)
old='''          <div
            aria-hidden="false"
            className="workspace-navigation-section-content grid transition-[grid-template-rows,opacity] duration-150 ease-out motion-reduce:transition-none grid-rows-[1fr] opacity-100"
          >'''
new='''          <div
            aria-hidden={!recentOpen}
            className={`workspace-navigation-section-content grid transition-[grid-template-rows,opacity] duration-150 ease-out motion-reduce:transition-none ${recentOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          >'''
assert old in t, "agent recent content not found"
t=t.replace(old,new,1)
t=t.replace('}) {\n  const titleId',
 '}) {\n  const { push } = useToast();\n  const titleId',1)
old='''className="workspace-navigation-toggle flex mr-1 h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
                >'''
new='''className="workspace-navigation-toggle flex mr-1 h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
                  onClick={() => push({ tone: "neutral", title: "已固定面板（演示）" })}
                >'''
assert old in t, "floating pin not found"
t=t.replace(old,new,1)
wr(p,t)

# ---------- BenchWorkspace ----------
p="components/features/BenchWorkspace.tsx"; t=rd(p)
t=t.replace('import { WorkspaceShell } from "@/components/features/WorkspaceShell";',
 'import { WorkspaceShell } from "@/components/features/WorkspaceShell";\nimport { useToast } from "@/components/features/ToastHost";',1)
old='''}: {
  count?: number;
  date?: string;
  time?: string;
  label?: string;
  cover?: string;
}) {
  return (
    <li data-queue-card-id="__draft__">'''
new='''  onOpen?: () => void;
  onDelete?: () => void;
}: {
  count?: number;
  date?: string;
  time?: string;
  label?: string;
  cover?: string;
  onOpen?: () => void;
  onDelete?: () => void;
}) {
  const { push } = useToast();
  const open = onOpen ?? (() => push({ tone: "neutral", title: "已打开草稿（演示）" }));
  const remove = onDelete ?? (() => push({ tone: "neutral", title: "已删除草稿（演示）" }));
  return (
    <li data-queue-card-id="__draft__">'''
assert old in t, "draft props not found"
t=t.replace(old,new,1)
old='''        <button
          type="button"
          className="absolute inset-0 z-0 rounded-xl outline-none transition-colors"
          aria-label={`${label}(${count})`}
        />'''
new='''        <button
          type="button"
          onClick={open}
          className="absolute inset-0 z-0 rounded-xl outline-none transition-colors"
          aria-label={`${label}(${count})`}
        />'''
assert old in t, "draft hitarea not found"
t=t.replace(old,new,1)
old='''          <button
            type="button"
            className="hover-action-delete pointer-events-auto'''
new='''          <button
            type="button"
            onClick={remove}
            className="hover-action-delete pointer-events-auto'''
assert old in t, "draft delete not found"
t=t.replace(old,new,1)
old='''  cover?: string;
}) {
  return (
    <button
      type="button"
      className="queue-collapsed-card'''
new='''  cover?: string;
  onOpen?: () => void;
}) {
  const { push } = useToast();
  return (
    <button
      type="button"
      onClick={onOpen ?? (() => push({ tone: "neutral", title: "已展开草稿（演示）" }))}
      className="queue-collapsed-card'''
assert old in t, "collapsed draft not found"
t=t.replace(old,new,1)
# fix the type annotation of collapsed draft (add onOpen field)
old='''}: {
  count?: number;
  label?: string;
  cover?: string;
}) {
  const { push } = useToast();'''
new='''}: {
  count?: number;
  label?: string;
  cover?: string;
  onOpen?: () => void;
}) {
  const { push } = useToast();'''
assert old in t, "collapsed type not found"
t=t.replace(old,new,1)
wr(p,t)

# ---------- BenchVideoTools ----------
p="components/features/BenchVideoTools.tsx"; t=rd(p)
old='''                  <button
                    type="button"
                    className="toolbox-preview-tab relative pb-2 text-xs tracking-tight transition-colors font-semibold text-foreground"
                  >'''
new='''                  <button
                    type="button"
                    onClick={() => push({ tone: "neutral", title: "预览（演示）", description: "提交任务后，这里会展示处理结果。" })}
                    className="toolbox-preview-tab relative pb-2 text-xs tracking-tight transition-colors font-semibold text-foreground"
                  >'''
assert old in t, "preview tab not found"
t=t.replace(old,new,1)
old='''export function WatermarkRemoveTool() {
  const [regions, setRegions] = useState<string[]>(["78,4 / 96,14"]);'''
new='''export function WatermarkRemoveTool() {
  const { push } = useToast();
  const [regions, setRegions] = useState<string[]>(["78,4 / 96,14"]);
  const [selected, setSelected] = useState(0);'''
assert old in t, "watermark state not found"
t=t.replace(old,new,1)
old='''              <div
                key={r}
                className="relative flex h-11 min-w-0 items-center overflow-hidden rounded-lg border px-2 py-1 transition text-foreground"
              >'''
new='''              <div
                key={r}
                data-selected={selected === i}
                className={`relative flex h-11 min-w-0 items-center overflow-hidden rounded-lg border px-2 py-1 transition text-foreground ${selected === i ? "border-accent-deep" : ""}`}
              >'''
assert old in t, "region wrapper not found"
t=t.replace(old,new,1)
pat='(\n                <button\n                  type="button"\n)(                  aria-label=\\{`[^`]*`\\}\n)(                  className="min-w-0 flex-1 rounded-md pr-4 text-left")'
m=re.search(pat,t)
assert m, "region button not found"
t=t[:m.start()]+m.group(1)+'                  aria-pressed={selected === i}\n                  onClick={() => { setSelected(i); push({ tone: "neutral", title: `已选中水印区 ${i + 1}（演示）` }); }}\n'+m.group(3)+t[m.end():]
wr(p,t)

# ---------- HotVideoRemixTool ----------
p="components/features/HotVideoRemixTool.tsx"; t=rd(p)
old='''                <button
                  type="button"
                  disabled
                  className="ui-button ui-button-secondary inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold text-foreground backdrop-blur-sm hover:bg-surface disabled:pointer-events-none disabled:opacity-55"
                >
                  <span className="mr-1.5 grid h-3.5 w-3.5 place-items-center rounded border border-line bg-surface/90" />'''
new='''                <button
                  type="button"
                  disabled={videos.length === 0}
                  onClick={() => push({ tone: "neutral", title: "已全选（演示）", description: "前端复刻演示：批量选择无需后端。" })}
                  className="ui-button ui-button-secondary inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold text-foreground backdrop-blur-sm hover:bg-surface disabled:pointer-events-none disabled:opacity-55"
                >
                  <span className="mr-1.5 grid h-3.5 w-3.5 place-items-center rounded border border-line bg-surface/90" />'''
assert old in t, "select-all not found"
t=t.replace(old,new,1)
old='''                <button
                  type="button"
                  disabled
                  className="ui-button ui-button-secondary inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold text-foreground backdrop-blur-sm hover:bg-surface disabled:pointer-events-none disabled:opacity-55"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="mr-1 h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"'''
new='''                <button
                  type="button"
                  disabled={videos.length === 0}
                  onClick={() => push({ tone: "neutral", title: "开始下载（演示）", description: "前端复刻演示：文件导出无需后端。" })}
                  className="ui-button ui-button-secondary inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold text-foreground backdrop-blur-sm hover:bg-surface disabled:pointer-events-none disabled:opacity-55"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="mr-1 h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"'''
assert old in t, "download not found"
t=t.replace(old,new,1)
old='''                <button
                  type="button"
                  disabled
                  className="ui-button ui-button-secondary inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold text-foreground backdrop-blur-sm hover:bg-surface disabled:pointer-events-none disabled:opacity-55"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="mr-1 h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"'''
new='''                <button
                  type="button"
                  disabled={videos.length === 0}
                  onClick={() => push({ tone: "neutral", title: "已删除所选（演示）" })}
                  className="ui-button ui-button-secondary inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold text-foreground backdrop-blur-sm hover:bg-surface disabled:pointer-events-none disabled:opacity-55"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                    data-slot="icon"
                    className="mr-1 h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"'''
assert old in t, "delete not found"
t=t.replace(old,new,1)
wr(p,t)
print("done3")
