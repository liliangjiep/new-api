# -*- coding: utf-8 -*-
"""对比原站/本地 首页发现区（.home-discover-section）内部结构。
用法: python scripts/recon_discover_struct.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const root = document.querySelector('.home-discover-section');
  if (!root) return null;
  const res = [];
  const rec = (el, d) => {
    for (const c of el.children) {
      const b = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      res.push([d, c.tagName.toLowerCase(), (c.className||'').toString().slice(0,60),
                Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height),
                cs.marginTop, cs.paddingTop, cs.paddingBottom,
                (c.innerText||'').trim().replace(/\\s+/g,' ').slice(0,24)]);
      if (d < 3) rec(c, d+1);
    }
  };
  rec(root, 0);
  return res;
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for base, label in [("https://susu.da-ai.cc", "ORIG"), ("http://localhost:3000", "OURS")]:
            pg = await ctx.new_page()
            await pg.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(7000)
            r = await pg.evaluate(JS)
            print("==", label)
            for row in (r or []):
                print("   ", row)
            await pg.close()
        await b.close()

asyncio.run(main())
