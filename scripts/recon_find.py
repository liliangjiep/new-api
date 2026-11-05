# -*- coding: utf-8 -*-
"""检查某选择器是否存在 + 数量。"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"

JS = """(sels) => {
  const out = {};
  for (const s of sels) {
    const els = document.querySelectorAll(s);
    out[s] = {n: els.length, first: els[0] ? (els[0].getAttribute('class')||'').slice(0,80) : null};
  }
  return out;
}"""

async def main():
    path = sys.argv[1]
    sels = sys.argv[2].split("|")
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for base, tag in ((ORIG, "ORIG"), (LOCAL, "OURS")):
            ctx = await br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
            page = await ctx.new_page()
            await page.goto(base+path, wait_until="domcontentloaded", timeout=45000)
            await page.wait_for_timeout(6000)
            d = await page.evaluate(JS, sels)
            print("="*15, tag, "="*15)
            for k, v in d.items():
                print(f"  {k}: n={v['n']}  {v['first']}")
            await ctx.close()
        await br.close()

asyncio.run(main())
