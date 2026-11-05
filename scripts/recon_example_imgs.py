# -*- coding: utf-8 -*-
"""抓原站工具页「参考示例」轮播的图片（自然尺寸 + 渲染尺寸 + 数量）。
用法: python scripts/recon_example_imgs.py <url> [path...]
"""
import json, sys
from playwright.sync_api import sync_playwright

JS = """() => {
  const region = document.querySelector('.toolbox-preview-region');
  if (!region) return {noRegion:true};
  const imgs = Array.from(region.querySelectorAll('img')).map(i => {
    const r = i.getBoundingClientRect();
    const cs = getComputedStyle(i);
    return {
      src: i.currentSrc || i.src,
      r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      nat: [i.naturalWidth, i.naturalHeight],
      cls: i.className,
      br: cs.borderRadius, of: cs.objectFit,
    };
  });
  // 轮播按钮
  const btns = Array.from(region.querySelectorAll('button')).map(b => ({
    aria: b.getAttribute('aria-label') || '',
    cls: b.className,
    r: (() => { const r = b.getBoundingClientRect(); return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]; })(),
  }));
  return {imgs, btns};
}"""

def main():
    base = sys.argv[1].rstrip("/")
    paths = sys.argv[2:] or ["/toolbox/image-generation", "/toolbox/video-generation"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for path in paths:
            page = ctx.new_page()
            page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(7000)
            d = page.evaluate(JS)
            print("===", path)
            for i in d.get("imgs", []):
                print("  img nat", i["nat"], "rect", i["r"], "br", i["br"], "of", i["of"])
                print("     src", i["src"][:110])
            for bt in d.get("btns", []):
                print("  btn", bt["aria"], bt["r"], bt["cls"][:90])
            page.close()
        ctx.close()
        b.close()

if __name__ == "__main__":
    main()
