# -*- coding: utf-8 -*-
"""全路由 DOM class 相似度对比 —— 原站与本地都用 Playwright 运行时 DOM（排除 SSR 骨架屏干扰）。"""
import json
import os
import re
import sys
from collections import Counter

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"
ROUTES = [
    "/",
    "/toolbox",
    "/toolbox/image-generation",
    "/toolbox/video-generation",
    "/toolbox/depth-video-clone",
    "/toolbox/digital-human",
    "/toolbox/ecommerce-image-set",
    "/toolbox/hot-video-remix",
    "/toolbox/video-quality-enhance",
    "/toolbox/video-watermark-remove",
    "/toolbox/video-subtitle-erase",
    "/canvas",
    "/assets",
    "/account",
    "/agent-cloud",
]
OUT = ".recon/classdiff"
os.makedirs(OUT, exist_ok=True)


def classes_from_html(html):
    c = Counter()
    for mm in re.finditer(r'class="([^"]*)"', html):
        for k in mm.group(1).split():
            c[k] += 1
    return c


def grab(ctx, base, path):
    page = ctx.new_page()
    try:
        page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(4500)
        return page.evaluate("document.documentElement.outerHTML")
    except Exception as e:
        print("  ERR", path, str(e)[:70])
        return None
    finally:
        page.close()


rows = []
with sync_playwright() as p:
    b = p.chromium.launch()
    octx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    lctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    for path in ROUTES:
        oh = grab(octx, ORIG, path)
        lh = grab(lctx, LOCAL, path)
        if not oh or not lh:
            print(f"{path:42s} SKIP orig={bool(oh)} local={bool(lh)}")
            continue
        oc, lc = classes_from_html(oh), classes_from_html(lh)
        ok, lk = set(oc), set(lc)
        sim = len(ok & lk) / max(1, len(ok))
        rows.append(
            {
                "path": path,
                "similarity": round(sim, 4),
                "missing": sorted(ok - lk),
                "extra": sorted(lk - ok),
                "orig_n": len(ok),
                "local_n": len(lk),
            }
        )
        print(f"{path:42s} sim={sim:.4f}  orig={len(ok)} local={len(lk)} missing={len(ok - lk)}")
        for k in sorted(ok - lk):
            print("      MISSING:", k)
    octx.close()
    lctx.close()
    b.close()

json.dump(rows, open(os.path.join(OUT, "runtime_summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("\n=== SUMMARY (runtime vs runtime) ===")
for r in sorted(rows, key=lambda x: x["similarity"]):
    print(f"{r['path']:42s} {r['similarity']:.4f}  missing={len(r['missing'])}")
