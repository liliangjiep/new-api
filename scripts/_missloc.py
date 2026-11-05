import sys, io, re, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"
ROUTES = ["/", "/toolbox/depth-video-clone", "/toolbox/ecommerce-image-set", "/toolbox/video-generation",
          "/toolbox/image-generation", "/toolbox/video-watermark-remove", "/toolbox/video-subtitle-erase",
          "/toolbox/video-quality-enhance", "/toolbox/digital-human", "/toolbox/hot-video-remix"]
KEY = sys.argv[1] if len(sys.argv) > 1 else None

def grab(ctx, base, path):
    page = ctx.new_page()
    try:
        page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(4500)
        return page.evaluate("document.documentElement.outerHTML")
    except Exception as e:
        print("ERR", path, e)
        return None
    finally:
        page.close()

with sync_playwright() as p:
    b = p.chromium.launch()
    octx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    lctx = b.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
    for path in ROUTES:
        oh = grab(octx, ORIG, path)
        lh = grab(lctx, LOCAL, path)
        if not oh or not lh: continue
        # find classes in orig missing in local
        oc = set()
        for mm in re.finditer(r'class="([^"]*)"', oh):
            oc.update(mm.group(1).split())
        lc = set()
        for mm in re.finditer(r'class="([^"]*)"', lh):
            lc.update(mm.group(1).split())
        miss = sorted(oc - lc)
        extra = sorted(lc - oc)
        print("="*70)
        print(path, "MISSING(%d):" % len(miss))
        for k in miss:
            if KEY and KEY not in k: continue
            # locate an element in orig using this class
            m = re.search(r'<[^>]*class="[^"]*\b%s\b[^"]*"[^>]*>' % re.escape(k), oh)
            print("  -", k, "|", (m.group(0)[:220] if m else "NOTFOUND"))
        print("EXTRA(%d):" % len(extra))
        for k in extra:
            if KEY and KEY not in k: continue
            m = re.search(r'<[^>]*class="[^"]*\b%s\b[^"]*"[^>]*>' % re.escape(k), lh)
            print("  +", k, "|", (m.group(0)[:220] if m else "NOTFOUND"))
    octx.close(); lctx.close(); b.close()
