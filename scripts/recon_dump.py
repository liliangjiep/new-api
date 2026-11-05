# -*- coding: utf-8 -*-
"""把 recon_capture.py 产出的 JSON 渲染为单行可读大纲（与 full_orig_root.txt 同风格）。"""
import json, sys

inp = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else None
data = json.load(open(inp, encoding="utf-8"))
lines = []


def pr(n, depth=0):
    r = n.get("r", [0, 0, 0, 0])
    a = n.get("a", {}) or {}
    bits = [f'{k}={a[k]}' for k in ("role", "aria-label", "type", "placeholder", "href") if a.get(k)]
    s = (
        "  " * depth
        + f'<{n["t"]} [{r[0]},{r[1]},{r[2]},{r[3]}] "{n.get("c","")}"'
        + (f' TEXT="{n.get("o","")}"' if n.get("o") else "")
        + (" {" + " ".join(bits) + "}" if bits else "")
    )
    lines.append(s)
    for k in n.get("k", []) or []:
        pr(k, depth + 1)


for root in data.get("roots", []):
    pr(root)

text = "\n".join(lines)
if out:
    open(out, "w", encoding="utf-8").write(text)
else:
    print(text)
