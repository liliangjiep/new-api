# -*- coding: utf-8 -*-
"""对比「新建」按钮完整 class + discover 瀑布流文字色来源。
用法: python scripts/recon_btn_cls.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const btns = Array.from(document.querySelectorAll('.ui-button')).filter(e => e.getBoundingClientRect().width > 0)
    .map(e => [(e.className||'').toString(), (e.innerText||'').trim().slice(0,10)]);
  const card = document.querySelector('.discover-card');
  const cardCs = card ? getComputedStyle(card) : null;
  const wrap = document.querySelector('.home-header-composer-wrap');
  const wcs = wrap ? getComputedStyle(wrap) : null;
  return {btns, cardColor: cardCs && cardCs.color,
          wrapCls: wrap && (wrap.className||'').toString(),
          wrapBorder: wcs && wcs.border, wrapPad: wcs && wcs.padding};
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for base, label in [("https://susu.da-ai.cc", "ORIG"), ("http://localhost:3000", "OURS")]:
            pg = await ctx.new_page()
            await pg.goto(base + "/toolbox/depth-video-clone", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(6000)
            r = await pg.evaluate(JS)
            print("== DEPTH", label)
            for x in r["btns"]:
                print("   btn:", x)
            await pg.close()
            pg = await ctx.new_page()
            await pg.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(6000)
            r = await pg.evaluate(JS)
            print("== HOME", label, "cardColor:", r["cardColor"])
            print("   wrapCls:", r["wrapCls"])
            print("   wrapBorder:", r["wrapBorder"], "pad:", r["wrapPad"])
            await pg.close()
        await b.close()

asyncio.run(main())
