# -*- coding: utf-8 -*-
"""把 region JSON 打印成可读大纲（含 class / 尺寸 / 关键样式）。"""
import json, sys

d = json.load(open(sys.argv[1], encoding="utf-8"))
if "error" in d:
    print("ERROR", d["error"]); sys.exit(1)

KEEP = ["display","flexDirection","gap","padding","position","width","height","minWidth","maxWidth",
        "backgroundColor","color","borderRadius","border","fontSize","fontWeight","lineHeight",
        "overflow","gridTemplateColumns","gridTemplateRows","alignItems","justifyContent","boxShadow","textAlign","flexWrap"]

SKIP = ("none","auto","normal","0px","rgba(0, 0, 0, 0)","static","visible","row","baseline","start","0s","1")

def pr(n, depth=0):
    r = n.get("r", [0,0,0,0])
    s = n.get("style", {}) or {}
    keep = {k: s[k] for k in KEEP if k in s and s[k] not in SKIP}
    a = n.get("attrs") or {}
    line = "  "*depth + f'<{n["t"]} {r} "{n.get("cls","")[:110]}"'
    if n.get("own"): line += f' TEXT="{n["own"][:120]}"'
    if a: line += " " + str(a)[:220]
    print(line)
    if keep:
        print("  "*(depth+1) + "S: " + json.dumps(keep, ensure_ascii=False))
    for k in n.get("kids", []):
        pr(k, depth+1)

pr(d["root"])
