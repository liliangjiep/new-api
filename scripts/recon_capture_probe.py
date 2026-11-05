# -*- coding: utf-8 -*-
"""抓取「原站 or 本地」单站多路由的探针数据 → JSON。

用法: python scripts/recon_capture_probe.py <orig|ours> <outdir> [path ...]
"""
import json, os, sys, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"
VIEWPORT = {"width": 1600, "height": 900}

ROUTES = [
    "/",
    "/toolbox",
    "/toolbox/image-generation",
    "/toolbox/video-generation",
    "/toolbox/depth-video-clone",
    "/toolbox/digital-human",
    "/toolbox/ecommerce-image-set",
    "/toolbox/hot-video-remix",
    "/toolbox/video-quality-enhance",
    "/toolbox/video-subtitle-erase",
    "/toolbox/video-watermark-remove",
    "/canvas",
    "/assets",
    "/account",
    "/agent-cloud",
]

PROBES = [
    ".workspace-shell",
    ".workspace-sidebar",
    ".workspace-main-shell",
    ".workspace-pinned-navigation",
    ".workspace-main-content",
    ".genify-toolbox-3col",
    ".toolbox-edit-region",
    ".toolbox-preview-region",
    ".toolbox-queue-region",
    ".toolbox-editor-panel-root",
    ".toolbox-preview-panel",
    ".toolbox-queue-shell",
    ".prompt-composer-root",
    ".generation-root",
    ".generation-controller",
    ".generation-controller-actions",
    ".toolbox-selector-trigger",
    ".ui-button",
    ".ui-button-primary",
    ".workspace-navigation-section-item",
    ".generation-skill-card-image",
    ".home-composer-editor-wrap",
    ".ui-waterfall-item",
    ".modal-login-shell",
    ".feature-guide-popover",
    ".generation-skill-panel",
    ".ecommerce-config-root",
    ".editor-content",
    ".toolbox-preview-tab",
    ".toolbox-queue-title",
    ".generation-skill-trigger",
    ".generation-controller-submit",
    ".reference-slot-card",
    ".generation-submit-label",
]

JS_PROBE = """(probes) => {
  const rect = (el) => { const r = el.getBoundingClientRect();
    return [Math.round(r.x*10)/10, Math.round(r.y*10)/10, Math.round(r.width*10)/10, Math.round(r.height*10)/10]; };
  const out = {};
  for (const p of probes) {
    const els = Array.from(document.querySelectorAll(p)).slice(0, 3);
    out[p] = els.map(el => {
      const cs = getComputedStyle(el);
      return {
        r: rect(el),
        fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight,
        br: cs.borderRadius, bw: cs.borderWidth, bc: cs.borderColor,
        bg: cs.backgroundColor, color: cs.color,
        pad: cs.padding, mar: cs.margin, gap: cs.gap,
        disp: cs.display, flex: cs.flex, minh: cs.minHeight, minw: cs.minWidth,
        h: cs.height, w: cs.width, overflow: cs.overflow,
        tr: cs.transition, tfc: cs.transform, bt: cs.boxShadow,
      };
    });
  }
  return out;
}"""

SETTLE = """() => {
  const g = document.querySelector('.genify-toolbox-3col');
  if (!g) return true;
  return !!(g.getAttribute('style') || '').includes('--toolbox-expanded-columns');
}"""


def settle(page, ms=15000):
    dl = time.time() + ms / 1000
    while time.time() < dl:
        try:
            if page.evaluate(SETTLE):
                break
        except Exception:
            pass
        time.sleep(150)
    try:
        page.wait_for_load_state("networkidle", timeout=6000)
    except Exception:
        pass
    page.wait_for_timeout(900)


def main():
    which = sys.argv[1]
    outdir = sys.argv[2]
    paths = sys.argv[3:] or ROUTES
    base = ORIG if which == "orig" else LOCAL
    os.makedirs(outdir, exist_ok=True)
    data = {}
    if os.path.exists(os.path.join(outdir, "probe.json")):
        with open(os.path.join(outdir, "probe.json"), encoding="utf-8") as f:
            data = json.load(f)
    with sync_playwright() as p:
        br = p.chromium.launch()
        ctx = br.new_context(viewport=VIEWPORT, locale="zh-CN")
        for path in paths:
            page = ctx.new_page()
            info = {"status": None, "title": None, "url": None, "probes": {}, "err": None}
            try:
                resp = page.goto(base + path, wait_until="domcontentloaded", timeout=40000)
                info["status"] = resp.status if resp else None
                settle(page)
                info["title"] = page.title()
                info["url"] = page.url
                info["probes"] = page.evaluate(JS_PROBE, PROBES)
            except Exception as e:
                info["err"] = str(e)[:200]
            finally:
                page.close()
            data[path] = info
            print(f"{which} {path} status={info['status']} err={info['err']}", flush=True)
        ctx.close()
        br.close()
    with open(os.path.join(outdir, "probe.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print("saved", os.path.join(outdir, "probe.json"))


if __name__ == "__main__":
    main()
