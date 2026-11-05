# -*- coding: utf-8 -*-
"""抓原站/我方工具页中栏预览面板（含参考示例轮播）的完整 DOM + 计算样式。
用法: python scripts/recon_carousel.py <url> <outfile> [path]
"""
import json, sys
from playwright.sync_api import sync_playwright

JS = """() => {
  const region = document.querySelector('.toolbox-preview-region');
  if (!region) return {noRegion:true};
  const pick = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      t: el.tagName.toLowerCase(),
      c: (el.className || '').toString(),
      r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      d: cs.display, p: cs.padding, g: cs.gap,
      fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight,
      br: cs.borderRadius, bg: cs.backgroundColor, col: cs.color,
      bb: cs.borderBottom, bbw: cs.borderBottomWidth,
      ov: cs.overflow, objf: cs.objectFit,
      txt: (el.innerText || '').trim().replace(/\\s+/g,' ').slice(0, 60),
      aria: el.getAttribute('aria-label') || '',
    };
  };
  const out = [];
  const walk = (el, d) => {
    if (d > 12) return;
    out.push(Object.assign({d}, pick(el)));
    for (const c of el.children) walk(c, d + 1);
  };
  walk(region, 0);
  const imgs = Array.from(region.querySelectorAll('img')).map(i => {
    const r = i.getBoundingClientRect();
    return {src: i.currentSrc || i.src, r: [Math.round(r.width), Math.round(r.height)],
            nat: [i.naturalWidth, i.naturalHeight], c: i.className};
  });
  return {tree: out, imgs};
}"""

def main():
    base = sys.argv[1].rstrip("/")
    out = sys.argv[2]
    paths = sys.argv[3:] or ["/toolbox/image-generation"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        res = {}
        for path in paths:
            page = ctx.new_page()
            page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(6000)
            res[path] = page.evaluate(JS)
            page.close()
        ctx.close()
        b.close()
    json.dump(res, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for path, d in res.items():
        print(path, "nodes:", len(d.get("tree", [])), "imgs:", len(d.get("imgs", [])))

if __name__ == "__main__":
    main()
