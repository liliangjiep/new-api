# -*- coding: utf-8 -*-
"""全站并行快检：原站 vs 本地，实时几何 + 关键样式 + 路由状态 + 截图。

比 recon_fullcheck.py 快很多（并发 + 短 settle）。
用法: python scripts/recon_fast.py [outdir]
"""
import asyncio, json, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

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
    "/toolbox/video-subtitle-remove",
    "/toolbox/video-subtitle-erase",
    "/toolbox/video-watermark-remove",
    "/canvas",
    "/assets",
    "/account",
    "/agent-cloud",
    "/agent-chat",
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
    ".workspace-navigation-section-item",
    ".generation-skill-card-image",
    ".home-composer-editor-wrap",
    ".ui-waterfall-item",
    ".modal-login-shell",
    ".result-example-display",
    ".result-example-carousel",
    ".result-example-image",
    ".home-entry-scene-card",
    ".feature-guide-popover",
    ".generation-skill-panel",
    ".reference-slot-card",
]

JS_PROBE = """(probes) => {
  const rect = (el) => { const r = el.getBoundingClientRect();
    return [Math.round(r.x*10)/10, Math.round(r.y*10)/10, Math.round(r.width*10)/10, Math.round(r.height*10)/10]; };
  const out = {};
  for (const p of probes) {
    const els = Array.from(document.querySelectorAll(p)).slice(0, 3);
    out[p] = els.map(el => {
      const cs = getComputedStyle(el);
      const im = el.querySelector('img');
      return {
        r: rect(el),
        fs: cs.fontSize, fw: cs.fontWeight, br: cs.borderRadius, bw: cs.borderWidth,
        bc: cs.borderColor, bg: cs.backgroundColor, color: cs.color,
        pad: cs.padding, gap: cs.gap, h: cs.height, w: cs.width,
        minh: cs.minHeight, overflow: cs.overflow, objFit: cs.objectFit,
        img: im ? [im.getBoundingClientRect().width, im.getBoundingClientRect().height,
                   getComputedStyle(im).objectFit, getComputedStyle(im).borderRadius] : null,
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


async def grab(ctx, base, path, shots=None):
    page = await ctx.new_page()
    info = {"status": None, "title": None, "url": None, "probes": {}, "err": None}
    try:
        resp = await page.goto(base + path, wait_until="domcontentloaded", timeout=40000)
        info["status"] = resp.status if resp else None
        dl = asyncio.get_event_loop().time() + 15
        while asyncio.get_event_loop().time() < dl:
            try:
                if await page.evaluate(SETTLE):
                    break
            except Exception:
                pass
            await asyncio.sleep(0.25)
        await page.wait_for_timeout(1200)
        info["title"] = await page.title()
        info["url"] = page.url
        info["probes"] = await page.evaluate(JS_PROBE, PROBES)
        if shots:
            await page.screenshot(path=shots, full_page=False)
    except Exception as e:
        info["err"] = str(e)[:200]
    finally:
        await page.close()
    return info


def fmt(v):
    if v is None:
        return "None"
    if isinstance(v, list):
        return "[" + ", ".join(fmt(x) for x in v) + "]"
    return str(v)


async def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else ".recon/fast"
    os.makedirs(os.path.join(outdir, "shots"), exist_ok=True)
    data = {}
    async with async_playwright() as p:
        br = await p.chromium.launch()
        octx = await br.new_context(viewport=VIEWPORT, locale="zh-CN")
        lctx = await br.new_context(viewport=VIEWPORT, locale="zh-CN")
        sem = asyncio.Semaphore(4)

        async def one(path):
            slug = (path.strip("/") or "root").replace("/", "__")

            async def run(base, ctx, tag):
                async with sem:
                    return await grab(ctx, base, path,
                                      os.path.join(outdir, "shots", f"{tag}_{slug}.png"))
            o, l = await asyncio.gather(run(ORIG, octx, "orig"), run(LOCAL, lctx, "ours"))
            data[path] = {"orig": o, "ours": l}
            print(f"[{path}] orig={o['status']} ours={l['status']}"
                  + (f" ERR:{l['err']}" if l["err"] else ""), flush=True)

        await asyncio.gather(*[one(p) for p in ROUTES])
        await br.close()

    with open(os.path.join(outdir, "full.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

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
            for k in ("fs", "fw", "br", "bw", "bc", "bg", "color", "pad", "gap", "h", "w", "minh", "overflow", "objFit"):
                if a.get(k) != b.get(k):
                    diffs.append(f"{k}: {a.get(k)} -> {b.get(k)}")
            if a.get("img") != b.get("img"):
                diffs.append(f"img: {fmt(a.get('img'))} -> {fmt(b.get('img'))}")
            if diffs:
                lines.append(f"  {pr}: " + " | ".join(diffs))
    report = "\n".join(lines)
    with open(os.path.join(outdir, "report.txt"), "w", encoding="utf-8") as f:
        f.write(report)
    print("\n" + report)


asyncio.run(main())
