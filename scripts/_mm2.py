import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

JS = """() => {
  const el = document.querySelector('.generation-model-picker');
  let p = el;
  for (let i=0;i<3 && p;i++) p = p.parentElement;
  return p ? p.innerHTML.slice(0, 3000) : 'NONE';
}"""

for base, label in [("https://susu.da-ai.cc", 'ORIG'), ("http://localhost:3000", 'LOCAL')]:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
        page = ctx.new_page()
        page.goto(base + "/toolbox/image-generation", wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(4000)
        print('###', label)
        print(page.evaluate(JS))
        ctx.close(); b.close()
