# -*- coding: utf-8 -*-
"""检查本地三栏栅格的自定义属性是否被 React 清掉。
用法: python scripts/recon_gridprop.py <url> [path...]
"""
import sys
from playwright.sync_api import sync_playwright

JS = """() => {
  const g = document.querySelector('.genify-toolbox-3col');
  if (!g) return {noGrid:true};
  const cs = getComputedStyle(g);
  const main = document.querySelector('.workspace-main-content');
  return {
    attr: g.getAttribute('style'),
    prop: cs.getPropertyValue('--toolbox-expanded-columns'),
    cols: cs.gridTemplateColumns,
    // 是否有兄弟节点带 style
    allGrids: Array.from(document.querySelectorAll('.genify-toolbox-3col')).length,
    parentTag: g.parentElement ? g.parentElement.className : null,
  };
}"""

def main():
    base = sys.argv[1].rstrip("/")
    paths = sys.argv[2:] or ["/toolbox/image-generation"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for path in paths:
            page = ctx.new_page()
            page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(4000)
            print(f"=== {path} ===")
            for k, v in page.evaluate(JS).items():
                print(f"  {k}: {v}")
            # 手动改一次看是否会被 React 冲掉
            page.evaluate("""() => {
              const g = document.querySelector('.genify-toolbox-3col');
              g.style.setProperty('--toolbox-expanded-columns','minmax(386px,464fr) minmax(0,812fr) minmax(150px,176fr)');
            }""")
            page.wait_for_timeout(1500)
            print("  after-manual-set:", page.evaluate(
                "() => document.querySelector('.genify-toolbox-3col').getAttribute('style')"))
            page.close()
        ctx.close()
        b.close()

if __name__ == "__main__":
    main()
