# -*- coding: utf-8 -*-
"""把 recon_page_outline 抓到的 JSON 大纲渲染成可读文本（逐行单行输出，便于 grep）。
用法: python scripts/recon_pretty.py <in.json> [out.txt]
"""
import json, sys

inp = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else None
data = json.load(open(inp, encoding="utf-8"))
lines = []


def pr(n, depth=0):
    r = n.get("r", [0, 0, 0, 0])
    bits = [f'{k}={n["a"][k]}' for k in ("role", "aria-label", "type", "placeholder", "href") if n.get("a", {}).get(k)]
    s = (
        "  " * depth
        + f'<{n["t"]} [{r[0]},{r[1]},{r[2]},{r[3]}] "{n.get("c","")}"'
        + (f' TEXT="{n["own"]}"' if n.get("own") else "")
        + (" {" + " ".join(bits) + "}" if bits else "")
    )
    if n.get("a", {}).get("src"):
        s += f' src={n["a"]["src"]}'
    lines.append(s)
    for k in n.get("kids", []):
        pr(k, depth + 1)


for root in data["roots"]:
    pr(root)

text = "\n".join(lines)
if out:
    open(out, "w", encoding="utf-8").write(text)
else:
    print(text)
