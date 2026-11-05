# -*- coding: utf-8 -*-
"""在原站 CSS 中检索 page-home / home-discover-section 的规则。
用法: python scripts/recon_css_rule4.py
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
            for key in ("page-home", "home-discover-section"):
                for m in re.finditer(re.escape(key), txt):
                    s = max(0, m.start() - 100)
                    seg = txt[s:m.end()+200]
                    if "color" in seg:
                        print(f"--- {name} [{key}]: ...{seg[:340]}...")
        await b.close()

asyncio.run(main())
