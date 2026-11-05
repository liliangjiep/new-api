# -*- coding: utf-8 -*-
"""一次性抓取原站多个页面的编辑区 outerHTML。"""
import sys
from playwright.sync_api import sync_playwright

BASE = "https://susu.da-ai.cc"
TARGETS = [
    ("/toolbox/ecommerce-image-set", ".toolbox-editor-panel-root", "edit_ec.html"),
    ("/toolbox/video-generation", ".toolbox-editor-panel-root", "edit_vid.html"),
    ("/toolbox/depth-video-clone", ".toolbox-editor-panel-root", "edit_dvc.html"),
    ("/toolbox/video-watermark-remove", ".toolbox-editor-panel-root", "edit_vwr.html"),
    ("/toolbox/video-subtitle-erase", ".toolbox-editor-panel-root", "edit_vse.html"),
    ("/toolbox/video-quality-enhance", ".toolbox-editor-panel-root", "edit_vqe.html"),
    ("/toolbox/hot-video-remix", ".toolbox-editor-panel-root", "edit_hvr.html"),
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
