# -*- coding: utf-8 -*-
"""对比原站/本地首页作用域内的 --color-foreground / --color-text 变量值。
用法: python scripts/recon_home_token.py
"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const ph = document.querySelector('.page-home');
  const cs = ph ? getComputedStyle(ph) : null;
  const root = getComputedStyle(document.documentElement);
  const names = ['--color-foreground','--foreground','--color-text','--site-home-text','--color-home-entry-text'];
  const v = {};
  for (const n of names) v[n] = [root.getPropertyValue(n).trim(), cs ? cs.getPropertyValue(n).trim() : null];
  return {pageHomeColor: cs && cs.color, v};
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for base, label in [("https://susu.da-ai.cc", "ORIG"), ("http://localhost:3000", "OURS")]:
            pg = await ctx.new_page()
            await pg.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(7000)
            print("==", label, await pg.evaluate(JS))
            await pg.close()
        await b.close()

asyncio.run(main())
