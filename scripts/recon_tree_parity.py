import sys, re, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

ROUTES = ["/", "/toolbox", "/toolbox/image-generation", "/toolbox/video-generation",
          "/toolbox/depth-video-clone", "/toolbox/digital-human", "/toolbox/ecommerce-image-set",
          "/toolbox/hot-video-remix", "/toolbox/video-quality-enhance",
          "/toolbox/video-watermark-remove", "/toolbox/video-subtitle-erase",
          "/canvas", "/assets", "/account", "/agent-cloud"]

TREE_JS = """() => {
  function walk(el, d, out) {
    if (d > 14) return;
    for (const c of el.children) {
      const cls = (c.className && typeof c.className === 'string')
        ? c.className.split(/\\s+/).filter(Boolean).slice(0,2).join('.') : '';
      out.push('  '.repeat(d) + c.tagName.toLowerCase() + (cls ? '.' + cls : ''));
      walk(c, d+1, out);
    }
  }
  const out = [];
  walk(document.body, 0, out);
  return out;
}"""

def grab(ctx, base, path):
    page = ctx.new_page()
    try:
        page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(4000)
        return page.evaluate(TREE_JS)
    except Exception as e:
        print("ERR", path, str(e)[:80])
        return None
    finally:
        page.close()

def sim(a, b):
    import difflib
    sm = difflib.SequenceMatcher(None, a, b)
    return sm.ratio()

with sync_playwright() as p:
    br = p.chromium.launch()
    octx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    lctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    rows = []
    for path in ROUTES:
        ot = grab(octx, "https://susu.da-ai.cc", path)
        lt = grab(lctx, "http://localhost:3000", path)
        if not ot or not lt: continue
        s = sim(ot, lt)
        rows.append((path, s, len(ot), len(lt)))
        print("%-40s %.4f  orig=%d local=%d" % (path, s, len(ot), len(lt)))
        if s < 0.97:
            import difflib
            d = list(difflib.unified_diff(ot, lt, 'orig', 'local', lineterm='', n=1))
            open('.recon/treediff_%s.txt' % path.replace('/','_'), 'w', encoding='utf-8').write('\n'.join(d))
            print("   -> .recon/treediff_%s.txt" % path.replace('/','_'))
    octx.close(); lctx.close(); br.close()
