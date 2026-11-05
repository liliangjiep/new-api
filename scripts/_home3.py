import sys, re, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto("https://susu.da-ai.cc/", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(4500)
    html = page.evaluate("document.documentElement.outerHTML")
    open('.recon/orig_home_live.html','w',encoding='utf-8').write(html)
    # find the tool entry strip
    els = page.evaluate("""() => {
      const out = [];
      document.querySelectorAll('*').forEach(el => {
        const t = (el.innerText||'').trim();
        if (el.children.length <= 3 && t.includes('剪辑') && t.length < 60) {
          out.push([el.tagName, el.className, t.slice(0,60)]);
        }
      });
      return out.slice(0,10);
    }""")
    for e in els: print(e)
    ctx.close(); b.close()
