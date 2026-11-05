# -*- coding: utf-8 -*-
"""一次性抓取原站多个页面的关键区块 outerHTML。"""
import sys
from playwright.sync_api import sync_playwright

BASE = "https://susu.da-ai.cc"
TARGETS = [
    ("/toolbox/image-generation", ".toolbox-preview-panel", "prev_img.html"),
    ("/toolbox/video-generation", ".toolbox-preview-panel", "prev_vid.html"),
    ("/toolbox/ecommerce-image-set", ".toolbox-preview-panel", "prev_ec.html"),
    ("/toolbox/depth-video-clone", ".toolbox-preview-panel", "prev_dvc.html"),
    ("/toolbox/hot-video-remix", ".toolbox-preview-region", "prev_hvr.html"),
    ("/toolbox/video-quality-enhance", ".toolbox-preview-panel", "prev_vqe.html"),
]

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    for path, sel, out in TARGETS:
        page = ctx.new_page()
        try:
            page.goto(BASE + path, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(5000)
            htmls = page.evaluate(
                "(sel) => Array.from(document.querySelectorAll(sel)).map(e => e.outerHTML)",
                sel,
            )
        except Exception as e:
            htmls = [f"ERROR {e}"]
        open(".recon/static/" + out, "w", encoding="utf-8").write("\n\n".join(htmls))
        print("saved", out, sum(len(h) for h in htmls), flush=True)
        page.close()
    ctx.close()
    b.close()
