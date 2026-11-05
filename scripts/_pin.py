import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    for path in ['/', '/canvas', '/assets', '/account', '/toolbox', '/agent-cloud',
                 '/toolbox/video-generation', '/toolbox/image-generation',
                 '/toolbox/depth-video-clone', '/toolbox/digital-human',
                 '/toolbox/ecommerce-image-set', '/toolbox/hot-video-remix',
                 '/toolbox/video-quality-enhance', '/toolbox/video-watermark-remove',
                 '/toolbox/video-subtitle-erase']:
        page.goto("https://susu.da-ai.cc" + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3000)
        r = page.evaluate("""() => {
          const nav = document.querySelector('.workspace-sidebar-nav-content');
          const bare = Array.from(nav.children).filter(e => e.tagName.toLowerCase() !== 'span').length;
          return {
            bare: bare,
            pinned: !!document.querySelector('.workspace-pinned-navigation'),
            pinnedData: document.querySelector('.workspace-pinned-navigation') ? document.querySelector('.workspace-pinned-navigation').getAttribute('data-layout-expanded') : null,
            hasPanel: !!document.querySelector('.workspace-sidebar-panel'),
          };
        }""")
        print("%-38s bare=%d pinned=%s expanded=%s" % (path, r['bare'], r['pinned'], r['pinnedData']))
    ctx.close(); b.close()
