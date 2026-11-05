# -*- coding: utf-8 -*-
"""首页 composer 区域详细对比（找出我们多出的元素 / 高度差来源）。
用法: python scripts/recon_home_composer.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const root = document.querySelector('.home-composer-tool-group') || document.querySelector('.home-header-composer-wrap');
  if (!root) return null;
  const walk = (el, d) => {
    const out = [];
    for (const c of el.children) {
      const b = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      out.push([d, c.tagName.toLowerCase(), (c.className||'').toString().slice(0,64),
                Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height), cs.marginTop]);
    }
    return out;
  };
  const res = [];
  const rec = (el, d) => { if (d > 4) return; res.push(...walk(el, d)); for (const c of el.children) rec(c, d+1); };
  rec(root, 0);
  const tb = document.querySelector('.composer-toolbar');
  const tbr = tb ? tb.getBoundingClientRect() : null;
  const wrap = document.querySelector('.home-header-composer-wrap');
  const wbr = wrap ? wrap.getBoundingClientRect() : null;
  const grp = document.querySelector('.home-composer-tool-group');
  const gbr = grp ? grp.getBoundingClientRect() : null;
  return {res, toolbar: tbr && [Math.round(tbr.x), Math.round(tbr.y), Math.round(tbr.width), Math.round(tbr.height)],
          wrap: wbr && [Math.round(wbr.x), Math.round(wbr.y), Math.round(wbr.width), Math.round(wbr.height)],
          group: gbr && [Math.round(gbr.x), Math.round(gbr.y), Math.round(gbr.width), Math.round(gbr.height)]};
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 1600, "height": 900})).new_page()
        for base in ["https://susu.da-ai.cc", "http://localhost:3000"]:
            await pg.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(7000)
            r = await pg.evaluate(JS)
            print("==", base)
            if not r:
                print("  no composer"); continue
            print("  group:", r["group"], "wrap:", r["wrap"], "toolbar:", r["toolbar"])
            for row in r["res"]:
                print("   ", row)
        await b.close()

asyncio.run(main())
