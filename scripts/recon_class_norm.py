import sys, re, difflib
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

ROUTES = ["/", "/toolbox", "/toolbox/image-generation", "/toolbox/video-generation",
          "/toolbox/depth-video-clone", "/toolbox/digital-human", "/toolbox/ecommerce-image-set",
          "/toolbox/hot-video-remix", "/toolbox/video-quality-enhance",
          "/toolbox/video-watermark-remove", "/toolbox/video-subtitle-erase",
          "/canvas", "/assets", "/account", "/agent-cloud"]

JS = """() => {
  const out = [];
  document.querySelectorAll('*').forEach(el => {
    const c = el.getAttribute('class');
    if (c) out.push(c.trim().split(/\\s+/).sort().join(' '));
  });
  return out;
}"""

def grab(ctx, base, path):
    page = ctx.new_page()
    try:
        page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(4000)
        return page.evaluate(JS)
    except Exception as e:
        print("ERR", path, str(e)[:80]); return None
    finally:
        page.close()

with sync_playwright() as p:
    br = p.chromium.launch()
    octx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    lctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    for path in ROUTES:
        ot = grab(octx, "https://susu.da-ai.cc", path)
        lt = grab(lctx, "http://localhost:3000", path)
        if not ot or not lt: continue
        sa, sb = set(ot), set(lt)
        miss = sorted(sa - sb); ext = sorted(sb - sa)
        print("%-38s exactSet=%.4f  miss=%d extra=%d" % (path, len(sa&sb)/max(1,len(sa)), len(miss), len(ext)))
        for k in miss: print("   MISS:", k[:230])
        for k in ext:  print("   EXTRA:", k[:230])
    octx.close(); lctx.close(); br.close()
