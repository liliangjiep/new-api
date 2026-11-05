# -*- coding: utf-8 -*-
"""列出原站首页所有 <a href>，用于校对本地路由是否存在。"""
import json
import sys
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
out = sys.argv[2]

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(base + "/", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_timeout(1500)
    hrefs = page.eval_on_selector_all(
        "a[href]",
        "els => els.map(e => ({href: e.getAttribute('href'), text: (e.innerText||'').trim().slice(0,40)}))",
    )
    with open(out, "w", encoding="utf-8") as f:
        json.dump(hrefs, f, ensure_ascii=False, indent=1)
    seen = set()
    for h in hrefs:
        k = h["href"]
        if k in seen:
            continue
        seen.add(k)
        print(k, "|", h["text"].replace("\n", " "))
    ctx.close()
    b.close()
