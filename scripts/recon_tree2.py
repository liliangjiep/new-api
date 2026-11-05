# -*- coding: utf-8 -*-
"""打印某个 capture json 的节点树。"""
import json, sys

def show(n, d=0):
    r = n.get("r", [])
    txt = n.get("o", "")
    a = n.get("a", {})
    lbl = txt or a.get("aria-label") or a.get("href") or a.get("placeholder") or ""
    print("  " * d + f"{n.get('t')} .{n.get('c','')} [{r[0]},{r[1]},{r[2]},{r[3]}] {lbl[:40]}")
    for k in n.get("k", []):
        show(k, d + 1)

doc = json.load(open(sys.argv[1], encoding="utf-8"))
maxd = int(sys.argv[2]) if len(sys.argv) > 2 else 99
cl = sys.argv[3] if len(sys.argv) > 3 else None

def walk(n, d=0):
    if d > maxd:
        return
    c = n.get("c", "")
    if cl and cl not in c:
        for k in n.get("k", []):
            walk(k, d + 1)
        return
    show(n, d)

for r in doc.get("roots", []):
    walk(r)
