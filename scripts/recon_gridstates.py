# -*- coding: utf-8 -*-
"""对比两站工具页在「队列展开/收起」两种状态下的栅格几何。
原站 localStorage 键：genify.toolbox.queue-collapsed
用法: python scripts/recon_gridstates.py <origbase> <oursbase> [path...]
"""
import sys
from playwright.sync_api import sync_playwright

JS = """() => {
  const g = document.querySelector('.genify-toolbox-3col');
  const pin = document.querySelector('.workspace-pinned-navigation');
  const sec = document.querySelector('[class*=toolbox-section-gutter]') || document.querySelector('.toolbox-workspace-layout > section');
  const q = document.querySelector('.toolbox-queue-region');
  const e = document.querySelector('.toolbox-edit-region');
  const p = document.querySelector('.toolbox-preview-region');
  const R = (el) => { if(!el) return null; const r = el.getBoundingClientRect();
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; };
  const cs = g ? getComputedStyle(g) : null;
  return {
    grid: R(g), cols: cs ? cs.gridTemplateColumns : null,
    inline: g ? g.getAttribute('style') : null,
    pin: R(pin), pinW: pin ? pin.style.width : null,
    pinExpanded: pin ? pin.getAttribute('data-expanded') : null,
    sec: R(sec), secMaxW: sec ? getComputedStyle(sec).maxWidth : null,
    gutter: sec ? getComputedStyle(sec).getPropertyValue('--toolbox-section-gutter') : null,
    edit: R(e), preview: R(p), queue: R(q),
    ls: (()=>{try{return Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]));}catch(e){return {}}})(),
  };
}"""

def main():
    ob, ub = sys.argv[1].rstrip("/"), sys.argv[2].rstrip("/")
    paths = sys.argv[3:] or ["/toolbox/image-generation"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        page = ctx.new_page()
        for path in paths:
            for tag, base in (("O", ob), ("X", ub)):
                page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
                page.wait_for_timeout(6000)
                d = page.evaluate(JS)
                print(f"--- {tag} {path}")
                for k in ("pinW", "pinExpanded", "grid", "cols", "secMaxW", "gutter", "edit", "preview", "queue"):
                    print(f"    {k}: {d.get(k)}")
                print(f"    ls: {d.get('ls')}")
            page.close()
        ctx.close(); b.close()

if __name__ == "__main__":
    main()
