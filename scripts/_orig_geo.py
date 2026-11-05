# -*- coding: utf-8 -*-
"""原站单页几何实测（只测 orig，固定等待不做复杂 settle）。"""
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
    "/toolbox/image-generation",
    "/toolbox/video-generation",
]
JS = """() => {
  const q = (s) => document.querySelector(s);
  const r = (el) => { if(!el) return null; const b = el.getBoundingClientRect();
    return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
  const nav = q('.workspace-pinned-navigation');
  return {
    title: document.title,
    nav: nav ? [Math.round(nav.getBoundingClientRect().width), nav.getAttribute('data-layout-expanded')] : null,
    editRegion: r(q('.toolbox-edit-region')),
    editorPanel: r(q('.toolbox-editor-panel-root')),
    previewPanel: r(q('.toolbox-preview-panel')),
    previewRegion: r(q('.toolbox-preview-region')),
    ecom: r(q('.ecommerce-config-root')),
    depthContent: r(q('.depth-video-clone-editor-content')),
    composer: r(q('.prompt-composer-root')),
  };
}"""

with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    data = {}
    for path in PATHS:
        pg = ctx.new_page()
        try:
            resp = pg.goto("https://susu.da-ai.cc" + path, wait_until="domcontentloaded", timeout=30000)
            pg.wait_for_timeout(6000)
            d = pg.evaluate(JS)
            d["status"] = resp.status if resp else None
            data[path] = d
            print("[" + path + "] nav=" + json.dumps(d["nav"]) + " edit=" + json.dumps(d["editRegion"]) + " panel=" + json.dumps(d["editorPanel"]) + " preview=" + json.dumps(d["previewRegion"]) + " ecom=" + json.dumps(d["ecom"]) + " depth=" + json.dumps(d["depthContent"]), flush=True)
        except Exception as e:
            print("[" + path + "] ERR " + str(e)[:150], flush=True)
        pg.close()
    ctx.close()
    br.close()
with open(".recon/orig_geo.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
print("SAVED .recon/orig_geo.json", flush=True)
