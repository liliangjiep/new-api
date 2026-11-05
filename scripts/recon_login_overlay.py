# -*- coding: utf-8 -*-
"""抓原站 ?login=1 弹窗的遮罩层（modal-login 之外的父级）。
用法: python scripts/recon_login_overlay.py <base>
"""
import sys
from playwright.sync_api import sync_playwright

JS = """() => {
  const panel = document.querySelector('.modal-login-panel');
  if (!panel) return {noPanel:true};
  const chain = [];
  let el = panel;
  while (el && el !== document.body) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    chain.push({t: el.tagName.toLowerCase(), c: (el.className||'').toString().slice(0,120),
      r: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
      bg: cs.backgroundColor, pos: cs.position, z: cs.zIndex, disp: cs.display,
      ins: cs.inset, ovf: cs.overflow});
    el = el.parentElement;
  }
  return {chain};
}"""

def main():
    base = sys.argv[1].rstrip("/")
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        page = ctx.new_page()
        page.goto(base + "/?login=1", wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(6000)
        d = page.evaluate(JS)
        for c in d.get("chain", []):
            print(c["t"], "|", c["c"][:100], "|", c["r"], "| bg", c["bg"], "| pos", c["pos"], "z", c["z"], "|", c["disp"])
        ctx.close(); b.close()

if __name__ == "__main__":
    main()
