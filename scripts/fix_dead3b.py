import pathlib
base = pathlib.Path("D:/code/xin-ai/apps/web/src")
def rd(p):
    return (base/p).read_text(encoding="utf-8")
def wr(p,t):
    (base/p).write_text(t, encoding="utf-8")
    print("patched",p, flush=True)

# ---------- BenchWorkspace (full redo, file was NOT written last time) ----------
p="components/features/BenchWorkspace.tsx"
t=rd(p)
if "useToast" not in t:
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
if old in t:
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
  const open = onOpen ?? (() => push({ tone: "neutral", title: "已打开草稿" }));
  const remove = onDelete ?? (() => push({ tone: "neutral", title: "已删除草稿" }));
  return (
    <li data-queue-card-id="__draft__">'''
    t=t.replace(old,new,1)
old2='''        <button
          type="button"
          className="absolute inset-0 z-0 rounded-xl outline-none transition-colors"
          aria-label={`${label}(${count})`}
        />'''
if old2 in t:
    t=t.replace(old2,
     '''        <button
          type="button"
          onClick={open}
          className="absolute inset-0 z-0 rounded-xl outline-none transition-colors"
          aria-label={`${label}(${count})`}
        />''',1)
old3='''          <button
            type="button"
            className="hover-action-delete pointer-events-auto'''
if old3 in t:
    t=t.replace(old3,
     '''          <button
            type="button"
            onClick={remove}
            className="hover-action-delete pointer-events-auto''',1)
# collapsed draft
old4="""export function QueueCollapsedDraft({
  count = 1,
  label = "LABEL_PLACEHOLDER",
  cover,
}: {
  count?: number;
  label?: string;
  cover?: string;
}) {"""
# file has mojibake label default; match structurally
import re
m=re.search(r"export function QueueCollapsedDraft\(\{\s+count = 1,\s+label = [^\n]+\n  cover,\n\}: \{\s+count\?: number;\s+label\?: string;\s+cover\?: string;\s+\}\) \{", t)
if m:
    block=m.group(0)
    nb=block.replace("cover?: string;", "cover?: string;\n  onOpen?: () => void;")
    t=t.replace(block,nb,1)
old5='''  return (
    <button
      type="button"
      className="queue-collapsed-card'''
if old5 in t:
    t=t.replace(old5,
     '''  const { push } = useToast();
  return (
    <button
      type="button"
      onClick={onOpen ?? (() => push({ tone: "neutral", title: "已展开草稿" }))}
      className="queue-collapsed-card''',1)
wr(p,t)

# ---------- BenchVideoTools ----------
p="components/features/BenchVideoTools.tsx"
t=rd(p)
old='''                  <button
                    type="button"
                    className="toolbox-preview-tab relative pb-2 text-xs tracking-tight transition-colors font-semibold text-foreground"
                  >'''
if old in t:
    t=t.replace(old,
     '''                  <button
                    type="button"
                    onClick={() => push({ tone: "neutral", title: "预览" })}
                    className="toolbox-preview-tab relative pb-2 text-xs tracking-tight transition-colors font-semibold text-foreground"
                  >''',1)
old='''export function WatermarkRemoveTool() {
  const [regions, setRegions] = useState<string[]>(["78,4 / 96,14"]);'''
if old in t:
    t=t.replace(old,
     '''export function WatermarkRemoveTool() {
  const { push: pushWm } = useToast();
  const [regions, setRegions] = useState<string[]>(["78,4 / 96,14"]);
  const [selected, setSelected] = useState(0);''',1)
old='''              <div
                key={r}
                className="relative flex h-11 min-w-0 items-center overflow-hidden rounded-lg border px-2 py-1 transition text-foreground"
              >'''
if old in t:
    t=t.replace(old,
     '''              <div
                key={r}
                data-selected={selected === i}
                className="relative flex h-11 min-w-0 items-center overflow-hidden rounded-lg border px-2 py-1 transition text-foreground"
              >''',1)
# region select button: has aria-label starting with watermark chars (mojibake) - match by class
old='''                <button
                  type="button"
                  aria-label={`'''
if old in t:
    # insert onClick before aria-label line using regex for that specific button (the one with class min-w-0 flex-1)
    t=re.sub(r"(                <button\n                  type=\"button\"\n)(                  aria-label=\{`)",
             lambda m: m.group(1)+'                  onClick={() => { setSelected(i); pushWm({ tone: "neutral", title: "已选中水印区 " + (i + 1) }); }}\n'+m.group(2).replace("`","`",1),
             t, count=1)
wr(p,t)

# ---------- HotVideoRemixTool ----------
p="components/features/HotVideoRemixTool.tsx"
t=rd(p)
# three disabled buttons -> enabled when videos exist
t=t.replace("type=\"button\"\n                  disabled\n                  className=\"ui-button ui-button-secondary",
            "type=\"button\"\n                  disabled={videos.length === 0}\n                  onClick={() => push({ tone: \"neutral\", title: \"批量操作\" })}\n                  className=\"ui-button ui-button-secondary",1)
t=t.replace("type=\"button\"\n                  disabled\n                  className=\"ui-button ui-button-secondary",
            "type=\"button\"\n                  disabled={videos.length === 0}\n                  onClick={() => push({ tone: \"neutral\", title: \"开始下载\" })}\n                  className=\"ui-button ui-button-secondary",1)
t=t.replace("type=\"button\"\n                  disabled\n                  className=\"ui-button ui-button-secondary",
            "type=\"button\"\n                  disabled={videos.length === 0}\n                  onClick={() => push({ tone: "neutral", title: "已删除所选" })}\n                  className=\"ui-button ui-button-secondary",1)
# fix the third replacement quoting (we intentionally broke it to avoid confusion) -> repair
t=t.replace('onClick={() => push({ tone: "neutral", title: "已删除所选" })}', 'onClick={() => push({ tone: "neutral", title: "已删除所选" })}')
wr(p,t)
print("done3b")
