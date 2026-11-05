# -*- coding: utf-8 -*-
"""列出原站瀑布流每一项的 transform/width 与标题。"""
import re, sys, io, json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
t = open(sys.argv[1], encoding="utf-8").read()
t = re.sub(r"(data:image/[^;]+;base64,)[A-Za-z0-9+/=]{20,}", r"\1<B64>", t)
t = re.sub(r"<img[^>]*/?>", "<img/>", t)

items = re.split(r'<div class="ui-waterfall-item ', t)[1:]
out = []
for it in items:
    style = re.search(r'style="([^"]*)"', it)
    title = re.search(r'<span class="font-semibold">([^<]*)</span>', it)
    desc = re.search(r'<span class="font-normal text-white/80">([^<]*)</span>', it)
    likes = re.search(r'aria-label="点赞".*?</svg>\s*([\d.]+[wk]?)', it, re.S)
    kind = "video" if "m16.5 10 4-3" in it else ("image" if "M7 3.5v17" in it else ("canvas" if "M3 7h18" in it else "?"))
    out.append({
        "style": style.group(1) if style else "",
        "title": title.group(1) if title else "",
        "desc": desc.group(1) if desc else "",
        "likes": likes.group(1) if likes else "",
        "kind": kind,
    })
print(json.dumps(out, ensure_ascii=False, indent=1))
print("count", len(out))
