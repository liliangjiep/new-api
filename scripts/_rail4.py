import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    for path in ['/', '/canvas', '/toolbox/video-generation', '/toolbox/depth-video-clone', '/assets']:
        page.goto("https://susu.da-ai.cc" + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(4000)
        print('###', path)
        for s in page.evaluate("""() => {
          const nav = document.querySelector('.workspace-sidebar-nav-content');
          return Array.from(nav.children).map(e => {
            const a = e.tagName.toLowerCase()==='span' ? e.querySelector(':scope > a, :scope > button') : e;
            return (e.tagName.toLowerCase()==='span'?'SPAN ':'BARE ') + (a? (a.getAttribute('aria-label')||'') : '?') + ' exp=' + (a? (a.getAttribute('aria-expanded')===null?'-':a.getAttribute('aria-expanded')):'?') + ' cur=' + (a? (a.getAttribute('aria-current')||'-'):'?');
          });
        }""".replace('\n',' ')):
            print('  ', s)
    ctx.close(); b.close()
