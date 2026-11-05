import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

path = sys.argv[1]
out = sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto("https://susu.da-ai.cc" + path, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(4500)
    html = page.evaluate("document.documentElement.outerHTML")
    open(out, 'w', encoding='utf-8').write(html)
    txt = page.evaluate("document.body.innerText")
    print(txt[:3000])
    ctx.close(); b.close()
