import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto("https://susu.da-ai.cc/", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(4000)
    for name in ['画布', '画质增强', '水印擦除']:
        btn = page.locator('button.home-entry-tool-card', has_text=name).first
        try:
            btn.click(timeout=6000)
        except Exception as e:
            print(name, "click err", str(e)[:100])
        page.wait_for_timeout(1800)
        dlg = page.evaluate("""() => {
          const d = document.querySelector('.modal-login-panel');
          return d ? d.innerText.slice(0,120) : null;
        }""")
        print(name, "| modal:", repr(dlg), "| url:", page.url)
        page.keyboard.press('Escape')
        page.wait_for_timeout(1200)
    ctx.close(); b.close()
