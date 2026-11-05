# -*- coding: utf-8 -*-
"""检查 account 页 credit-value 的字体族（原站 vs 本地）。"""
import sys, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"
VIEWPORT = {"width": 1600, "height": 900}

JS = """() => {
  const out = [];
  document.querySelectorAll('.credit-value, .tabular, [class*="credit"]').forEach(e => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    out.push({
      cls: e.className,
      rect: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
      font: cs.fontFamily, fs: cs.fontSize, ls: cs.letterSpacing, fw: cs.fontWeight,
    });
  });
  return out.slice(0, 12);
}"""

def main():
    with sync_playwright() as p:
        br = p.chromium.launch()
        for name, base in (("O", ORIG), ("U", LOCAL)):
            ctx = br.new_context(viewport=VIEWPORT, locale="zh-CN")
            page = ctx.new_page()
            try:
                page.goto(base + "/account", wait_until="domcontentloaded", timeout=45000)
                time.sleep(3.5)
                print(f"--- {name} ---")
                for it in page.evaluate(JS):
                    print("   ", it)
            except Exception as e:
                print(f"--- {name} ERR {str(e)[:100]}")
            finally:
                page.close(); ctx.close()
        br.close()

if __name__ == "__main__":
    main()
