# -*- coding: utf-8 -*-
"""在原站所有 <style>/<link> 中（含外链 css 文件）检索 171717 / home-discover-content。
用法: python scripts/recon_css_rule2.py
"""
import asyncio, re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900})
        pg = await ctx.new_page()
        urls = []
        pg.on("response", lambda r: urls.append(r.url) if "css" in (r.headers.get("content-type") or "") else None)
        await pg.goto("https://susu.da-ai.cc/", wait_until="domcontentloaded", timeout=45000)
        await pg.wait_for_timeout(8000)
        print("css urls:", len(urls))
        for u in urls[:8]:
            print("  ", u[:120])
        # 抓取所有 link rel=stylesheet 的内容
        hrefs = await pg.evaluate("()=>Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(l=>l.href)")
        print("hrefs:", hrefs)
        for h in hrefs:
            try:
                r = await ctx.request.get(h)
                txt = await r.text()
            except Exception as e:
                print("ERR", h[:80], e); continue
            for m in re.finditer(r"[^{}]*\{[^{}]*171717[^{}]*\}", txt):
                print("RULE:", h.split("/")[-1][:40], "=>", m.group(0)[:220])
        await b.close()

asyncio.run(main())
