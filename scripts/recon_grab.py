# -*- coding: utf-8 -*-
"""抓取原站任意 selector 的 outerHTML。
用法: python scripts/recon_grab.py <path> <selector> <outfile> [maxd]
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "https://susu.da-ai.cc"
path, sel, out = sys.argv[1], sys.argv[2], sys.argv[3]
maxd = int(sys.argv[4]) if len(sys.argv) > 4 else 0

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(BASE + path, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(5000)
    htmls = page.evaluate(
        "(sel) => Array.from(document.querySelectorAll(sel)).map(e => e.outerHTML)",
        sel,
    )
    open(out, "w", encoding="utf-8").write("\n\n".join(htmls))
    print("saved", out, len(htmls), sum(len(h) for h in htmls))
    ctx.close()
    b.close()
