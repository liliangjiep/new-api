# -*- coding: utf-8 -*-
import re, sys, io, json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
t = open(sys.argv[1], encoding="utf-8").read()
t = re.sub(r"(data:image/[^;]+;base64,)[A-Za-z0-9+/=]{20,}", r"\1<B64>", t)
t = re.sub(r"<img[^>]*/?>", "<img/>", t)

items = re.split(r'<div class="ui-waterfall-item ', t)[1:]
icons = {}
for it in items:
    m = re.search(r'discover-card-type-icon[^>]*>(.*?)</svg>', it, re.S)
    if m:
        icons.setdefault(m.group(1).strip(), 0)
        icons[m.group(1).strip()] += 1
for k, v in icons.items():
    print(f"--- used {v}x ---")
    print(k)
    print()
