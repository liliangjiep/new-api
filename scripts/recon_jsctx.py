# -*- coding: utf-8 -*-
"""在 JS chunk 中围绕关键字打印上下文。
用法: python scripts/recon_jsctx.py <jsfile> <keyword> [radius] [occurrences]
"""
import re, sys

path = sys.argv[1]
key = sys.argv[2]
radius = int(sys.argv[3]) if len(sys.argv) > 3 else 1500
maxn = int(sys.argv[4]) if len(sys.argv) > 4 else 3

src = open(path, encoding="utf-8", errors="replace").read()
n = 0
for m in re.finditer(re.escape(key), src):
    n += 1
    if n > maxn:
        break
    s = max(0, m.start() - radius)
    print("=" * 30, key, "#", n, "at", m.start())
    print(src[s:m.start() + radius])
    print()
