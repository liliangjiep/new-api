# -*- coding: utf-8 -*-
"""几何精对齐对比：对齐后逐节点比较 rect，报告 >4px 的漂移。
用法: python scripts/recon_geo.py <origdir> <oursdir> [path ...]
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
        lab = (n.get("o", "") or n.get("a", {}).get("aria-label", "") or "")[:40]
        out.append({
            "k": f"{n.get('t')}|{c}|{lab}",
            "r": n.get("r", [0, 0, 0, 0]),
        })
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
    tol = int(os.environ.get("TOL", "4"))
    for p in paths:
        o, u = load(od, p), load(ud, p)
        if not o or not u:
            continue
        a, b = flat(o), flat(u)
        ka = [x["k"] for x in a]
        kb = [x["k"] for x in b]
        sm = difflib.SequenceMatcher(None, ka, kb)
        rows = []
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag != "equal":
                continue
            for i, j in zip(range(i1, i2), range(j1, j2)):
                ra, rb = a[i]["r"], b[j]["r"]
                d = max(abs(ra[x] - rb[x]) for x in range(4))
                if d > tol:
                    rows.append((d, ka[i], ra, rb))
        rows.sort(reverse=True)
        if rows:
            print(f"### {p}  drift> {tol}px: {len(rows)}")
            for d, k, ra, rb in rows[:20]:
                print(f"   Δ{d:>5} {k[:70]}  orig={ra} ours={rb}")
        else:
            print(f"### {p}  OK (no drift > {tol}px)")


if __name__ == "__main__":
    main()
