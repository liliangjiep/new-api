import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    for path in ['/toolbox/image-generation', '/toolbox/canvas', '/assets', '/account', '/agent-cloud']:
        page.goto("https://susu.da-ai.cc" + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3000)
        print(path, "| modal:", page.evaluate("() => { const d=document.querySelector('.modal-login-panel'); return d? d.innerText.slice(0,30).replace(/\\n/g,' '):null }"), "| url:", page.url)
    ctx.close(); b.close()
