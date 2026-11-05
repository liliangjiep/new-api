# -*- coding: utf-8 -*-
"""实测两站的栅格链路：section/grid/三栏 rect + grid-template-columns + 关键 padding。
用法: python scripts/recon_grid_live.py <origbase> <oursbase> [path...]
"""
import json, sys
from playwright.sync_api import sync_playwright

VIEWPORT = {"width": 1600, "height": 900}

JS = """() => {
  const q = (s) => document.querySelector(s);
  const rect = (el) => { if(!el) return null; const r = el.getBoundingClientRect();
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; };
  const section = q('section.relative');
  const grid = q('.genify-toolbox-3col');
  const cs = grid ? getComputedStyle(grid) : null;
  const scs = section ? getComputedStyle(section) : null;
  const shell = q('.workspace-main-shell');
  const main = q('.workspace-main-content');
  const pin = q('.workspace-pinned-navigation');
  const out = {
    vw: window.innerWidth,
    shell: rect(shell), main: rect(main), pin: rect(pin),
    section: rect(section), grid: rect(grid),
    sectionPad: scs ? [scs.paddingLeft, scs.paddingRight, scs.paddingTop, scs.paddingBottom] : null,
    sectionMaxW: scs ? scs.maxWidth : null,
    gridCols: cs ? cs.gridTemplateColumns : null,
    gridGap: cs ? cs.columnGap : null,
    inlineStyle: grid ? grid.getAttribute('style') : null,
    edit: rect(q('.toolbox-edit-region')),
    preview: rect(q('.toolbox-preview-region')),
    queue: rect(q('.toolbox-queue-region')),
  };
  return out;
}"""

def main():
    ob, ub = sys.argv[1].rstrip("/"), sys.argv[2].rstrip("/")
    paths = sys.argv[3:] or ["/toolbox/image-generation", "/toolbox/digital-human"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport=VIEWPORT, locale="zh-CN")
        for path in paths:
            page = ctx.new_page()
            res = {}
            for tag, base in (("O", ob), ("X", ub)):
                try:
                    page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
                    page.wait_for_timeout(3500)
                    res[tag] = page.evaluate(JS)
                except Exception as e:
                    res[tag] = {"ERR": str(e)[:120]}
            page.close()
            print(f"\n===== {path} =====")
            for k in ("vw", "shell", "main", "pin", "section", "grid", "sectionPad",
                      "sectionMaxW", "gridGap", "gridCols", "inlineStyle",
                      "edit", "preview", "queue"):
                o, u = res["O"].get(k), res["X"].get(k)
                flag = "  " if o == u else "!!"
                print(f"{flag} {k}:\n     orig={o}\n     ours={u}")
        ctx.close()
        b.close()

if __name__ == "__main__":
    main()
