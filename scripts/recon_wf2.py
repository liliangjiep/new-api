# -*- coding: utf-8 -*-
"""合并原站瀑布流的 DOM(内容) 与几何(位置尺寸)，输出 JSON。"""
import re, sys, io, json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

html = open(sys.argv[1], encoding="utf-8").read()
html = re.sub(r"(data:image/[^;]+;base64,)[A-Za-z0-9+/=]{20,}", r"\1<B64>", html)
html = re.sub(r"<img[^>]*/?>", "<img/>", html)

doc = json.load(open(sys.argv[2], encoding="utf-8"))

geo = []
def walk(n):
    c = n.get("c", "")
    if "ui-waterfall-item" in c and "measure" not in c:
        geo.append(n.get("r"))
    for k in n.get("k", []):
        walk(k)
for r in doc.get("roots", []):
    walk(r)

chunks = re.split(r'<div class="ui-waterfall-item ', html)[1:]

ICON_VIDEO = "m16.5 10 4-3"
ICON_CANVAS = "M7 3.5v17"
ICON_IMAGE = "rect x=\"3.5\" y=\"5\""

out = []
for i, it in enumerate(chunks):
    style = re.search(r'style="([^"]*)"', it)
    title = re.search(r'<span class="font-semibold">([^<]*)</span>', it)
    desc = re.search(r'<span class="font-normal text-white/80">([^<]*)</span>', it)
    likes = re.search(r'aria-label="点赞".*?</svg>([\d.]+[wk]?)', it, re.S)
    if ICON_VIDEO in it:
        kind = "video"
    elif ICON_CANVAS in it:
        kind = "canvas"
    elif ICON_IMAGE in it:
        kind = "image"
    else:
        kind = "?"
    g = geo[i] if i < len(geo) else [0, 0, 0, 0]
    out.append({
        "x": g[0], "y": g[1], "w": g[2], "h": g[3],
        "style": style.group(1) if style else "",
        "title": title.group(1) if title else "",
        "desc": desc.group(1) if desc else "",
        "likes": likes.group(1) if likes else "",
        "kind": kind,
        "isVideoCover": "discover-card-video-cover" in it,
    })

print(json.dumps(out, ensure_ascii=False, indent=1))
print("count", len(out), "geo", len(geo))
