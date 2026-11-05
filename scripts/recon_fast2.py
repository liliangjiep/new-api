# -*- coding: utf-8 -*-
"""稳健版全站对比：等待路由特征选择器出现 + networkidle，再逐项对比。

用法: python scripts/recon_fast2.py [outdir]
"""
import asyncio, json, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"
VIEWPORT = {"width": 1600, "height": 900}

# path -> 关键选择器（等待其出现才认为渲染完成）
KEY = {
    "/": ".home-composer-editor-wrap",
    "/toolbox": ".workspace-shell",
    "/toolbox/image-generation": ".genify-toolbox-3col",
    "/toolbox/video-generation": ".genify-toolbox-3col",
    "/toolbox/depth-video-clone": ".genify-toolbox-3col",
    "/toolbox/digital-human": ".genify-toolbox-3col",
    "/toolbox/ecommerce-image-set": ".genify-toolbox-3col",
    "/toolbox/hot-video-remix": ".genify-toolbox-3col",
    "/toolbox/video-quality-enhance": ".genify-toolbox-3col",
    "/toolbox/video-subtitle-erase": ".genify-toolbox-3col",
    "/toolbox/video-watermark-remove": ".genify-toolbox-3col",
    "/canvas": ".workspace-shell",
    "/assets": ".workspace-shell",
    "/account": ".workspace-shell",
    "/agent-cloud": ".workspace-shell",
    "/agent-chat": ".workspace-shell",
}

PROBES = [
    ".workspace-shell", ".workspace-sidebar", ".workspace-main-shell",
    ".workspace-pinned-navigation", ".workspace-main-content",
    ".genify-toolbox-3col", ".toolbox-edit-region", ".toolbox-preview-region",
    ".toolbox-queue-region", ".toolbox-editor-panel-root", ".toolbox-preview-panel",
    ".toolbox-queue-shell", ".prompt-composer-root", ".generation-root",
    ".generation-controller", ".generation-controller-actions", ".toolbox-selector-trigger",
    ".ui-button", ".workspace-navigation-section-item", ".generation-skill-card-image",
    ".home-composer-editor-wrap", ".ui-waterfall-item", ".modal-login-shell",
    ".result-example-display", ".result-example-carousel", ".result-example-image",
    ".home-entry-scene-card", ".feature-guide-popover", ".generation-skill-panel",
    ".reference-slot-card", ".toolbox-editor-panel-header", ".toolbox-preview-tab",
    ".toolbox-queue-title", ".generation-skill-trigger", ".option-item-action",
]

JS_PROBE = """(probes) => {
  const rect = (el) => { const r = el.getBoundingClientRect();
    return [Math.round(r.x*10)/10, Math.round(r.y*10)/10, Math.round(r.width*10)/10, Math.round(r.height*10)/10]; };
  const out = {};
  for (const p of probes) {
    const els = Array.from(document.querySelectorAll(p)).slice(0, 3);
    out[p] = els.map(el => {
      const cs = getComputedStyle(el);
      const im = el.querySelector('img') || (el.tagName === 'IMG' ? el : null);
      return {
        r: rect(el),
        fs: cs.fontSize, fw: cs.fontWeight, br: cs.borderRadius, bw: cs.borderWidth,
        bc: cs.borderColor, bg: cs.backgroundColor, color: cs.color,
        pad: cs.padding, gap: cs.gap, h: cs.height, w: cs.width,
        minh: cs.minHeight, overflow: cs.overflow, objFit: cs.objectFit,
        img: im ? [Math.round(im.getBoundingClientRect().width*10)/10,
                   Math.round(im.getBoundingClientRect().height*10)/10,
                   getComputedStyle(im).objectFit,
                   getComputedStyle(im).borderRadius,
                   Math.round(im.getBoundingClientRect().x*10)/10,
                   Math.round(im.getBoundingClientRect().y*10)/10] : null,
      };
    });
  }
  out.__docH = document.documentElement.scrollHeight;
  out.__title = document.title;
  return out;
}"""


async def grab(ctx, base, path, key, shots=None):
    page = await ctx.new_page()
    info = {"status": None, "title": None, "url": None, "probes": {}, "err": None}
    try:
        resp = await page.goto(base + path, wait_until="domcontentloaded", timeout=45000)
        info["status"] = resp.status if resp else None
        # 等关键选择器
        try:
            await page.wait_for_selector(key, timeout=25000)
        except Exception:
            pass
        try:
            await page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass
        # 等栅格 inline style 写入
        dl = asyncio.get_event_loop().time() + 20
        while asyncio.get_event_loop().time() < dl:
            try:
                ok = await page.evaluate(
                    """(k) => {
                        const g = document.querySelector('.genify-toolbox-3col');
                        if (!g) return true;
                        return (g.getAttribute('style')||'').includes('--toolbox-expanded-columns');
                    }""", key)
                if ok:
                    break
            except Exception:
                pass
            await asyncio.sleep(0.25)
        await page.wait_for_timeout(2500)
        info["title"] = await page.title()
        info["url"] = page.url
        info["probes"] = await page.evaluate(JS_PROBE, PROBES)
        if shots:
            await page.screenshot(path=shots, full_page=True)
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
    outdir = sys.argv[1] if len(sys.argv) > 1 else ".recon/fast2"
    os.makedirs(os.path.join(outdir, "shots"), exist_ok=True)
    data = {}
    async with async_playwright() as p:
        br = await p.chromium.launch()
        octx = await br.new_context(viewport=VIEWPORT, locale="zh-CN")
        lctx = await br.new_context(viewport=VIEWPORT, locale="zh-CN")
        sem = asyncio.Semaphore(3)

        async def one(path):
            slug = (path.strip("/") or "root").replace("/", "__")
            key = KEY.get(path, ".workspace-shell")

            async def run(base, ctx, tag):
                async with sem:
                    return await grab(ctx, base, path, key,
                                      os.path.join(outdir, "shots", f"{tag}_{slug}.png"))
            o, l = await asyncio.gather(run(ORIG, octx, "orig"), run(LOCAL, lctx, "ours"))
            data[path] = {"orig": o, "ours": l}
            print(f"[{path}] orig={o['status']} ours={l['status']}", flush=True)

        for pth in KEY:
            await one(pth)
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
        if o["probes"].get("__docH") != l["probes"].get("__docH"):
            lines.append(f"  docHeight: {o['probes'].get('__docH')} -> {l['probes'].get('__docH')}")
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
