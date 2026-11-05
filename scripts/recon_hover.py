# -*- coding: utf-8 -*-
"""在页面上 hover 某个元素并抓取浮动导航状态。"""
import json
import sys

from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2]
sel = sys.argv[3]

JS = """
() => Array.from(document.querySelectorAll('.workspace-floating-navigation')).map(el => {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return { label: el.getAttribute('aria-labelledby'), vis: cs.visibility, op: cs.opacity, rect: [r.x, r.y, r.width, r.height], z: cs.zIndex };
})
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(4000)
    print("before:", json.dumps(page.evaluate(JS), ensure_ascii=False))
    page.hover(sel)
    page.wait_for_timeout(1200)
    print("after :", json.dumps(page.evaluate(JS), ensure_ascii=False))
    ctx.close()
    b.close()
