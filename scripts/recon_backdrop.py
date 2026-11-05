# -*- coding: utf-8 -*-
"""列出原站首页覆盖整屏的元素（弹窗遮罩）。
用法: python scripts/recon_backdrop.py <base>
"""
import sys
from playwright.sync_api import sync_playwright

JS = """() => {
  const out = [];
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 1200 && r.height > 700) {
      const cs = getComputedStyle(el);
      out.push({t: el.tagName.toLowerCase(), c: (el.className||'').toString().slice(0,140),
        r: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
        bg: cs.backgroundColor, pos: cs.position, z: cs.zIndex,
        bgi: cs.backgroundImage.slice(0,60), bb: cs.backdropFilter});
    }
  });
  return out;
}"""

def main():
    base = sys.argv[1].rstrip("/")
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        page = ctx.new_page()
        page.goto(base + "/?login=1", wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(6000)
        for c in page.evaluate(JS):
            print(c["t"], "|", c["c"][:110], "|", c["r"], "| bg", c["bg"], "| pos", c["pos"], "z", c["z"], "| bb", c["bb"])
        ctx.close(); b.close()

if __name__ == "__main__":
    main()
