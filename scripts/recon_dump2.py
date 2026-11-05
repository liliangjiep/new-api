import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

ROUTES = ["/", "/toolbox/image-generation", "/toolbox/video-generation",
          "/toolbox/depth-video-clone", "/toolbox/digital-human", "/toolbox/ecommerce-image-set",
          "/toolbox/hot-video-remix", "/toolbox/video-quality-enhance"]

JS = """() => {
  const res = {};
  const push = (k,v)=>{ (res[k]=res[k]||[]).push(v); };
  document.querySelectorAll('.toolbox-preview-panel').forEach(e=>push('preview-panel', e.className));
  document.querySelectorAll('.toolbox-selector-trigger').forEach(e=>push('sel-trigger-parent', e.parentElement ? e.parentElement.className+' | tag='+e.parentElement.tagName : 'none'));
  document.querySelectorAll('.ui-button,button').forEach(e=>{
    const c=e.className||'';
    if (c.includes('rounded-lg') && c.includes('px-3')) push('btn-lg', c);
  });
  return res;
}"""

def grab(ctx, base, path):
    page = ctx.new_page()
    try:
        page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3500)
        return page.evaluate(JS)
    except Exception as e:
        print("ERR", path, str(e)[:80]); return {}
    finally:
        page.close()

with sync_playwright() as p:
    br = p.chromium.launch()
    octx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    lctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    for path in ROUTES:
        o = grab(octx, "https://susu.da-ai.cc", path)
        l = grab(lctx, "http://localhost:3000", path)
        print("="*20, path)
        for k in set(list(o.keys())+list(l.keys())):
            ov = o.get(k, []); lv = l.get(k, [])
            if set(ov)!=set(lv):
                print(" KEY", k)
                for x in sorted(set(ov)): print("   O:", x[:400])
                for x in sorted(set(lv)): print("   L:", x[:400])
    octx.close(); lctx.close(); br.close()
