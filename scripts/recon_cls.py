# -*- coding: utf-8 -*-
"""抓取原站/我方若干选择器的完整 class 字符串 + 计算样式（不限长度）。
用法: python scripts/recon_cls.py <base> <path> <selector> [selector...]
"""
import sys, json
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2]
sels = sys.argv[3:]

JS = """
(sels) => {
  const out = {};
  for (const s of sels) {
    const el = document.querySelector(s);
    if (!el) { out[s] = null; continue; }
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    out[s] = {
      cls: (typeof el.className === 'string' ? el.className : ''),
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      css: {
        border: cs.border, borderRadius: cs.borderRadius, fontSize: cs.fontSize,
        fontWeight: cs.fontWeight, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing,
        padding: cs.padding, gap: cs.gap, backgroundColor: cs.backgroundColor,
        color: cs.color, boxShadow: cs.boxShadow, flex: cs.flex, flexGrow: cs.flexGrow,
        minHeight: cs.minHeight, height: cs.height, width: cs.width, display: cs.display,
        flexDirection: cs.flexDirection,
      },
    };
  }
  return out;
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(3500)
    res = page.evaluate(JS, sels)
    ctx.close()
    b.close()
print(json.dumps(res, ensure_ascii=False, indent=1))
