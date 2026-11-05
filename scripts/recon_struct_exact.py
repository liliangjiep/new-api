# -*- coding: utf-8 -*-
"""对比 orig/local 的完整 class 串多重集（不排序），定位"分组"差异。"""
import json, os, sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

OUT = ".recon/struct"
for t in sorted(os.listdir(OUT)):
    if not t.startswith("orig_") or not t.endswith(".json"):
        continue
    o = json.load(open(f"{OUT}/{t}", encoding="utf-8"))
    l = json.load(open(f"{OUT}/local_{t[5:]}", encoding="utf-8"))

    def keyset(items):
        c = Counter()
        for x in items:
            _, tag, cls = x.split("|", 2)
            c[(tag, cls)] += 1
        return c

    oc, lc = keyset(o), keyset(l)
    only_o = oc - lc
    only_l = lc - oc
    if not only_o and not only_l:
        continue
    print(f"\n===== {t[5:-5]}")
    for (tag, cls), n in sorted(only_o.items()):
        print(f"  O x{n} <{tag}> {cls}")
    for (tag, cls), n in sorted(only_l.items()):
        print(f"  L x{n} <{tag}> {cls}")
