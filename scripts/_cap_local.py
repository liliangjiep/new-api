# -*- coding: utf-8 -*-
"""抓取本地站点的整页 outerHTML，输出到 .recon/ctx/local_*.html"""
import sys, os
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
TARGETS = [
    ("/", "local_home.html"),
    ("/toolbox/depth-video-clone", "local_toolbox-depth-video-clone.html"),
    ("/toolbox/ecommerce-image-set", "local_toolbox-ecommerce-image-set.html"),
    ("/toolbox/image-generation", "local_toolbox-image-generation.html"),
    ("/toolbox/video-generation", "local_toolbox-video-generation.html"),
    ("/toolbox/digital-human", "local_toolbox-digital-human.html"),
    ("/toolbox/hot-video-remix", "local_toolbox-hot-video-remix.html"),
    ("/toolbox/video-watermark-remove", "local_toolbox-video-watermark-remove.html"),
    ("/toolbox/video-quality-enhance", "local_toolbox-video-quality-enhance.html"),
    ("/toolbox/video-subtitle-erase", "local_toolbox-video-subtitle-erase.html"),
]

os.makedirs(".recon/ctx", exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    for path, out in TARGETS:
        page = ctx.new_page()
        try:
            page.goto(BASE + path, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(3500)
            html = page.evaluate("() => document.documentElement.outerHTML")
        except Exception as e:
            html = "ERROR %s" % e
        open(".recon/ctx/" + out, "w", encoding="utf-8").write(html)
        print("saved", out, len(html), flush=True)
        page.close()
    ctx.close()
    b.close()
