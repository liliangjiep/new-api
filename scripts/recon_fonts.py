# -*- coding: utf-8 -*-
"""抓取原站 DIN Alternate 字体资源。"""
import sys, re, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

ORIG = "https://susu.da-ai.cc"

with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width":1600,"height":900})
    page = ctx.new_page()
    fonts = []
    page.on("response", lambda r: fonts.append((r.status, r.url)) if r.url.lower().endswith((".woff2",".woff",".ttf",".otf")) else None)
    page.goto(ORIG + "/toolbox/image-generation", wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(3000)
    for s, u in fonts:
        print(s, u)
    print("---- document.fonts ----")
    for f in page.evaluate("() => Array.from(document.fonts).map(f => f.family + ' | ' + f.style + ' | ' + f.weight + ' | ' + (f.status) + ' | ' + f.unicodeRange)")    :
        print(f)
    br.close()
