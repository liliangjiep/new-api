# -*- coding: utf-8 -*-
"""读取某个元素上的 CSS 变量值。"""
import asyncio, json, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"

JS = """(args) => {
  const [sel, vars] = args;
  const el = document.querySelector(sel) || document.documentElement;
  const out = {};
  for (const v of vars) {
    out[v] = getComputedStyle(el).getPropertyValue(v).trim();
  }
  return out;
}"""

async def main():
    path, sel = sys.argv[1], sys.argv[2]
    vars = sys.argv[3].split("|")
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for base, tag in ((ORIG, "ORIG"), (LOCAL, "OURS")):
            ctx = await br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
            page = await ctx.new_page()
            await page.goto(base+path, wait_until="domcontentloaded", timeout=45000)
            await page.wait_for_timeout(6000)
            d = await page.evaluate(JS, [sel, vars])
            print("="*15, tag, "="*15)
            for k, v in d.items():
                print(f"  {k} = {v}")
            await ctx.close()
        await br.close()

asyncio.run(main())
