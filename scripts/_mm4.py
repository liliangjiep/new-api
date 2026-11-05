import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

for base, label in [("https://susu.da-ai.cc", 'ORIG'), ("http://localhost:3000", 'LOCAL')]:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
        page = ctx.new_page()
        page.goto(base + "/toolbox/ecommerce-image-set", wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(4000)
        print('###', label)
        print(page.evaluate("() => { const e = document.querySelector('.ecommerce-text-language'); return e ? e.outerHTML.slice(0,1600) : 'NONE'; }"))
        print()
        ctx.close(); b.close()
