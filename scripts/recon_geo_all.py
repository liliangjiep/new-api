# -*- coding: utf-8 -*-
"""全站 toolbox 关键几何对照（原站 vs 本地）。"""
import sys, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"
PATHS = ["/toolbox/image-generation", "/toolbox/video-generation",
         "/toolbox/depth-video-clone", "/toolbox/digital-human",
         "/toolbox/ecommerce-image-set", "/toolbox/hot-video-remix",
         "/toolbox/video-quality-enhance", "/toolbox/video-subtitle-erase",
         "/toolbox/video-watermark-remove"]

JS = """() => {
  const sels = ['.toolbox-editor-panel-root', '.toolbox-editor-panel-header',
    '.editor-content', '.pr-1', '.generation-root', '.prompt-composer-root',
    '.feature-guide-popover', '.generation-skill-panel', '.generation-settings-picker',
    '.generation-model-picker', '.ui-waterfall', '.home-discover-content'];
  const R = e => { const r = e.getBoundingClientRect();
    return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]; };
  const out = {};
  for (const s of sels) {
    const e = document.querySelector(s);
    if (e) out[s] = R(e);
  }
  // 所有带 role / aria-label 的 section
  const secs = [];
  document.querySelectorAll('section, div[aria-label], nav[aria-label]').forEach(e => {
    const al = e.getAttribute('aria-label');
    if (al) secs.push(al + ' ' + R(e).join(','));
  });
  out.__secs = secs;
  return out;
}"""

def main():
    with sync_playwright() as p:
        br = p.chromium.launch()
        octx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
        lctx = br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
        for path in PATHS:
            res = {}
            for name, ctx, base in (("O", octx, ORIG), ("U", lctx, LOCAL)):
                page = ctx.new_page()
                try:
                    page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
                    page.wait_for_timeout(4500)
                    res[name] = page.evaluate(JS)
                except Exception as e:
                    res[name] = {"err": str(e)[:90]}
                finally:
                    page.close()
            o, l = res["O"], res["U"]
            print(f"\n===== {path} =====")
            if "err" in o or "err" in l:
                print("  ERR", o.get("err"), "|", l.get("err")); continue
            keys = sorted(set(o) | set(l))
            for k in keys:
                if k == "__secs":
                    continue
                if o.get(k) != l.get(k):
                    print(f"  {k}: O={o.get(k)} U={l.get(k)}")
            os_ = set(o["__secs"]); ls_ = set(l["__secs"])
            for s in sorted(os_ - ls_): print("  MISSING", s)
            for s in sorted(ls_ - os_): print("  EXTRA  ", s)
        br.close()

if __name__ == "__main__":
    main()
