import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

ROUTES = ["/toolbox/image-generation", "/toolbox/ecommerce-image-set", "/toolbox/hot-video-remix"]

JS = """() => {
  const out=[];
  document.querySelectorAll('[class*=toolbox-selector-trigger]').forEach(e=>{
    const p=e.parentElement;
    out.push('trig:'+e.className.slice(0,60));
    out.push('  parent:'+(p?p.tagName+'.'+p.className:'none'));
    out.push('  gparent:'+(p&&p.parentElement?p.parentElement.tagName+'.'+p.parentElement.className.slice(0,120):'none'));
  });
  return out;
}"""

def grab(ctx, base, path):
    page = ctx.new_page()
    try:
        page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3500)
        return page.evaluate(JS)
    except Exception as e:
        print("ERR", path, str(e)[:80]); return []
    finally:
        page.close()

with sync_playwright() as p:
    br = p.chromium.launch()
    octx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    lctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    for path in ROUTES:
        print("="*20, path)
        print("--- ORIG")
        for x in grab(octx, "https://susu.da-ai.cc", path): print(x)
        print("--- LOCAL")
        for x in grab(lctx, "http://localhost:3000", path): print(x)
    octx.close(); lctx.close(); br.close()
