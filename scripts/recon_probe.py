# -*- coding: utf-8 -*-
"""定向几何/样式对比：只跑指定路由 + 指定选择器（原站 vs 本地）。

用法: python scripts/recon_probe.py <outdir> [--routes r1,r2] [--sel sel1,sel2]
"""
import json, os, sys, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"
VIEWPORT = {"width": 1600, "height": 900}

DEFAULT_ROUTES = [
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
]

DEFAULT_SELS = [
    ".prompt-composer-root",
    ".generation-root",
    ".generation-controller",
    ".toolbox-editor-panel-root",
    ".toolbox-edit-region",
    ".toolbox-preview-region",
    ".toolbox-queue-region",
    ".ecommerce-config-root",
    ".editor-content",
    ".ui-button",
    ".toolbox-selector-trigger",
    ".ui-waterfall-item",
    ".ui-waterfall",
    ".home-discover-waterfall",
    ".feature-guide-popover",
    ".generation-skill-panel",
]

JS_PROBE = """(sels) => {
  const out = {};
  const clsOf = (el) => {
    const c = el.className;
    if (!c) return '';
    if (typeof c === 'string') return c.slice(0, 400);
    if (c.baseVal !== undefined) return String(c.baseVal).slice(0, 400);
    return '';
  };
  for (const s of sels) {
    const els = Array.from(document.querySelectorAll(s)).slice(0, 4);
    out[s] = els.map(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        r: [Math.round(r.x*10)/10, Math.round(r.y*10)/10, Math.round(r.width*10)/10, Math.round(r.height*10)/10],
        fs: cs.fontSize, fw: cs.fontWeight, br: cs.borderRadius, bw: cs.borderWidth,
        bc: cs.borderColor, bg: cs.backgroundColor, color: cs.color,
        pad: cs.padding, gap: cs.gap, h: cs.height, w: cs.width, minh: cs.minHeight,
        flex: cs.flex, disp: cs.display, of: cs.overflow,
        cls: clsOf(el),
      };
    });
  }
  return out;
}"""


SETTLE_JS = """() => {
  const g = document.querySelector('.genify-toolbox-3col');
  if (!g) return true;
  const st = g.getAttribute('style') || '';
  if (!st.includes('--toolbox-expanded-columns')) return false;
  const nav = document.querySelector('.workspace-pinned-navigation');
  if (!nav) return false;
  // 原站侧边导航是懒挂载的：必须等到它展开到位再量，否则量到的是展开前的栅格
  return nav.getAttribute('data-layout-expanded') === 'true'
    && nav.getBoundingClientRect().width > 200;
}"""


def grab(ctx, base, path, sels):
    page = ctx.new_page()
    try:
        resp = page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        deadline = time.time() + 20
        while time.time() < deadline:
            try:
                if page.evaluate(SETTLE_JS):
                    break
            except Exception:
                pass
            time.sleep(250)
        page.wait_for_timeout(1200)
        return {"status": resp.status if resp else None, "probes": page.evaluate(JS_PROBE, sels)}
    except Exception as e:
        return {"status": None, "probes": {}, "err": str(e)[:200]}
    finally:
        try:
            page.close()
        except Exception:
            pass


def fmt(v):
    return json.dumps(v, ensure_ascii=False)


def main():
    args = sys.argv[1:]
    outdir = args[0] if args else ".recon/probe"
    routes = DEFAULT_ROUTES
    sels = DEFAULT_SELS
    i = 1
    while i < len(args):
        if args[i] == "--routes":
            routes = args[i + 1].split(",")
            i += 2
        elif args[i] == "--sel":
            sels = args[i + 1].split(",")
            i += 2
        else:
            i += 1
    os.makedirs(outdir, exist_ok=True)
    data = {}
    with sync_playwright() as p:
        br = p.chromium.launch()
        octx = br.new_context(viewport=VIEWPORT, locale="zh-CN")
        lctx = br.new_context(viewport=VIEWPORT, locale="zh-CN")
        for path in routes:
            o = grab(octx, ORIG, path, sels)
            l = grab(lctx, LOCAL, path, sels)
            data[path] = {"orig": o, "ours": l}
            print(f"[{path}] orig={o['status']} ours={l['status']}", flush=True)
        br.close()
    with open(os.path.join(outdir, "probe.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    lines = []
    keys = ("fs", "fw", "br", "bw", "bc", "bg", "color", "pad", "gap", "h", "w", "minh", "flex", "disp", "of")
    for path, d in data.items():
        lines.append(f"\n=== {path} ===")
        o, l = d["orig"]["probes"], d["ours"]["probes"]
        for s in sels:
            op, lp = o.get(s) or [], l.get(s) or []
            if not op and not lp:
                continue
            if not op:
                lines.append(f"  {s}: MISSING-IN-ORIG ours={fmt(lp[0]['r'] if lp else None)}")
                continue
            if not lp:
                lines.append(f"  {s}: MISSING-IN-OURS orig={fmt(op[0]['r'])}")
                continue
            a, b = op[0], lp[0]
            diffs = []
            if a["r"] != b["r"]:
                diffs.append(f"rect {fmt(a['r'])} -> {fmt(b['r'])}")
            for k in keys:
                if a.get(k) != b.get(k):
                    diffs.append(f"{k}: {a.get(k)} -> {b.get(k)}")
            if diffs:
                lines.append(f"  {s}: " + " | ".join(diffs))
                lines.append(f"     orig-cls: {a['cls']}")
                lines.append(f"     ours-cls: {b['cls']}")
    report = "\n".join(lines)
    with open(os.path.join(outdir, "report.txt"), "w", encoding="utf-8") as f:
        f.write(report)
    print("\n" + report)


if __name__ == "__main__":
    main()
