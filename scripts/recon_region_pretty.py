# -*- coding: utf-8 -*-
"""把 recon_region 抓到的区域 JSON 渲染成可读文本。
用法: python scripts/recon_region_pretty.py <in.json> [out.txt]
"""
import json
import sys

inp = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else None
data = json.load(open(inp, encoding="utf-8"))
lines = []


def pr(n, depth=0):
    r = n.get("r", [0, 0, 0, 0])
    c = n.get("cls") or n.get("c") or ""
    a = n.get("attrs") or n.get("a") or {}
    bits = " ".join("%s=%s" % (k, v) for k, v in a.items())
    own = n.get("own", "")
    s = "%s<%s [%d,%d,%d,%d]" % ("  " * depth, n.get("t"), r[0], r[1], r[2], r[3])
    if c:
        s += " ." + c
    if own:
        s += ' "%s"' % own
    if bits:
        s += " [" + bits + "]"
    lines.append(s)
    for k in n.get("kids") or n.get("k") or []:
        pr(k, depth + 1)


pr(data.get("root") or data)
text = "\n".join(lines)
if out:
    open(out, "w", encoding="utf-8").write(text)
else:
    print(text)
