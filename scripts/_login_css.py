import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto("https://susu.da-ai.cc/", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(4000)
    page.locator('button.home-entry-tool-card', has_text='画布').first.click(timeout=6000)
    page.wait_for_timeout(1500)
    v = page.evaluate("""() => {
      const el = document.querySelector('.modal-login-scroll');
      const cs = getComputedStyle(el);
      const hd = document.querySelector('.modal-login-header');
      return {bg: cs.backgroundImage, scrollbg: cs.backgroundColor,
              headerBg: getComputedStyle(hd).backgroundColor,
              headerH: hd.getBoundingClientRect().height};
    }""")
    print(v)
    ctx.close(); b.close()
