# -*- coding: utf-8 -*-
"""诊断各工具页：标题/URL/导航宽度/栅格列/关键 rect（原站 vs 本地）。"""
import sys, time, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

ROUTES = [
    "/toolbox/video-generation",
    "/toolbox/image-generation",
    "/toolbox/depth-video-clone",
    "/toolbox/ecommerce-image-set",
    "/toolbox/video-watermark-remove",
]

JS = """() => {
  const q = (s) => document.querySelector(s);
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect();
    return [Math.round(b.x*10)/10, Math.round(b.y*10)/10, Math.round(b.width*10)/10, Math.round(b.height*10)/10]; };
  const g = q('.genify-toolbox-3col');
  const nav = q('.workspace-pinned-navigation');
  return {
    title: document.title, url: location.href,
    gridStyle: g ? g.getAttribute('style') : null,
    gridCols: g ? getComputedStyle(g).gridTemplateColumns : null,
    navW: nav ? Math.round(nav.getBoundingClientRect().width*10)/10 : null,
    navExp: nav ? nav.getAttribute('data-layout-expanded') : null,
    edit: r(q('.toolbox-edit-region')),
    composer: r(q('.prompt-composer-root')),
    uiBtn: r(q('.ui-button')),
    nBtn: document.querySelectorAll('.ui-button').length,
    bodyH: document.body.scrollHeight,
    water: Array.from(document.querySelectorAll('[aria-label*="\\u6c34\\u5370"]')).map(e => e.getAttribute('aria-label')),
  };
}"""

with sync_playwright() as p:
    br = p.chromium.launch()
    out = {}
    for base, tag in (("https://susu.da-ai.cc", "orig"), ("http://localhost:3000", "ours")):
        out[tag] = {}
        ctx = br.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for path in ROUTES:
            pg = ctx.new_page()
            try:
                resp = pg.goto(base + path, wait_until="domcontentloaded", timeout=45000)
                dl = time.time() + 20
                while time.time() < dl:
                    try:
                        if pg.evaluate("() => { const n = document.querySelector('.workspace-pinned-navigation'); return n && n.getAttribute('data-layout-expanded') === 'true' && n.getBoundingClientRect().width > 200; }"):
                            break
                    except Exception:
                        pass
                    time.sleep(250)
                pg.wait_for_timeout(1200)
                d = pg.evaluate(JS)
                d["status"] = resp.status if resp else None
                out[tag][path] = d
                print(tag, path, "status=", d["status"], "title=", d["title"], flush=True)
            except Exception as e:
                out[tag][path] = {"err": str(e)[:200]}
                print(tag, path, "ERR", str(e)[:120], flush=True)
            pg.close()
        ctx.close()
    br.close()

with open(".recon/diag_pages.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
for path in ROUTES:
    print("\n=== " + path + " ===")
    for tag in ("orig", "ours"):
        d = out[tag].get(path, {})
        print(tag, json.dumps(d, ensure_ascii=False))
