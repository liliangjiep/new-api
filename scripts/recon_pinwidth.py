# -*- coding: utf-8 -*-
"""测量原站各页 pinned navigation 的宽度/展开状态（是否随页面不同）。
用法: python scripts/recon_pinwidth.py <base> [path...]
"""
import sys
from playwright.sync_api import sync_playwright

JS = """() => {
  const pin = document.querySelector('.workspace-pinned-navigation');
  if (!pin) return {none:true};
  const r = pin.getBoundingClientRect();
  const cs = getComputedStyle(pin);
  const toggle = pin.querySelector('[aria-label]');
  const toggles = Array.from(pin.querySelectorAll('button')).map(b => ({
    aria: b.getAttribute('aria-label')||'', c: (b.className||'').toString().slice(0,80),
    r: (()=>{const q=b.getBoundingClientRect();return [Math.round(q.x),Math.round(q.y),Math.round(q.width),Math.round(q.height)];})(),
  }));
  // 本地存储
  let ls = {};
  try { for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i); ls[k]=localStorage.getItem(k).slice(0,80);} } catch(e){}
  return {
    w: Math.round(r.width), x: Math.round(r.x),
    expanded: pin.getAttribute('data-expanded'),
    layoutExpanded: pin.getAttribute('data-layout-expanded'),
    inlineW: pin.style.width,
    cls: pin.className.slice(0,140),
    toggles,
    ls,
  };
}"""

def main():
    base = sys.argv[1].rstrip("/")
    paths = sys.argv[2:] or ["/toolbox/image-generation", "/toolbox/video-generation",
                             "/toolbox/digital-human", "/toolbox/depth-video-clone"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        page = ctx.new_page()
        for path in paths:
            page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(6000)
            d = page.evaluate(JS)
            print(f"== {path}")
            if d.get("none"):
                print("   (no pinned nav)")
                continue
            print("   width:", d["w"], "x:", d["x"], "expanded:", d["expanded"],
                  "layoutExpanded:", d["layoutExpanded"], "inline:", d["inlineW"])
            for t in d["toggles"]:
                print("   toggle:", t["aria"], t["r"])
            if d["ls"]:
                print("   localStorage:", d["ls"])
        page.close(); ctx.close(); b.close()

if __name__ == "__main__":
    main()
