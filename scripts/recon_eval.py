# -*- coding: utf-8 -*-
"""在页面上执行一段 JS 并打印结果。
用法: python scripts/recon_eval.py <base_url> <path> <jsfile>
"""
import json
import sys

from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2]
js = open(sys.argv[3], encoding="utf-8").read()

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(4000)
    print(json.dumps(page.evaluate(js), ensure_ascii=False, indent=1))
    ctx.close()
    b.close()
