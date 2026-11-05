# -*- coding: utf-8 -*-
"""定位首页 .ui-waterfall-item 文字色差 (23 vs 24) 与 depth 页 .ui-button 宽度差。
用法: python scripts/recon_fine_diff.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS_HOME = """() => {
  const el = document.querySelector('.ui-waterfall-item');
  if (!el) return null;
  const out = [];
  const rec = (e, d) => {
    for (const c of e.children) {
      const cs = getComputedStyle(c);
      const b = c.getBoundingClientRect();
      out.push([d, (c.className||'').toString().slice(0,52), cs.color, cs.fontSize, cs.fontWeight, Math.round(b.width), (c.innerText||'').trim().replace(/\\s+/g,' ').slice(0,18)]);
      if (d < 2) rec(c, d+1);
    }
  };
  rec(el, 0);
  return out;
}"""

JS_BTN = """() => {
  return Array.from(document.querySelectorAll('.ui-button')).map(e => {
    const b = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return [(e.className||'').toString().slice(0,60), Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height),
            cs.fontSize, cs.padding, cs.gap, (e.innerText||'').trim().slice(0,12)];
  });
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for base, label in [("https://susu.da-ai.cc", "ORIG"), ("http://localhost:3000", "OURS")]:
            pg = await ctx.new_page()
            await pg.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(6000)
            print("== HOME", label)
            for r in (await pg.evaluate(JS_HOME) or []):
                print("   ", r)
            await pg.close()
            pg = await ctx.new_page()
            await pg.goto(base + "/toolbox/depth-video-clone", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(6000)
            print("== DEPTH", label)
            for r in await pg.evaluate(JS_BTN):
                print("   ", r)
            await pg.close()
        await b.close()

asyncio.run(main())
