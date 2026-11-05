import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

JS = """() => {
  const out = [];
  document.querySelectorAll('*').forEach(el => {
    const c = (el.getAttribute('class')||'').trim().split(/\\s+/).sort().join(' ');
    if (c === 'min-w-0 relative' || c.includes('generation-model-picker') || c.includes('generation-settings-picker'))
      out.push(c + '  <<< ' + el.tagName);
  });
  return out;
}"""

for base, label in [("https://susu.da-ai.cc", 'ORIG'), ("http://localhost:3000", 'LOCAL')]:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
        page = ctx.new_page()
        page.goto(base + "/toolbox/image-generation", wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(4000)
        print('###', label)
        for s in page.evaluate(JS): print('  ', s)
        ctx.close(); b.close()
