import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

def grab(ctx, base, path, js):
    page = ctx.new_page()
    try:
        page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(4000)
        return page.evaluate(js)
    except Exception as e:
        print("ERR", path, str(e)[:120]); return []
    finally:
        page.close()

JS = """() => {
  const pp = document.querySelector('.toolbox-preview-panel');
  return pp ? [pp.outerHTML] : ['NO PANEL'];
}"""

JS_H = """() => {
  const out=[];
  document.querySelectorAll('[class*=prompt-reference-action]').forEach(e=>out.push(e.tagName+'|'+e.getAttribute('class')+'| parent='+e.parentElement.getAttribute('class')));
  return out;
}"""

for path, js in [("/toolbox/digital-human", JS), ("/toolbox/video-generation", JS_H),
                 ("/toolbox/ecommerce-image-set", JS)]:
    print("#"*20, path)
    for x in grab(lctx, "http://localhost:3000", path, js): print(x)
    print("-"*10, "ORIG")
    for x in grab(octx, "https://susu.da-ai.cc", path, js): print(x)
