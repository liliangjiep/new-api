import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto("https://susu.da-ai.cc/toolbox/image-generation", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(4000)
    page.locator('.generation-model-picker button').first.click(timeout=6000)
    page.wait_for_timeout(1500)
    print(page.evaluate("() => document.querySelector('.generation-model-picker').outerHTML"))
    ctx.close(); b.close()
