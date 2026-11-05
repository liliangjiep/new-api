# -*- coding: utf-8 -*-
"""测量原站布局关键宽度，核对公式输入项。"""
import sys
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2] if len(sys.argv) > 2 else "/toolbox/image-generation"

JS = """
() => {
  const t = document.querySelector('.genify-toolbox-3col');
  const shell = document.querySelector('.workspace-main-shell');
  const sec = t.parentElement.parentElement; // section
  const layout = t.parentElement;
  const cs = getComputedStyle;
  const rect = el => { const r = el.getBoundingClientRect(); return {x:+r.x.toFixed(2), w:+r.width.toFixed(2)}; };
  const pin = document.querySelector('.workspace-pinned-navigation');
  const content = document.querySelector('.workspace-main-content');
  return {
    win: innerWidth,
    shell: rect(shell),
    content: content ? rect(content) : null,
    pinned: pin ? rect(pin) : null,
    section: rect(sec),
    sectionCls: sec.className,
    sectionPadL: cs(sec).paddingLeft, sectionPadR: cs(sec).paddingRight,
    sectionMaxW: cs(sec).maxWidth,
    layoutCls: layout.className,
    layoutPadL: cs(layout).paddingLeft, layoutPadR: cs(layout).paddingRight,
    grid: rect(t),
    gap: cs(t).columnGap,
    sidebar: rect(document.querySelector('.workspace-sidebar')),
  };
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (1280, 1600, 1920):
        ctx = b.new_context(viewport={"width": w, "height": 900}, locale="zh-CN")
        page = ctx.new_page()
        page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(3000)
        d = page.evaluate(JS)
        print(f'--- {w} ---')
        for k, v in d.items():
            print(f'  {k}: {v}')
        ctx.close()
    b.close()
