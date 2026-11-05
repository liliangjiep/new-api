# -*- coding: utf-8 -*-
"""检查原站/我方 pinned navigation 的展开状态与相关属性。
用法: python scripts/recon_pinstate.py <origbase> <oursbase> [path...]
"""
import sys
from playwright.sync_api import sync_playwright

JS = """() => {
  const pin = document.querySelector('.workspace-pinned-navigation');
  const shell = document.querySelector('.workspace-main-shell');
  const floats = Array.from(document.querySelectorAll('.workspace-floating-navigation')).map(f => {
    const r = f.getBoundingClientRect();
    const cs = getComputedStyle(f);
    return {cls: f.className, r: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
            pos: cs.position, disp: cs.display, tr: cs.transform, op: cs.opacity, vis: cs.visibility};
  });
  const scroll = document.querySelector('.workspace-navigation-scrollbar');
  return {
    pin: pin ? {cls: pin.className, attrs: Array.from(pin.attributes).map(a=>a.name+'='+a.value).join(' '),
                r: (()=>{const r=pin.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)];})()} : null,
    shell: shell ? shell.className : null,
    shellAttrs: shell ? Array.from(shell.attributes).map(a=>a.name+'='+a.value).join(' ') : null,
    htmlAttrs: Array.from(document.documentElement.attributes).map(a=>a.name+'='+a.value).join(' '),
    floats,
    scrollbar: scroll ? {cls: scroll.className, r: (()=>{const r=scroll.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)];})(),
                         style: scroll.getAttribute('style')} : null,
  };
}"""

def main():
    ob, ub = sys.argv[1].rstrip("/"), sys.argv[2].rstrip("/")
    paths = sys.argv[3:] or ["/toolbox/image-generation"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for path in paths:
            page = ctx.new_page()
            for tag, base in (("O", ob), ("X", ub)):
                page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
                page.wait_for_timeout(7000)
                d = page.evaluate(JS)
                print(f"--- {tag} {path}")
                print("   html:", d["htmlAttrs"])
                print("   shell:", d["shellAttrs"])
                print("   pin:", (d["pin"] or {}).get("attrs"))
                print("   pinRect:", (d["pin"] or {}).get("r"))
                print("   scrollbar:", d["scrollbar"])
                for f in d["floats"]:
                    print("   float:", f["r"], f["pos"], f["disp"], "vis=" + str(f["vis"]))
            page.close()
        ctx.close()
        b.close()

if __name__ == "__main__":
    main()
