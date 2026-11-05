# -*- coding: utf-8 -*-
"""打印原站 HTML 中 class 含指定 token 的元素的完整 class 串（去重）。"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

html_file = sys.argv[1]
needles = sys.argv[2:]

h = open(html_file, encoding="utf-8", errors="replace").read()
seen = set()
for m in re.finditer(r'class="([^"]*)"', h):
    c = " ".join(m.group(1).split())
    if any(n in c.split() or n in c for n in needles):
        if c in seen:
            continue
        seen.add(c)
        print(c)
        print("-----")
