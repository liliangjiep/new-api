# -*- coding: utf-8 -*-
import sys
from playwright.sync_api import sync_playwright

base = sys.argv[1]
path = sys.argv[2]
sel = sys.argv[3]

JS = """(sel) => {
  const el = document.querySelector(sel);
  if (!el) return 'NOT FOUND';
  const out = [];
  let n = el;
  while (n && n !== document.documentElement) {
    const r = n.getBoundingClientRect();
    const cs = getComputedStyle(n);
    out.push({
      tag: n.tagName.toLowerCase(),
      cls: (n.getAttribute('class')||'').slice(0,140),
      r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      pad: cs.paddingLeft + '/' + cs.paddingRight,
      mar: cs.marginLeft + '/' + cs.marginRight,
      maxw: cs.maxWidth,
      w: cs.width,
      box: cs.boxSizing,
    });
    n = n.parentElement;
  }
  return JSON.stringify(out, null, 1);
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(5000)
    print(page.evaluate(JS, sel))
    ctx.close()
    b.close()
