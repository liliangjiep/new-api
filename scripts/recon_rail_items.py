# -*- coding: utf-8 -*-
"""列出侧边栏全部 rail item 的父级包裹（原站 vs 本地）。"""
import asyncio, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

JS = """() => Array.from(document.querySelectorAll('.workspace-sidebar-item')).map(a => {
  const b = a.getBoundingClientRect();
  return {y: Math.round(b.y), cls: String(a.className).slice(0,44),
          parent: String(a.parentElement.className).slice(0,40),
          gp: String(a.parentElement.parentElement.className).slice(0,44),
          label: (a.getAttribute('aria-label')||a.innerText||'').trim().slice(0,14)};
})"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 900}, locale="zh-CN")
        for base, label in [("https://susu.da-ai.cc", "ORIG"), ("http://localhost:3000", "OURS")]:
            pg = await ctx.new_page()
            await pg.goto(base + "/", wait_until="domcontentloaded", timeout=45000)
            await pg.wait_for_timeout(6000)
            r = await pg.evaluate(JS)
            print(f"== {label}  n={len(r)}")
            for x in r:
                print("   ", x)
            await pg.close()
        await b.close()

asyncio.run(main())
