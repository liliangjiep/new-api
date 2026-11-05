import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto("https://susu.da-ai.cc/", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(4000)
    before = page.evaluate("document.body.innerHTML.length")
    btn = page.locator('button.home-entry-tool-card', has_text='剪辑台').first
    try:
        btn.click(timeout=5000)
    except Exception as e:
        print("click err", str(e)[:150])
    page.wait_for_timeout(2000)
    after = page.evaluate("document.body.innerHTML.length")
    print("len", before, after)
    print(page.evaluate("document.body.innerText")[:900])
    # check for dialog/overlay
    print(page.evaluate("""() => Array.from(document.querySelectorAll('[role=dialog], dialog, [data-radix-popper-content-wrapper]')).map(e=>e.className)"""))
    ctx.close(); b.close()
