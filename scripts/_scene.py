import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    page = ctx.new_page()
    page.goto("https://susu.da-ai.cc/", wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(4000)
    els = page.evaluate("""() => {
      const out = [];
      document.querySelectorAll('*').forEach(el => {
        const t = (el.innerText||'').trim();
        if (t === '爆款复刻' && el.children.length <= 3) {
          let p = el;
          for (let i=0;i<4 && p.parentElement;i++) p = p.parentElement;
          out.push([el.tagName, el.className, p.tagName, p.className]);
        }
      });
      return out;
    }""")
    for e in els: print(e)
    # click the scene card 爆款复刻
    for name in ['爆款复刻', '商详套图']:
        card = page.locator('text=%s' % name).first
        try:
            card.click(timeout=5000)
        except Exception as e:
            print(name, 'err', str(e)[:100])
        page.wait_for_timeout(2000)
        print(name, '-> url:', page.url, '| modal:', page.evaluate("() => { const d=document.querySelector('.modal-login-panel'); return d? d.innerText.slice(0,40):null }"))
        page.keyboard.press('Escape')
        page.wait_for_timeout(1000)
    ctx.close(); b.close()
