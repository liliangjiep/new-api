# -*- coding: utf-8 -*-
"""打印 recon_region.py 产出的 JSON 结构树。"""
import json, sys

d = json.load(open(sys.argv[1], encoding="utf-8"))
if "error" in d:
    print("ERROR", d["error"]); sys.exit()

SKIP = ("none", "auto", "normal", "0px", "rgba(0, 0, 0, 0)", "static", "visible",
        "row", "baseline", "start", "stretch", "wrap", "0s", "1", "medium",
        "0", "bold 400", "normal 400")


def pr(n, depth=0):
    r = n.get("r", [0, 0, 0, 0])
    s = n.get("style", {})
    keep = {k: v for k, v in s.items() if v not in SKIP and v not in ("nowrap", "flex-start", "center", "column", "0px 0px 0px 0px")}
    print("  " * depth + f'<{n["t"]} {r} cls={n["cls"][:80]!r}'
          + (f' TEXT={n["own"]!r}' if n.get("own") else "")
          + (f' {n["attrs"]}' if n.get("attrs") else ""))
    if keep:
        print("  " * (depth + 1) + json.dumps(keep, ensure_ascii=False))
    for k in n.get("kids", []):
        pr(k, depth + 1)


pr(d["root"])
