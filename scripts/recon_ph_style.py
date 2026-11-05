# -*- coding: utf-8 -*-
"""打印原站 page-home 的完整 style 属性与 data-* 属性。"""
import asyncio, sys, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const ph = document.querySelector('.page-home');
  return {
    data: Object.assign({}, ph.dataset),
    style: ph.getAttribute('style'),
  };
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
