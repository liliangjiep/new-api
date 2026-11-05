# -*- coding: utf-8 -*-
"""打印 region JSON（recon_region.py 产物）里的节点树。
用法: python scripts/recon_tree_of.py <file.json> [class-substring]
"""
import json, sys

d = json.load(open(sys.argv[1], encoding="utf-8"))
want = sys.argv[2] if len(sys.argv) > 2 else ""


def walk(n, dep=0):
    if not isinstance(n, dict):
        return
    c = n.get("cls", "")
    own = (n.get("own", "") or "")[:40]
    print("  " * dep + "%s | %s | %s" % (n.get("t"), c[:52], own[:40]), n.get("r"))
    for k in n.get("kids", []) or []:
        walk(k, dep + 1)


root = d.get("root")
if not root:
    print("no root")
elif want:
    def find(n):
        if want in n.get("cls", ""):
            return n
        for k in n.get("kids", []) or []:
            r = find(k)
            if r:
                return r
        return None
    n = find(root)
    walk(n) if n else print("not found")
else:
    walk(root)
