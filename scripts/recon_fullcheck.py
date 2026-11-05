# -*- coding: utf-8 -*-
"""全站实时几何 + 关键样式对比（原站 vs 本地），输出 JSON + 文本报告。

用法: python scripts/recon_fullcheck.py [outdir]
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
    "/agent-chat",
]

# 关注的结构性 / 尺寸性选择器
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
    ".workspace-navigation-section-item",
    ".generation-skill-card-image",
    ".home-composer-editor-wrap",
    ".ui-waterfall-item",
    ".modal-login-shell",
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


def settle(page, ms=20000):
    dl = time.time() + ms / 1000
    while time.time() < dl:
        try:
            if page.evaluate(SETTLE):
                break
        except Exception:
            pass
        time.sleep(200)
    try:
        page.wait_for_load_state("networkidle", timeout=8000)
    except Exception:
        pass
    page.wait_for_timeout(1500)


def grab(ctx, base, path, shots=None):
    page = ctx.new_page()
    info = {"status": None, "title": None, "url": None, "probes": {}, "err": None}
    try:
        resp = page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        info["status"] = resp.status if resp else None
        settle(page)
        info["title"] = page.title()
        info["url"] = page.url
        info["probes"] = page.evaluate(JS_PROBE, PROBES)
        if shots:
            page.screenshot(path=shots, full_page=False)
    except Exception as e:
        info["err"] = str(e)[:200]
    finally:
        page.close()
    return info


def fmt(v):
    if v is None:
        return "None"
    if isinstance(v, list):
        return "[" + ", ".join(fmt(x) for x in v) + "]"
    return str(v)


def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else ".recon/full"
    os.makedirs(outdir, exist_ok=True)
    os.makedirs(os.path.join(outdir, "shots"), exist_ok=True)
    data = {}
    with sync_playwright() as p:
        br = p.chromium.launch()
        octx = br.new_context(viewport=VIEWPORT, locale="zh-CN")
        lctx = br.new_context(viewport=VIEWPORT, locale="zh-CN")
        for path in ROUTES:
            slug = (path.strip("/") or "root").replace("/", "__")
            o = grab(octx, ORIG, path, os.path.join(outdir, "shots", f"orig_{slug}.png"))
            l = grab(lctx, LOCAL, path, os.path.join(outdir, "shots", f"ours_{slug}.png"))
            data[path] = {"orig": o, "ours": l}
            print(f"[{path}] orig={o['status']} ours={l['status']}"
                  + (f" ERR:{l['err']}" if l["err"] else ""))
            time.sleep(0.4)
        br.close()
    with open(os.path.join(outdir, "full.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    # 文本报告
    lines = []
    for path, d in data.items():
        o, l = d["orig"], d["ours"]
        lines.append(f"\n=== {path} ===")
        lines.append(f"  status orig={o['status']} ours={l['status']}  title o={o['title']!r} l={l['title']!r}")
        if o["url"] != l["url"]:
            lines.append(f"  URL   orig={o['url']}  ours={l['url']}")
        for pr in PROBES:
            op = o["probes"].get(pr) or []
            lp = l["probes"].get(pr) or []
            if not op and not lp:
                continue
            if not op:
                lines.append(f"  {pr}: MISSING-IN-ORIG (ours={fmt(lp[0]['r']) if lp else '-'})")
                continue
            if not lp:
                lines.append(f"  {pr}: MISSING-IN-OURS (orig={fmt(op[0]['r'])})")
                continue
            a, b = op[0], lp[0]
            diffs = []
            if a["r"] != b["r"]:
                diffs.append(f"rect {fmt(a['r'])} -> {fmt(b['r'])}")
            for k in ("fs", "fw", "br", "bc", "bg", "color", "pad", "gap", "h", "w", "minh", "overflow"):
                if a.get(k) != b.get(k):
                    diffs.append(f"{k}: {a.get(k)} -> {b.get(k)}")
            if diffs:
                lines.append(f"  {pr}: " + " | ".join(diffs))
    report = "\n".join(lines)
    with open(os.path.join(outdir, "report.txt"), "w", encoding="utf-8") as f:
        f.write(report)
    print("\n" + report)


if __name__ == "__main__":
    main()
