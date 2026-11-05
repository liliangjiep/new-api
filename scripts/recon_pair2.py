# -*- coding: utf-8 -*-
"""按语义锚点 class 配对 orig/local，输出两侧完整 class 串差异。"""
import json, os, sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

OUT = ".recon/struct"
for t in sorted(os.listdir(OUT)):
    if not t.startswith("orig_") or not t.endswith(".json"):
        continue
    o = json.load(open(f"{OUT}/{t}", encoding="utf-8"))
    l = json.load(open(f"{OUT}/local_{t[5:]}", encoding="utf-8"))

    def index(items):
        d = {}
        for x in items:
            _, tag, cls = x.split("|", 2)
            toks = set(cls.split())
            # 语义锚点：带 '-' 的项目类名（去掉工具类后剩下的业务类）
            sem = [k for k in toks if "-" in k and not any(
                c in k for c in "[]:/#%.")]
            d.setdefault((tag, tuple(sorted(sem))), []).append(cls)
        return d

    oi, li = index(o), index(l)
    diffs = []
    for k in oi:
        if k not in li:
            continue
        oc, lc = Counter(oi[k]), Counter(li[k])
        if oc != lc:
            diffs.append((k, oc, lc))
    if not diffs:
        continue
    print(f"\n===== {t[5:-5]}")
    for (tag, sem), oc, lc in diffs:
        for cls, n in oc.items():
            if lc.get(cls, 0) != n:
                print(f"  O x{n} <{tag}> {cls}")
        for cls, n in lc.items():
            if oc.get(cls, 0) != n:
                print(f"  L x{n} <{tag}> {cls}")
