# -*- coding: utf-8 -*-
"""检索原站 CSS 中 --site-home-text / --color-home-text 的浅色定义与使用点。
用法: python scripts/recon_css_rule6.py
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
            for m in re.finditer(r"[^;{}]*--site-home-text\s*:\s*[^;}]+", txt):
                seg = m.group(0)
                if "#171717" in seg or "23 23 23" in seg or "#181818" in seg:
                    print(f"DEF {name}: {seg[-160:]}")
            for m in re.finditer(r"[^;{}]{0,120}--color-home-text[^;{}]{0,120}", txt):
                if "color:" in m.group(0) or "color-" in m.group(0):
                    print(f"USE {name}: {m.group(0)[:200]}")
        await b.close()

asyncio.run(main())
