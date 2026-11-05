# -*- coding: utf-8 -*-
"""轻量探针：只测 3 个视频工具页的 panel/preview 几何（1600px），单页超时保护。"""
import sys, time, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

BASES = {"orig": "https://susu.da-ai.cc", "ours": "http://localhost:3000"}
PATHS = ["/toolbox/video-quality-enhance", "/toolbox/video-subtitle-erase",
         "/toolbox/video-watermark-remove"]
SELS = [".toolbox-editor-panel-root", ".toolbox-preview-panel",
        ".toolbox-preview-region", ".toolbox-edit-region",
        ".toolbox-queue-region"]
JS = """(sels) => {
  const out = {};
  for (const s of sels) {
    const el = document.querySelector(s);
    if (!el) { out[s] = null; continue; }
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out[s] = { r: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)],
               disp: cs.display, flex: cs.flex, cls: String(el.className).slice(0, 220) };
  }
  return out;
}"""

def one(pw, base, path):
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
    pg = ctx.new_page()
    try:
        resp = pg.goto(base + path, wait_until="domcontentloaded", timeout=30000)
        t0 = time.time()
        while time.time() - t0 < 15:
            try:
                ok = pg.evaluate("() => { const n = document.querySelector('.workspace-pinned-navigation'); return n && n.getAttribute('data-layout-expanded') === 'true' && n.getBoundingClientRect().width > 200; }")
                if ok: break
            except Exception: pass
            time.sleep(300)
        pg.wait_for_timeout(1000)
        return {"status": resp.status if resp else None, "probes": pg.evaluate(JS, SELS)}
    except Exception as e:
        return {"status": None, "probes": {}, "err": str(e)[:120]}
    finally:
        pg.close(); ctx.close(); br.close()

with sync_playwright() as p:
    data = {}
    for path in PATHS:
        o = one(p, BASES["orig"], path)
        u = one(p, BASES["ours"], path)
        data[path] = {"orig": o, "ours": u}
        print("[" + path + "]", flush=True)
        for s in SELS:
            a = (o.get("probes") or {}).get(s)
            b = (u.get("probes") or {}).get(s)
            ra = a["r"] if a else None
            rb = b["r"] if b else None
            mark = "OK " if ra == rb else "DIFF"
            print("  " + mark + " " + s + " orig=" + json.dumps(ra) + " ours=" + json.dumps(rb), flush=True)
with open(".recon/pb_vid.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
print("SAVED .recon/pb_vid.json", flush=True)
