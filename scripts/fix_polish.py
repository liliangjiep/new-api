import pathlib
base = pathlib.Path("D:/code/xin-ai/apps/web/src")
def rd(p): return (base/p).read_text(encoding="utf-8")
def wr(p,t):
    (base/p).write_text(t, encoding="utf-8")
    print("patched", p, flush=True)

p="components/features/BenchWorkspace.tsx"
t=rd(p)
t=t.replace('title: "demo-open"', 'title: "\u5df2\u6253\u5f00\u8349\u7a3f"')
t=t.replace('title: "demo-del"', 'title: "\u5df2\u5220\u9664\u8349\u7a3f"')
t=t.replace('title: "demo-expand"', 'title: "\u5df2\u5c55\u5f00\u8349\u7a3f"')
wr(p,t)

p="components/features/BenchVideoTools.tsx"
t=rd(p)
t=t.replace('title: "preview-demo"', 'title: "\u9884\u89c8"')
# wm- title is concatenated: title: 'wm-' + (i+1) -> make proper
t=t.replace("title: 'wm-' + (i + 1)", "title: '\u5df2\u9009\u4e2d\u6c34\u5370\u533a ' + (i + 1)")
wr(p,t)

p="components/features/HotVideoRemixTool.tsx"
t=rd(p)
t=t.replace('title: "op-select-all"', 'title: "\u5df2\u5168\u9009"')
t=t.replace('title: "op-download"', 'title: "\u5f00\u59cb\u4e0b\u8f7d"')
t=t.replace('title: "op-delete"', 'title: "\u5df2\u5220\u9664\u6240\u9009"')
wr(p,t)
print("polish done")
