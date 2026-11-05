# -*- coding: utf-8 -*-
"""打印原站 .home-spotlight-backdrop 完整 class + 内部结构。"""
import asyncio, sys, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const el = document.querySelector('.home-spotlight-backdrop');
  if (!el) return null;
  return {cls: el.className, html: el.innerHTML.slice(0, 800), nchild: el.children.length,
          childCls: Array.from(el.children).map(c => String(c.className).slice(0,100))};
}"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        pg = await ctx.new_page()
        await pg.goto("https://susu.da-ai.cc/", wait_until="domcontentloaded", timeout=45000)
        await pg.wait_for_timeout(7000)
        print(json.dumps(await pg.evaluate(JS), ensure_ascii=False, indent=1))
        await b.close()

asyncio.run(main())
