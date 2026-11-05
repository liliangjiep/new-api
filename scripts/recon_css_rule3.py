# -*- coding: utf-8 -*-
"""在原站 CSS 中检索 171717 / 23,23,23 出现的上下文。
用法: python scripts/recon_css_rule3.py
"""
import asyncio, re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900})
        pg = await ctx.new_page()
        await pg.goto("https://susu.da-ai.cc/", wait_until="domcontentloaded", timeout=45000)
        await pg.wait_for_timeout(7000)
        hrefs = await pg.evaluate("()=>Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(l=>l.href)")
        for h in hrefs:
            try:
                txt = await (await ctx.request.get(h)).text()
            except Exception:
                continue
            name = h.split("/")[-1]
            for m in re.finditer(r"171717", txt):
                s = max(0, m.start() - 180)
                print(f"--- {name}: ...{txt[s:m.end()+60]}...")
        await b.close()

asyncio.run(main())
