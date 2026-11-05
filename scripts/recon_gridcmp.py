# -*- coding: utf-8 -*-
"""对比原站 vs 本地 三栏栅格 inline style + 关键容器 rect。

用法: python scripts/recon_gridcmp.py [outdir]
"""
import asyncio, json, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"
VIEWPORT = {"width": 1600, "height": 900}
PATHS = [
    "/toolbox/image-generation",
    "/toolbox/video-generation",
    "/toolbox/ecommerce-image-set",
]

JS = """() => {
  const out = {};
  const g = document.querySelector('.genify-toolbox-3col');
  out.gridStyle = g ? g.getAttribute('style') : null;
  out.gridCols = g ? getComputedStyle(g).gridTemplateColumns : null;
  const shell = document.querySelector('.workspace-main-shell');
  out.shellW = shell ? shell.getBoundingClientRect().width : null;
  const pin = document.querySelector('.workspace-pinned-navigation');
  out.pinW = pin ? pin.getBoundingClientRect().width : null;
  out.pinExpanded = pin ? pin.getAttribute('data-layout-expanded') : null;
  const sec = g ? g.parentElement : null;
  out.sectionPad = sec ? [getComputedStyle(sec).paddingLeft, getComputedStyle(sec).paddingRight] : null;
  out.sectionW = sec ? sec.getBoundingClientRect().width : null;
  for (const sel of ['.toolbox-edit-region','.toolbox-preview-region','.toolbox-queue-region']) {
    const e = document.querySelector(sel);
    out[sel] = e ? e.getBoundingClientRect().width : null;
  }
  const main = document.querySelector('.workspace-main-content');
  out.mainW = main ? main.getBoundingClientRect().width : null;
  out.mainX = main ? main.getBoundingClientRect().x : null;
  const fo = document.querySelector('aside.workspace-floating-navigation');
  out.floatW = fo ? fo.getBoundingClientRect().width : null;
  out.floatCount = document.querySelectorAll('aside.workspace-floating-navigation').length;
  return out;
}"""


async def grab(ctx, base, path):
    page = await ctx.new_page()
    try:
        await page.goto(base + path, wait_until="domcontentloaded", timeout=40000)
        await page.wait_for_timeout(6000)
        return await page.evaluate(JS)
    except Exception as e:
        return {"err": str(e)[:200]}
    finally:
        await page.close()


async def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else ".recon/gridcmp"
    os.makedirs(outdir, exist_ok=True)
    async with async_playwright() as p:
        br = await p.chromium.launch()
        octx = await br.new_context(viewport=VIEWPORT, locale="zh-CN")
        lctx = await br.new_context(viewport=VIEWPORT, locale="zh-CN")
        res = {}
        for path in PATHS:
            o, l = await asyncio.gather(grab(octx, ORIG, path), grab(lctx, LOCAL, path))
            res[path] = {"orig": o, "ours": l}
            print(f"\n=== {path} ===")
            for k in o:
                if o.get(k) != l.get(k):
                    print(f"  {k}:\n     orig = {o.get(k)}\n     ours = {l.get(k)}")
                else:
                    print(f"  {k}: = {o.get(k)}")
        await br.close()
    with open(os.path.join(outdir, "gridcmp.json"), "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)


asyncio.run(main())
