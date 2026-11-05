# -*- coding: utf-8 -*-
"""轮询观察本地栅格 inline style 何时被设置/清除。
用法: python scripts/recon_gridpoll.py <url> [path...]
"""
import sys
from playwright.sync_api import sync_playwright

JS = """() => {
  const g = document.querySelector('.genify-toolbox-3col');
  if (!g) return 'NO-GRID';
  return g.getAttribute('style') || 'NULL';
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
            print(f"=== {path} ===")
            for i in range(20):
                page.wait_for_timeout(500)
                v = page.evaluate(JS)
                print(f"  t={round((i+1)*0.5,1)}s: {str(v)[:110]}")
            page.close()
        ctx.close()
        b.close()

if __name__ == "__main__":
    main()
