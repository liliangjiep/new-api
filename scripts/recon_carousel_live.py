# -*- coding: utf-8 -*-
"""运行时检查原站各工具页的预览区结构（是否有轮播）。"""
import sys

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROUTES = [
    "/toolbox/image-generation",
    "/toolbox/video-generation",
    "/toolbox/ecommerce-image-set",
    "/toolbox/depth-video-clone",
    "/toolbox/digital-human",
    "/toolbox/hot-video-remix",
]
KEYS = [
    "result-example-carousel",
    "result-example-single",
    "result-example-track",
    "result-example-dots",
    "example-carousel",
    "favorite-batch-login",
    "interactive-video-cover",
    "generation-skill-panel",
]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    for r in ROUTES:
        page.goto("https://susu.da-ai.cc" + r, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(4000)
        html = page.evaluate("document.documentElement.outerHTML")
        print(f"{r:40s} " + " ".join(f"{html.count(k):>4d}" for k in KEYS))
    ctx.close()
    b.close()
print("keys:", KEYS)
