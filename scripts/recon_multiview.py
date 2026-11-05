# -*- coding: utf-8 -*-
"""多视口宽度下对比面板/栅格定位（原站 vs 本地）。"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"
JS = """() => {
  const out = {};
  const p = document.querySelector('.generation-skill-panel');
  if (p) { const r = p.getBoundingClientRect();
    out.panel = [r.x, r.y, r.width, r.height];
    out.offsetParent = p.offsetParent ? p.offsetParent.className.toString().slice(0,60) : null;
    let a = p.parentElement, chain = [];
    while (a && a !== document.documentElement) {
      const cs = getComputedStyle(a);
      chain.push({cls: a.className.toString().slice(0,70), bf: cs.backdropFilter, f: cs.filter, t: cs.transform});
      a = a.parentElement;
    }
    out.ancestors = chain;
  }
  const g = document.querySelector('.genify-toolbox-3col');
  if (g) { const r = g.getBoundingClientRect(); out.grid = [r.x, r.y, r.width, r.height]; }
  const e = document.querySelector('.toolbox-edit-region');
  if (e) { const r = e.getBoundingClientRect(); out.edit = [r.x, r.y, r.width, r.height]; }
  const gr = document.querySelector('.generation-root');
  if (gr) { const r = gr.getBoundingClientRect(); out.genRoot = [r.x, r.y, r.width, r.height]; }
  const pin = document.querySelector('.workspace-pinned-navigation');
  out.pinW = pin ? Math.round(pin.getBoundingClientRect().width) : null;
  return out;
}"""

async def grab(ctx, base, path):
    page = await ctx.new_page()
    try:
        await page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(9000)
        return await page.evaluate(JS)
    except Exception as e:
        return {"err": str(e)[:150]}
    finally:
        await page.close()

async def main():
    path = sys.argv[1]
    widths = [int(x) for x in (sys.argv[2:] or ["1280", "1600", "1920"])]
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for w in widths:
            octx = await br.new_context(viewport={"width": w, "height": 900}, locale="zh-CN")
            lctx = await br.new_context(viewport={"width": w, "height": 900}, locale="zh-CN")
            o, l = await asyncio.gather(grab(octx, ORIG, path), grab(lctx, LOCAL, path))
            print(f"\n=== width {w} ===")
            for k in o:
                if o.get(k) != l.get(k):
                    print(f"  {k}: ORIG={json.dumps(o.get(k),ensure_ascii=False)}  OURS={json.dumps(l.get(k),ensure_ascii=False)}")
                else:
                    print(f"  {k}: = {json.dumps(o.get(k),ensure_ascii=False)}")
            await octx.close(); await lctx.close()
        await br.close()

asyncio.run(main())
