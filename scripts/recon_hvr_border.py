# -*- coding: utf-8 -*-
"""对比 hot-video-remix 内边框元素的计算样式。"""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

JS = """() => {
  const sels = ['.segment-picker-empty', '.ui-hot-video-audio .rounded-xl', '.ui-hot-video-audio .rounded-xl > div'];
  const out = {};
  for (const s of sels) {
    const e = document.querySelector(s);
    if (!e) { out[s] = null; continue; }
    const cs = getComputedStyle(e);
    out[s] = { border: cs.border, borderColor: cs.borderColor, borderWidth: cs.borderWidth,
      borderStyle: cs.borderStyle, bg: cs.backgroundColor, cls: e.className };
  }
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
            for k, v in page.evaluate(JS).items():
                print("  ", k, v)
            page.close(); ctx.close()
        br.close()

if __name__ == "__main__":
    main()
