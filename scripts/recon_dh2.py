import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

JS_DH = """() => {
  const p = document.querySelector('.toolbox-editor-panel-root');
  return p ? [p.outerHTML] : ['NO PANEL'];
}"""

JS_DH2 = """() => {
  const out=[];
  document.querySelectorAll('svg').forEach(e=>{
    const c=e.getAttribute('class')||'';
    if(c.includes('h-4 w-4')) out.push('SVG:'+c+' | parent='+(e.parentElement?e.parentElement.getAttribute('class'):''));
  });
  return out;
}"""

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

with sync_playwright() as p:
    br = p.chromium.launch()
    octx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    lctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    print("### ORIG dh panel"); print("\n".join(grab(octx, "https://susu.da-ai.cc", "/toolbox/digital-human", JS_DH))[:6000])
    print("### LOCAL dh panel"); print("\n".join(grab(lctx, "http://localhost:3000", "/toolbox/digital-human", JS_DH))[:6000])
    print("### ORIG svg h-4 w-4"); print("\n".join(grab(octx, "https://susu.da-ai.cc", "/toolbox/digital-human", JS_DH2)))
    print("### LOCAL svg h-4 w-4"); print("\n".join(grab(lctx, "http://localhost:3000", "/toolbox/digital-human", JS_DH2)))
    octx.close(); lctx.close(); br.close()
