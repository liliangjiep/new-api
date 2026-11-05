# -*- coding: utf-8 -*-
import sys
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2]
sel = sys.argv[3]
wait = int(sys.argv[4]) if len(sys.argv) > 4 else 15000
out = sys.argv[5] if len(sys.argv) > 5 else None

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(wait)
    html = page.evaluate(
        "(sel) => { const e = document.querySelector(sel); return e ? e.outerHTML : 'NOT FOUND'; }",
        sel,
    )
    if out:
        open(out, "w", encoding="utf-8").write(html)
        print("wrote", out, len(html))
    else:
        print(html[:12000])
    ctx.close()
    b.close()
