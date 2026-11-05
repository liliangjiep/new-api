import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto("https://susu.da-ai.cc/", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(4000)
    # type prompt and submit
    ed = page.locator('.ProseMirror, [contenteditable=true]').first
    ed.click(timeout=5000)
    page.keyboard.type("测试一下")
    page.wait_for_timeout(500)
    btn = page.locator('button').filter(has_text="").last
    print(page.evaluate("""() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.map(b=>[b.className.slice(0,80), b.innerText.trim().slice(0,12), b.disabled]).filter(x=>x[2]===false).slice(-12);
    }"""))
    ctx.close(); b.close()
