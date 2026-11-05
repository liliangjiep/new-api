# -*- coding: utf-8 -*-
"""抓瀑布流 item 的 inline style / 图片尺寸（对比两站）。
用法: python scripts/recon_wf_live.py <origbase> <oursbase> [path]
"""
import sys
from playwright.sync_api import sync_playwright

JS = """() => {
  const wf = document.querySelector('.ui-waterfall');
  if (!wf) return {noWaterfall:true};
  const r = wf.getBoundingClientRect();
  const items = Array.from(document.querySelectorAll('.ui-waterfall-item')).slice(0, 12).map(el => {
    const b = el.getBoundingClientRect();
    const img = el.querySelector('img');
    const ir = img ? img.getBoundingClientRect() : null;
    const shell = el.querySelector('.discover-card-cover-shell');
    const sr = shell ? shell.getBoundingClientRect() : null;
    return {
      style: el.getAttribute('style'),
      rect: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)],
      img: ir ? [Math.round(ir.x), Math.round(ir.y), Math.round(ir.width), Math.round(ir.height)] : null,
      imgNat: img ? [img.naturalWidth, img.naturalHeight] : null,
      imgCls: img ? img.className : null,
      shell: sr ? [Math.round(sr.width), Math.round(sr.height)] : null,
      shellCls: shell ? shell.className : null,
    };
  });
  return { wf: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], wfStyle: wf.getAttribute('style'), items };
}"""

def main():
    ob, ub = sys.argv[1].rstrip("/"), sys.argv[2].rstrip("/")
    paths = sys.argv[3:] or ["/"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for path in paths:
            page = ctx.new_page()
            res = {}
            for tag, base in (("O", ob), ("X", ub)):
                page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
                page.wait_for_timeout(5000)
                page.evaluate("""() => window.scrollTo(0, 0)""")
                page.wait_for_timeout(800)
                res[tag] = page.evaluate(JS)
            page.close()
            print(f"\n===== {path} =====")
            for tag in ("O", "X"):
                d = res[tag]
                print(f"-- {tag} wf={d.get('wf')} style={str(d.get('wfStyle'))[:120]}")
                for it in d.get("items", [])[:8]:
                    print(f"   rect={it['rect']} img={it['img']} nat={it['imgNat']} shell={it['shell']}")
                    print(f"     style={str(it['style'])[:110]}")
                    print(f"     imgCls={it['imgCls']}")
                    print(f"     shellCls={it['shellCls']}")
        ctx.close()
        b.close()

if __name__ == "__main__":
    main()
