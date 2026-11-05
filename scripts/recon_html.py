# -*- coding: utf-8 -*-
"""抓取页面完整 DOM HTML（含 shadow DOM 展开后的 outerHTML），供 class/结构对比。"""
import sys
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2]
out = sys.argv[3]
wait = float(sys.argv[4]) if len(sys.argv) > 4 else 2500

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(base + path, wait_until="domcontentloaded", timeout=40000)
    page.wait_for_timeout(wait)
    html = page.evaluate("document.documentElement.outerHTML")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print("saved", out, len(html))
    ctx.close()
    b.close()
