# -*- coding: utf-8 -*-
"""对比 image-generation 语音输入按钮的父链几何与样式。"""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"

JS = """() => {
  const e = document.querySelector('[aria-label=\\"语音输入控制\\"]');
  if (!e) return 'NOT FOUND';
  const out = [];
  let n = e;
  for (let i = 0; i < 8 && n; i++) {
    const r = n.getBoundingClientRect();
    const cs = getComputedStyle(n);
    out.push({
      tag: n.tagName.toLowerCase(),
      cls: (typeof n.className === 'string' ? n.className : '').trim().split(/\\s+/).slice(0,8).join('.'),
      rect: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
      pad: cs.padding, gap: cs.gap, mt: cs.marginTop, mb: cs.marginBottom,
      align: cs.alignItems, justify: cs.justifyContent, h: cs.height, minh: cs.minHeight,
      display: cs.display, flex: cs.flex, dir: cs.flexDirection,
    });
    n = n.parentElement;
  }
  return out;
}"""

def main():
    with sync_playwright() as p:
        br = p.chromium.launch()
        for name, base in (("O", ORIG), ("U", LOCAL)):
            ctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
            page = ctx.new_page()
            page.goto(base + "/toolbox/image-generation", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(4500)
            print(f"--- {name} ---")
            for it in page.evaluate(JS):
                print("  ", it)
            page.close(); ctx.close()
        br.close()

if __name__ == "__main__":
    main()
