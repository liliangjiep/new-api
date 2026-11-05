# -*- coding: utf-8 -*-
"""检索原站 CSS 中 --color-text / home-scroll-content 的 color 定义。
用法: python scripts/recon_css_rule7.py
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
            for m in re.finditer(r"--color-text\s*:\s*[^;}]+", txt):
                print(f"DEF {name}: ...{txt[max(0,m.start()-140):m.end()+20]}...")
            for m in re.finditer(r"\.home-scroll-content\s*\{[^}]*\}", txt):
                print(f"RULE {name}: {m.group(0)[:300]}")
            for m in re.finditer(r"\.home-decoration-workspace\s*\{[^}]*\}", txt):
                print(f"RULE2 {name}: {m.group(0)[:300]}")
        await b.close()

asyncio.run(main())
