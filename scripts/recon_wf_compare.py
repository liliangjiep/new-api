# -*- coding: utf-8 -*-
"""对比原站瀑布流实测几何 与 我们 discover-data.ts 的数据。
用法: python scripts/recon_wf_compare.py
"""
import json, re, sys, os

ORIG = ".recon/wf_orig.json"
OURS = "apps/web/src/app/discover-data.ts"


def load_ours():
    s = open(OURS, encoding="utf-8").read()
    i = s.find("DISCOVER_ITEMS: DiscoverItem[] = [")
    j = s.find("];", i)
    body = s[i:j]
    items = []
    for m in re.finditer(r'\{\s*x:\s*(-?[\d.]+),\s*y:\s*(-?[\d.]+),\s*w:\s*(-?[\d.]+),\s*h:\s*(-?[\d.]+),.*?cover:\s*"([^"]+)"', body, re.S):
        items.append(dict(x=float(m.group(1)), y=float(m.group(2)),
                          w=float(m.group(3)), h=float(m.group(4)), cover=m.group(5)))
    return items


def main():
    orig = json.load(open(ORIG, encoding="utf-8"))
    ours = load_ours()
    oi = orig["items"]
    print(f"orig items={len(oi)}  ours items={len(ours)}")
    print(f"orig wfStyle={orig.get('wfStyle')}")
    print()
    print(f"{'#':>3} {'orig x,y,w,h':<26} {'ours x,y,w,h':<26} {'origAspect':<12} {'Δh':>7}  cover")
    for i in range(max(len(oi), len(ours))):
        o = oi[i] if i < len(oi) else None
        u = ours[i] if i < len(ours) else None
        orect = o["rect"] if o else None
        urect = [u["x"], u["y"], u["w"], u["h"]] if u else None
        aspect = ""
        if o and o.get("nat") and o["nat"][0]:
            aspect = f'{o["nat"][0]}x{o["nat"][1]}'
        dh = ""
        if o and u:
            dh = f'{u["h"] - o["rect"][3]:+.1f}'
        print(f"{i:>3} {str(orect):<26} {str(urect):<26} {aspect:<12} {dh:>7}  {(u or {}).get('cover','')}")
    print()
    # 原站 masonry 规则反推：列数、列宽、gap、每列 y 累加
    if oi:
        xs = sorted({round(o["rect"][0], 1) for o in oi})
        print("orig columns x:", xs)
        print("orig col width :", oi[0]["rect"][2])
        if len(xs) > 1:
            print("orig col gap   :", round(xs[1] - xs[0] - oi[0]["rect"][2], 2))
        # 校验高度 == 宽 * natH/natW
        bad = 0
        for o in oi:
            if not o.get("nat") or not o["nat"][0]:
                continue
            exp = o["rect"][2] * o["nat"][1] / o["nat"][0]
            if abs(exp - o["rect"][3]) > 1.0:
                bad += 1
                print(f"  ! item height mismatch: expect {exp:.2f} got {o['rect'][3]}")
        print("height==width*aspect mismatches:", bad)

if __name__ == "__main__":
    main()
