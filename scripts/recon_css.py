# -*- coding: utf-8 -*-
"""抓取原站/我方某个选择器的完整计算样式并对比。
用法: python scripts/recon_css.py <base> <path> <selector> [more selectors...]
"""
import sys, json
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
path = sys.argv[2]
sels = sys.argv[3:]

JS = """
(sels) => {
  const props = ['display','flexDirection','alignItems','justifyContent','gap','padding','margin',
    'width','height','minHeight','minWidth','backgroundColor','color','border','borderRadius',
    'fontSize','fontWeight','lineHeight','letterSpacing','boxShadow','opacity','textAlign',
    'borderWidth','borderStyle','borderColor','outline','position','top','left','right','bottom',
    'overflow','overflowY','zIndex','transform','transition','whiteSpace','textTransform','flexShrink','flexGrow'];
  const out = {};
  for (const s of sels) {
    const el = document.querySelector(s);
    if (!el) { out[s] = null; continue; }
    const cs = getComputedStyle(el);
    const o = {};
    for (const p of props) o[p] = cs[p];
    const r = el.getBoundingClientRect();
    o._rect = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    o._cls = (typeof el.className === 'string' ? el.className : '').slice(0, 200);
    out[s] = o;
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
