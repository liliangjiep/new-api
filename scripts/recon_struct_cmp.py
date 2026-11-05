# -*- coding: utf-8 -*-
"""对比 orig/local 的 (tag|class) 多重集（忽略深度），定位真实结构差异。"""
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
    sim = sum((oc & lc).values()) / max(1, sum(oc.values()))
    print(f"== {t[5:-5]} sim={sim:.4f} origN={sum(oc.values())} localN={sum(lc.values())}")
    for k, n in sorted((oc - lc).items()):
        print(f"   O x{n} <{k[0]}> {k[1][:150]}")
    for k, n in sorted((lc - oc).items()):
        print(f"   L x{n} <{k[0]}> {k[1][:150]}")
