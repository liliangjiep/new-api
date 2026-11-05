# -*- coding: utf-8 -*-
"""抓原站首页瀑布流全部 item：位置/宽高/封面自然尺寸 → 反推排版算法。
用法: python scripts/recon_wf_dump.py <url>
"""
import json, sys
from playwright.sync_api import sync_playwright

JS = """() => {
  const wf = document.querySelector('.ui-waterfall');
  if (!wf) return {noWaterfall:true};
  const items = Array.from(document.querySelectorAll('.ui-waterfall-item')).map(el => {
    const b = el.getBoundingClientRect();
    const img = el.querySelector('img');
    const ir = img ? img.getBoundingClientRect() : null;
    return {
      style: el.getAttribute('style'),
      rect: [Math.round(b.x*100)/100, Math.round(b.y*100)/100, Math.round(b.width*100)/100, Math.round(b.height*100)/100],
      nat: img ? [img.naturalWidth, img.naturalHeight] : null,
      src: img ? (img.currentSrc || img.src) : null,
    };
  });
  return { wfStyle: wf.getAttribute('style'), items };
}"""

def main():
    base = sys.argv[1].rstrip("/")
    out = sys.argv[2] if len(sys.argv) > 2 else ".recon/wf_orig.json"
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        page = ctx.new_page()
        page.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(6000)
        data = page.evaluate(JS)
        with open(out, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        print("items:", len(data.get("items", [])), "wfStyle:", data.get("wfStyle"))
        for it in data.get("items", [])[:6]:
            print(" ", it["rect"], it["nat"], it["style"])
        ctx.close()
        b.close()

if __name__ == "__main__":
    main()
