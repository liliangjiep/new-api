# -*- coding: utf-8 -*-
"""确认原站 home-decoration-workspace 的直接子元素与 page-home 的 data-* 属性。"""
import asyncio, sys, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => {
  const ws = document.querySelector('.home-decoration-workspace');
  const ph = document.querySelector('.page-home');
  return {
    ws_children: Array.from(ws.children).map(c => ({
      tag: c.tagName.toLowerCase(),
      cls: String(c.className||''),
      attrs: Array.from(c.attributes).map(a => a.name + '=' + a.value.slice(0,50)),
    })),
    ph_attrs: Array.from(ph.attributes).map(a => a.name + '=' + a.value.slice(0,60)),
    ph_parent_attrs: Array.from(ph.parentElement.attributes).map(a => a.name + '=' + a.value.slice(0,60)),
    ph_parent_children: Array.from(ph.parentElement.children).map(c => c.tagName.toLowerCase() + '.' + String(c.className||'').slice(0,40)),
  };
}"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for base, label in [("https://susu.da-ai.cc", "ORIG"), ("http://localhost:3000", "OURS")]:
            pg = await ctx.new_page()
            await pg.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(7000)
            print(f"== {label}")
            print(json.dumps(await pg.evaluate(JS), ensure_ascii=False, indent=1)[:3000])
            await pg.close()
        await b.close()

asyncio.run(main())
