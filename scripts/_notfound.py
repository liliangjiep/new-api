import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto("https://susu.da-ai.cc/toolbox/editor", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(3000)
    html = page.evaluate("document.documentElement.outerHTML")
    open('.recon/orig_notfound.html','w',encoding='utf-8').write(html)
    # body text
    txt = page.evaluate("document.body.innerText")
    print(repr(txt[:800]))
    print("---- classes ----")
    for mm in re.finditer(r'<[^>]*class="([^"]*)"[^>]*>', html):
        pass
    ctx.close(); b.close()
