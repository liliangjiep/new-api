# -*- coding: utf-8 -*-
"""在原站 CSS 中检索 --site-home-text 的定义与使用。
用法: python scripts/recon_css_rule5.py
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
        seen = set()
        for h in hrefs:
            try:
                txt = await (await ctx.request.get(h)).text()
            except Exception:
                continue
            name = h.split("/")[-1]
            for m in re.finditer(r"--site-home-text\s*:\s*[^;}]+", txt):
                k = m.group(0)
                if k in seen: continue
                seen.add(k)
                s = max(0, m.start() - 150)
                print(f"--- {name}: ...{txt[s:m.end()+40]}...")
        await b.close()

asyncio.run(main())
