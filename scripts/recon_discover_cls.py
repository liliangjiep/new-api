# -*- coding: utf-8 -*-
"""对比原站/本地 .discover-card / .ui-waterfall 的完整 class。
用法: python scripts/recon_discover_cls.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const get = (s) => {
    const e = document.querySelector(s);
    return e ? (e.className||'').toString() : null;
  };
  return {
    discoverCard: get('.discover-card'),
    measure: get('.ui-waterfall-item-measure'),
    item: get('.ui-waterfall-item'),
    waterfall: get('.ui-waterfall'),
    discoverContent: get('.home-discover-content'),
    coverShell: get('.discover-card-cover-shell'),
  };
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
            for k, v in r.items():
                print(f"   {k}: {v}")
            await pg.close()
        await b.close()

asyncio.run(main())
