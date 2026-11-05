import sys, re, json, difflib
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

ROUTES = ["/", "/toolbox", "/toolbox/image-generation", "/toolbox/video-generation",
          "/toolbox/depth-video-clone", "/toolbox/digital-human", "/toolbox/ecommerce-image-set",
          "/toolbox/hot-video-remix", "/toolbox/video-quality-enhance",
          "/toolbox/video-watermark-remove", "/toolbox/video-subtitle-erase",
          "/canvas", "/assets", "/account", "/agent-cloud"]

# full class attribute strings in document order, deduped consecutive
JS = """() => {
  const out = [];
  document.querySelectorAll('*').forEach(el => {
    const c = el.getAttribute('class');
    if (c) out.push(c.trim());
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

def seq_sim(a, b):
    sm = difflib.SequenceMatcher(None, a, b)
    return sm.ratio()

with sync_playwright() as p:
    br = p.chromium.launch()
    octx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    lctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    for path in ROUTES:
        ot = grab(octx, "https://susu.da-ai.cc", path)
        lt = grab(lctx, "http://localhost:3000", path)
        if not ot or not lt: continue
        s = seq_sim(ot, lt)
        # also set-based on full strings
        sa, sb = set(ot), set(lt)
        print("%-38s seq=%.4f  exactSet=%.4f  orig=%d local=%d" % (path, s, len(sa&sb)/max(1,len(sa)), len(ot), len(lt)))
        miss = sorted(sa - sb)
        if miss:
            with open('.recon/clsord_%s.txt' % path.replace('/','_'), 'w', encoding='utf-8') as f:
                f.write('\n'.join(miss))
            print("    missing(%d) -> .recon/clsord_%s.txt" % (len(miss), path.replace('/','_')))
    octx.close(); lctx.close(); br.close()
