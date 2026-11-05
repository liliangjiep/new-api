import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    for path in ['/toolbox/video-generation', '/toolbox/depth-video-clone', '/agent-cloud', '/assets', '/account', '/toolbox']:
        page.goto("https://susu.da-ai.cc" + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3500)
        print('###', path, page.evaluate("""() => {
          const nav = document.querySelector('.workspace-sidebar-nav-content');
          if (!nav) return 'NONE';
          return Array.from(nav.children).map(e => {
            const a = e.querySelector(':scope > a, :scope > button');
            return (e.tagName.toLowerCase()==='span'?'SPAN:':'BARE:') + (a? a.getAttribute('aria-label')||'':'?') + (a&&a.getAttribute('aria-expanded')!==null?'[exp='+a.getAttribute('aria-expanded')+']':'');
          }).join(' , ');
        }"""))
    ctx.close(); b.close()
