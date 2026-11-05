import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    for path in ['/toolbox/image-generation', '/toolbox/video-generation']:
        page.goto("https://susu.da-ai.cc" + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3500)
        print(path, page.evaluate("""() => {
          const el = document.querySelector('.generation-skill-trigger');
          return el ? Array.from(el.attributes).map(a=>[a.name,a.value]) : 'NONE';
        }"""))
    ctx.close(); b.close()
