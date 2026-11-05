# -*- coding: utf-8 -*-
"""首页 composer / 瀑布流 元素对比。
用法: python scripts/recon_home_cmp.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const out = [];
  document.querySelectorAll('*').forEach((e) => {
    const c = e.className;
    if (typeof c !== 'string') return;
    if (/composer|waterfall|entry-scene|home-/.test(c)) {
      const b = e.getBoundingClientRect();
      out.push([c.slice(0, 70), Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]);
    }
  });
  return out.slice(0, 40);
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 1600, "height": 900})).new_page()
        for base in ["https://susu.da-ai.cc", "http://localhost:3000"]:
            await pg.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(7000)
            print("==", base)
            for x in await pg.evaluate(JS):
                print("  ", x)
        await b.close()

asyncio.run(main())
