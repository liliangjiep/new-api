# -*- coding: utf-8 -*-
"""在原站 CSS 中检索设置 color:#171717 / home-discover-content 的规则。
用法: python scripts/recon_css_rule.py
"""
import asyncio, sys, re
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 1600, "height": 900})).new_page()
        await pg.goto("https://susu.da-ai.cc/", wait_until="domcontentloaded", timeout=45000)
        await pg.wait_for_timeout(7000)
        res = await pg.evaluate("""() => {
          const out = [];
          for (const sheet of Array.from(document.styleSheets)) {
            let rules;
            try { rules = sheet.cssRules; } catch(e) { continue; }
            for (const r of Array.from(rules||[])) {
              const t = r.cssText || '';
              if (/171717|home-discover-content/.test(t)) out.push(t.slice(0, 300));
            }
          }
          return out;
        }""")
        for r in res[:25]:
            print(r)
        await b.close()

asyncio.run(main())
