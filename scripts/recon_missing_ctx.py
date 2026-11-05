# -*- coding: utf-8 -*-
"""对每个路由：抓原站+本地运行时 HTML，输出每个缺失 class 对应的原站完整 class 串。"""
import json
import os
import re
import sys
from collections import Counter

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"
ROUTES = sys.argv[1:] or [
    "/toolbox/image-generation",
    "/toolbox/video-generation",
    "/toolbox/depth-video-clone",
    "/toolbox/ecommerce-image-set",
]
OUT = ".recon/ctx"
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


def tag(path):
    return path.strip("/").replace("/", "-") or "home"


report = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    octx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    lctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    for path in ROUTES:
        t = tag(path)
        oh = grab(octx, ORIG, path)
        lh = grab(lctx, LOCAL, path)
        open(os.path.join(OUT, f"orig_{t}.html"), "w", encoding="utf-8").write(oh or "")
        open(os.path.join(OUT, f"local_{t}.html"), "w", encoding="utf-8").write(lh or "")
        if not oh or not lh:
            continue
        oc, lc = classes_from_html(oh), classes_from_html(lh)
        ok, lk = set(oc), set(lc)
        missing = sorted(ok - lk)
        # 找出每个缺失 class 所在的原站元素的完整 class 串
        idx = {}
        for mm in re.finditer(r'class="([^"]*)"', oh):
            for k in mm.group(1).split():
                idx.setdefault(k, [])
                if mm.group(1) not in idx[k]:
                    idx[k].append(mm.group(1))
        report[path] = {
            "missing": missing,
            "extra": sorted(lk - ok),
            "ctx": {m: idx.get(m, [])[:3] for m in missing},
        }
        print(f"== {path} sim={len(ok & lk) / max(1, len(ok)):.4f} missing={len(missing)}")
    octx.close()
    lctx.close()
    b.close()

json.dump(report, open(os.path.join(OUT, "ctx.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("saved", os.path.join(OUT, "ctx.json"))
