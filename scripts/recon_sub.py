# -*- coding: utf-8 -*-
"""打印 capture json 中匹配 class 的子树（含深度限制）。"""
import json, sys

def show(n, d=0, maxd=99):
    r = n.get("r", [])
    txt = n.get("o", "")
    a = n.get("a", {})
    lbl = txt or a.get("aria-label") or a.get("href") or a.get("placeholder") or ""
    print("  " * d + f"{n.get('t')} .{n.get('c','')} [{r[0]},{r[1]},{r[2]},{r[3]}] {lbl[:50]}")
    if d >= maxd:
        return
    for k in n.get("k", []):
        show(k, d + 1, maxd)

doc = json.load(open(sys.argv[1], encoding="utf-8"))
target = sys.argv[2]
maxd = int(sys.argv[3]) if len(sys.argv) > 3 else 6
limit = int(sys.argv[4]) if len(sys.argv) > 4 else 3

count = 0

def walk(n, d=0):
    global count
    if count >= limit:
        return
    if target in n.get("c", ""):
        count += 1
        show(n, 0, maxd)
        print("---")
        return
    for k in n.get("k", []):
        walk(k, d + 1)

for r in doc.get("roots", []):
    walk(r)
