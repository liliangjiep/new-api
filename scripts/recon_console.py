# -*- coding: utf-8 -*-
"""抓本地页面 console error + 检查栅格 inline style 是否被设置。
用法: python scripts/recon_console.py <url> [path...]
"""
import sys
from playwright.sync_api import sync_playwright

def main():
    base = sys.argv[1].rstrip("/")
    paths = sys.argv[2:] or ["/toolbox/image-generation"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for path in paths:
            page = ctx.new_page()
            msgs = []
            page.on("console", lambda m: msgs.append((m.type, m.text[:300])))
            page.on("pageerror", lambda e: msgs.append(("pageerror", str(e)[:300])))
            page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(3500)
            info = page.evaluate("""() => {
              const g = document.querySelector('.genify-toolbox-3col');
              if (!g) return {noGrid:true};
              return {style: g.getAttribute('style'), cls: g.className};
            }""")
            print(f"=== {path} ===")
            print("grid:", info)
            for t, m in msgs:
                if t in ("error", "pageerror", "warning"):
                    print(f"  [{t}] {m}")
            page.close()
        ctx.close()
        b.close()

if __name__ == "__main__":
    main()
