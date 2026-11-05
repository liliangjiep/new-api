# -*- coding: utf-8 -*-
"""对比 hot-video-remix 上传按钮内的 svg 尺寸。"""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

JS = """() => {
  const b = document.querySelector('.source-video-empty-trigger');
  if (!b) return 'NF';
  const out = [];
  const walk = (e, d) => {
    const r = e.getBoundingClientRect();
    out.push({d, tag: e.tagName.toLowerCase(),
      cls: (e.getAttribute('class')||'') ,
      rect: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]});
    for (const c of e.children) walk(c, d+1);
  };
  walk(b, 0);
  return out;
}"""

def main():
    with sync_playwright() as p:
        br = p.chromium.launch()
        for name, base in (("O", "https://susu.da-ai.cc"), ("U", "http://localhost:3000")):
            ctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
            page = ctx.new_page()
            page.goto(base + "/toolbox/hot-video-remix", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(4500)
            print(f"===== {name} =====")
            for it in page.evaluate(JS):
                print("  ", it)
            page.close(); ctx.close()
        br.close()

if __name__ == "__main__":
    main()
