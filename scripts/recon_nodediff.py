# -*- coding: utf-8 -*-
"""逐页节点级对比（忽略深度），输出真实差异清单。
用法: python scripts/recon_nodediff.py <origdir> <oursdir> [path ...]
"""
import json, os, sys, difflib


def load(d, path):
    slug = (path.strip("/") or "root").replace("/", "__") or "root"
    p = os.path.join(d, slug + ".json")
    if not os.path.exists(p):
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def flat(doc):
    out = []
    def w(n):
        c = n.get("c", "")
        lab = (n.get("o", "") or n.get("a", {}).get("aria-label", "") or "")[:60]
        out.append((n.get("t"), c, lab))
        for k in n.get("k", []):
            w(k)
    for r in doc.get("roots", []):
        w(r)
    return out


def main():
    od, ud = sys.argv[1], sys.argv[2]
    paths = sys.argv[3:] or [
        "/", "/toolbox", "/toolbox/image-generation", "/toolbox/video-generation",
        "/toolbox/ecommerce-image-set", "/toolbox/depth-video-clone",
        "/toolbox/digital-human", "/toolbox/hot-video-remix",
        "/toolbox/video-quality-enhance", "/toolbox/video-subtitle-erase",
        "/toolbox/video-watermark-remove", "/canvas", "/assets", "/account",
        "/agent-cloud",
    ]
    for p in paths:
        o, u = load(od, p), load(ud, p)
        if not o or not u:
            print(f"### {p}: missing capture")
            continue
        a = [f"{x[0]}|{x[1]}|{x[2]}" for x in flat(o)]
        b = [f"{x[0]}|{x[1]}|{x[2]}" for x in flat(u)]
        sm = difflib.SequenceMatcher(None, a, b)
        miss, extra = [], []
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag in ("delete", "replace"):
                miss += a[i1:i2]
            if tag in ("insert", "replace"):
                extra += b[j1:j2]
        miss = [m for m in miss if m.split("|")[2]]
        extra = [x for x in extra if x.split("|")[2]]
        print(f"### {p}  ratio={sm.ratio():.3f}  MISSING={len(miss)} EXTRA={len(extra)}")
        for m in miss[:25]:
            print("   -", m)
        for x in extra[:25]:
            print("   +", x)


if __name__ == "__main__":
    main()
