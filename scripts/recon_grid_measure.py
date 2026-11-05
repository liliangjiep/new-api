# -*- coding: utf-8 -*-
"""测量原站工具页三栏在不同视口宽度下的列宽，用于反推 grid 公式。
用法: python scripts/recon_grid_measure.py <base_url> <path>
"""
import sys, json
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2] if len(sys.argv) > 2 else "/toolbox/image-generation"

SEL = {
    "sidebar": ".workspace-sidebar",
    "pinned": ".workspace-pinned-navigation",
    "main": ".workspace-main-content",
    "grid": ".genify-toolbox-3col",
    "edit": ".toolbox-edit-region",
    "preview": ".toolbox-preview-region",
    "queue": ".toolbox-queue-region",
}

with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (1280, 1440, 1600, 1920, 2200):
        ctx = b.new_context(viewport={"width": w, "height": 900}, locale="zh-CN")
        page = ctx.new_page()
        page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3000)
        out = {}
        for k, sel in SEL.items():
            el = page.query_selector(sel)
            if el:
                r = el.bounding_box()
                out[k] = [round(r["x"]), round(r["y"]), round(r["width"]), round(r["height"])]
            else:
                out[k] = None
        cols = page.eval_on_selector(".genify-toolbox-3col",
            "e => getComputedStyle(e).gridTemplateColumns")
        gap = page.eval_on_selector(".genify-toolbox-3col",
            "e => getComputedStyle(e).columnGap")
        out["cols"] = cols
        out["gap"] = gap
        print(w, json.dumps(out, ensure_ascii=False), flush=True)
        ctx.close()
    b.close()
