import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto("https://susu.da-ai.cc/", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(4500)
    print(page.evaluate("document.body.innerText")[:2000])
    print("=== anchors ===")
    for h in page.evaluate("Array.from(document.querySelectorAll('a')).map(a=>[a.getAttribute('href'),a.innerText.trim().slice(0,20)])"):
        print(h)
    ctx.close(); b.close()
