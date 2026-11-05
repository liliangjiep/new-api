# -*- coding: utf-8 -*-
"""在页面上现场创建元素并读取某组工具类的最终计算色（原站 vs 我方）。
用法: python scripts/recon_util_color.py <base> <cls1> <cls2> ...
"""
import sys, json
from playwright.sync_api import sync_playwright

JS = """
(cls) => {
  const out = {};
  for (const c of cls) {
    const d = document.createElement('div');
    d.className = c;
    d.style.position = 'absolute';
    d.style.left = '-9999px';
    document.body.appendChild(d);
    const cs = getComputedStyle(d);
    out[c] = {
      color: cs.color,
      bg: cs.backgroundColor,
      borderColor: cs.borderTopColor,
      borderWidth: cs.borderTopWidth,
      radius: cs.borderTopLeftRadius,
      shadow: cs.boxShadow.slice(0, 70),
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      letterSpacing: cs.letterSpacing,
      lineHeight: cs.lineHeight,
    };
    d.remove();
  }
  return out;
}
"""

base = sys.argv[1].rstrip("/")
cls = sys.argv[2:]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto(base, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(2500)
    print(json.dumps(page.evaluate(JS, cls), ensure_ascii=False, indent=1))
    ctx.close(); b.close()
