import re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto("https://susu.da-ai.cc/assets", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(4500)
    html = page.evaluate("document.documentElement.outerHTML")
    for mm in re.finditer(r'<[^>]*text-\[#0f1419\][^>]*>', html):
        print(mm.group(0)[:400]); print('---')
    ctx.close(); b.close()
