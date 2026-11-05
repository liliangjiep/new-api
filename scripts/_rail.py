import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    for path in ['/', '/canvas', '/toolbox/image-generation']:
        page.goto("https://susu.da-ai.cc" + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(4000)
        print('###', path)
        for i, s in enumerate(page.evaluate("""() => {
          const nav = document.querySelector('.workspace-sidebar-nav-content');
          return Array.from(nav.children).map(e => {
            const a = e.querySelector(':scope > a, :scope > button');
            return e.tagName.toLowerCase() + ' | ' + (a? a.tagName.toLowerCase()+'['+(a.getAttribute('aria-label')||'')+']':'?') + ' | href=' + (a? a.getAttribute('href')||'':'') + ' | cls=' + (e.className||'');
          });
        }""")):
            print(' ', i, s)
    ctx.close(); b.close()
