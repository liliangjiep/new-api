# -*- coding: utf-8 -*-
"""本地单页几何实测（只测 ours，不碰原站，避免限流挂起）。"""
import sys, time, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

PATHS = [
    "/toolbox/video-quality-enhance",
    "/toolbox/video-subtitle-erase",
    "/toolbox/video-watermark-remove",
    "/toolbox/ecommerce-image-set",
    "/toolbox/depth-video-clone",
    "/toolbox/hot-video-remix",
    "/",
]
SELS = [
    ".toolbox-editor-panel-root",
    ".toolbox-preview-panel",
    ".toolbox-preview-region",
    ".toolbox-edit-region",
    ".ecommerce-config-root",
    ".depth-video-clone-editor-content",
    ".editor-content",
    ".ui-waterfall-item",
    ".ui-waterfall",
    ".prompt-composer-root",
    ".generation-root",
]
JS = """(sels) => {
  const out = {};
  for (const s of sels) {
    const els = Array.from(document.querySelectorAll(s)).slice(0, 3);
    out[s] = els.map(el => {
      const b = el.getBoundingClientRect();
      return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
    });
  }
  return out;
}"""

with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    data = {}
    for path in PATHS:
        pg = ctx.new_page()
        try:
            resp = pg.goto("http://localhost:3000" + path, wait_until="domcontentloaded", timeout=30000)
            pg.wait_for_timeout(4000)
            probes = pg.evaluate(JS, SELS)
            data[path] = {"status": resp.status if resp else None, "probes": probes}
            print("[" + path + "] status=" + str(data[path]["status"]), flush=True)
            for s in SELS:
                v = probes.get(s)
                if v:
                    print("   " + s + " " + json.dumps(v[0]), flush=True)
        except Exception as e:
            print("[" + path + "] ERR " + str(e)[:120], flush=True)
        pg.close()
    ctx.close()
    br.close()
with open(".recon/local_geo.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
print("SAVED .recon/local_geo.json", flush=True)
