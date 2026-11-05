# -*- coding: utf-8 -*-
"""首页 composer 工具栏内部元素对比（找差异细节）。
用法: python scripts/recon_home_toolbar.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const tb = document.querySelector('.composer-toolbar');
  if (!tb) return null;
  const res = [];
  const rec = (el, d) => {
    for (const c of el.children) {
      const b = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      res.push([d, c.tagName.toLowerCase(), (c.className||'').toString().slice(0,70),
                Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height),
                (c.innerText||'').trim().replace(/\\s+/g,' ').slice(0,20)]);
      if (d < 3) rec(c, d+1);
    }
  };
  rec(tb, 0);
  const ed = document.querySelector('.home-composer-editor');
  const er = ed ? ed.getBoundingClientRect() : null;
  return {res, editor: er && [Math.round(er.x), Math.round(er.y), Math.round(er.width), Math.round(er.height)]};
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 1600, "height": 900})).new_page()
        for base in ["https://susu.da-ai.cc", "http://localhost:3000"]:
            await pg.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(7000)
            r = await pg.evaluate(JS)
            print("==", base, "editor:", r and r["editor"])
            if r:
                for row in r["res"]:
                    print("   ", row)
        await b.close()

asyncio.run(main())
