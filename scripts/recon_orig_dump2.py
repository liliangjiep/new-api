import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

ROUTES = ["/toolbox/image-generation", "/toolbox/video-generation",
          "/toolbox/depth-video-clone", "/toolbox/digital-human", "/toolbox/ecommerce-image-set",
          "/toolbox/video-quality-enhance", "/toolbox/hot-video-remix"]

JS_PANEL = """() => {
  const pp = document.querySelector('.toolbox-preview-panel');
  return pp ? [pp.getAttribute('class')] : ['NO PANEL'];
}"""

JS_COVER = """() => {
  const out=[];
  const c = document.querySelector('.interactive-video-cover');
  if(c) out.push(c.outerHTML.slice(0,1200));
  return out;
}"""

JS_PA = """() => {
  const out=[];
  document.querySelectorAll('[class*=prompt-reference-action]').forEach(e=>out.push(e.tagName+'|'+e.className+'| parent='+e.parentElement.className));
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
    for path in ROUTES:
        print("#"*20, path)
        print(" PANEL:", grab(octx, "https://susu.da-ai.cc", path, JS_PANEL))
        if path == "/toolbox/video-generation":
            for x in grab(octx, "https://susu.da-ai.cc", path, JS_COVER): print(" COVER:", x)
            for x in grab(octx, "https://susu.da-ai.cc", path, JS_PA): print(" PA:", x)
    octx.close(); br.close()
